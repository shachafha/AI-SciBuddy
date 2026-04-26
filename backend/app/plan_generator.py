import json
import logging
from json import JSONDecodeError
from typing import Any

from .llm_client import databricks_prompt
from .schemas import (
    ExperimentPlan,
    LiteratureQC,
    ScientistFeedback,
    SourceCitation,
    TavilyEvidence,
)
from .tavily_client import (
    TavilySearchResult,
    search_materials,
    search_protocols,
    search_validation_methods,
)
from .lab_view_generator import generate_lab_view

logger = logging.getLogger(__name__)


def _as_evidence(result: TavilySearchResult | TavilyEvidence) -> TavilyEvidence:
    if isinstance(result, TavilyEvidence):
        return result
    return TavilyEvidence(**result)


def _dedupe_evidence(items: list[TavilyEvidence]) -> list[TavilyEvidence]:
    seen: set[str] = set()
    unique: list[TavilyEvidence] = []
    for item in sorted(items, key=lambda evidence: evidence.score, reverse=True):
        key = item.url or item.title.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def _fetch_missing_evidence(
    hypothesis: str,
    protocol_evidence: list[TavilyEvidence] | None,
    materials_evidence: list[TavilyEvidence] | None,
    validation_evidence: list[TavilyEvidence] | None,
) -> tuple[list[TavilyEvidence], list[TavilyEvidence], list[TavilyEvidence]]:
    protocols = protocol_evidence or [_as_evidence(result) for result in search_protocols(hypothesis)]
    materials = materials_evidence or [_as_evidence(result) for result in search_materials(hypothesis)]
    validation = validation_evidence or [_as_evidence(result) for result in search_validation_methods(hypothesis)]
    return _dedupe_evidence(protocols)[:4], _dedupe_evidence(materials)[:4], _dedupe_evidence(validation)[:4]


def _source_trace(qc: LiteratureQC | None, evidence: list[TavilyEvidence]) -> list[SourceCitation]:
    citations = [
        SourceCitation(title=ref.title, url=ref.url, source=ref.source)
        for ref in (qc.references if qc else [])
    ]
    citations.extend(SourceCitation(title=item.title, url=item.url, source=item.source_type) for item in evidence)

    seen: set[str] = set()
    trace: list[SourceCitation] = []
    for citation in citations:
        key = citation.url or citation.title.lower()
        if key in seen:
            continue
        seen.add(key)
        trace.append(citation)
    return trace[:10]


def _section(content: Any, sources: list[str], confidence: float = 0.72, assumptions: list[str] | None = None) -> dict[str, Any]:
    return {
        "content": content,
        "confidence": confidence,
        "supporting_sources": sources,
        "assumptions": assumptions or ["Source-grounded planning claim; requires PI review before execution."],
    }


def _mock_plan(
    hypothesis: str,
    qc: LiteratureQC | None,
    evidence: list[TavilyEvidence],
    constraints: str | None,
    prior_feedback: list[ScientistFeedback],
) -> ExperimentPlan:
    trace = _source_trace(qc, evidence)
    evidence_url = trace[0].url if trace else "https://example.org/demo-evidence"
    material_url = next((item.url for item in evidence if item.source_type == "materials"), evidence_url)
    validation_url = next((item.url for item in evidence if item.source_type == "validation"), evidence_url)
    protocol_url = next((item.url for item in evidence if item.source_type == "protocol"), evidence_url)

    feedback_note = ""
    if prior_feedback:
        feedback_note = f" Prior feedback incorporated from {len(prior_feedback)} reviewer note(s)."

    return ExperimentPlan(
        title="PI-review planning draft for hypothesis validation",
        hypothesis=hypothesis,
        executive_summary=_section(
            "This draft converts the hypothesis into a source-grounded review plan with budget estimates, a timeline, and explicit safety review gates.",
            [evidence_url],
            0.74,
        ),
        budget=_section([
            {"category": "Evidence review", "item": "PI and literature review", "estimated_cost": 300.0, "notes": f"Traceable to {evidence_url}."},
            {"category": "Materials", "item": "Core experimental model or sample source", "estimated_cost": 400.0, "notes": f"Grounded by supplier/material evidence: {material_url}."},
            {"category": "Reagents & Assays", "item": "Validated assay or measurement service", "estimated_cost": 900.0, "notes": f"Grounded by validation evidence: {validation_url}."},
            {"category": "Data & QC", "item": "Data capture and QC workspace", "estimated_cost": 150.0, "notes": f"Traceable to {evidence_url}."},
        ], [evidence_url, material_url, validation_url], 0.62, ["Budget estimates are planning placeholders, not supplier quotes."]),
        timeline=_section([
            {"phase": "PI design review", "duration": "1 week", "dependencies": ["Literature QC"], "deliverable": "Approved high-level study design"},
            {"phase": "Sourcing and safety review", "duration": "1-2 weeks", "dependencies": ["Materials evidence", "Institutional approval if required"], "deliverable": "Sourcing and safety decision log"},
            {"phase": "Qualified execution and analysis", "duration": "2-5 weeks", "dependencies": ["Approved protocol", "Validated measurement plan"], "deliverable": "QC-reviewed results summary"},
        ], [protocol_url, material_url], 0.64),
        risks_and_assumptions=_section([
            "This draft assumes Tavily evidence is representative enough for planning but not final protocol approval.",
            "Novelty claims remain provisional until the PI reviews exact overlap in intervention, system, outcome, and method.",
            "Budget estimates are hackathon-grade planning ranges and require supplier quotes before use.",
            f"User constraints considered: {constraints or 'none provided'}.{feedback_note}",
        ], [evidence_url], 0.7),
        safety_and_ethics_notes=_section([
            "PI review is required before translating this draft into any operational wet-lab procedure.",
            "Do not use this output as step-by-step biological, chemical, clinical, animal, or environmental release instructions.",
            "For regulated, hazardous, pathogenic, human-subject, animal-subject, gene-editing, or chemical-risk work, obtain institutional approval before execution.",
        ], [protocol_url], 0.78),
        source_trace=trace,
        confidence_notes=_section(
            "Generated with deterministic fallback. Every major planning section includes source URLs, confidence, and assumptions for review.",
            [evidence_url],
            0.7,
        ),
    )


def _extract_json(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        return json.loads(text[start : end + 1])


def _plan_schema_prompt() -> str:
    return """
Return one valid JSON object with exactly this shape:
{
  "title": "string",
  "hypothesis": "string",
  "executive_summary": {
    "content": "string",
    "confidence": 0,
    "supporting_sources": ["URL from provided Tavily evidence"],
    "assumptions": ["string"]
  },
  "budget": {
    "content": [
    {
      "category": "string (e.g. Materials, Reagents, Equipment, Services)",
      "item": "string (include specific material/reagent items here too)",
      "estimated_cost": 0,
      "notes": "include source URL or source title"
    }
    ],
    "confidence": 0,
    "supporting_sources": ["URL from provided Tavily evidence"],
    "assumptions": ["string"]
  },
  "timeline": {
    "content": [
    {
      "phase": "string",
      "duration": "string",
      "dependencies": ["string"],
      "deliverable": "string"
    }
    ],
    "confidence": 0,
    "supporting_sources": ["URL from provided Tavily evidence"],
    "assumptions": ["string"]
  },
  "risks_and_assumptions": {
    "content": ["string"],
    "confidence": 0,
    "supporting_sources": ["URL from provided Tavily evidence"],
    "assumptions": ["string"]
  },
  "safety_and_ethics_notes": {
    "content": ["string"],
    "confidence": 0,
    "supporting_sources": ["URL from provided Tavily evidence"],
    "assumptions": ["string"]
  },
  "source_trace": [
    {
      "title": "string",
      "url": "string",
      "source": "string"
    }
  ],
  "confidence_notes": {
    "content": "string",
    "confidence": 0,
    "supporting_sources": ["URL from provided Tavily evidence"],
    "assumptions": ["string"]
  },
  "updated_sections": ["string"]
}
Do not include markdown. Do not include temperatures, doses, timings, recipes, exact procedural parameters, or instructions that would let an untrained person run a biological or chemical experiment.

CRITICAL JSON RULES:
- Your output must be STRICTLY VALID JSON.
- Do NOT include trailing commas.
- Do NOT output markdown code blocks. Return the raw JSON object starting with `{` and ending with `}`.
- CRITICAL STRUCTURE RULE: Do NOT flatten the JSON. Every section (executive_summary, budget, timeline, risks_and_assumptions, safety_and_ethics_notes) MUST be a nested object with "content", "confidence", "supporting_sources", and "assumptions" keys exactly as shown in the shape above.
""".strip()


def _evidence_context(evidence: list[TavilyEvidence]) -> list[dict[str, Any]]:
    return [
        {
            "title": item.title,
            "url": item.url,
            "snippet": item.snippet,
            "score": item.score,
            "source_type": item.source_type,
            "mock": item.mock,
        }
        for item in evidence[:12]
    ]


def _llm_generate(prompt: str) -> ExperimentPlan | None:
    try:
        raw_text = databricks_prompt(prompt, temperature=0.2, timeout=75)
        if raw_text is None:
            logger.info("Plan generation LLM unavailable; using deterministic fallback plan.")
            return None
        return ExperimentPlan.model_validate(_extract_json(raw_text))
    except Exception as exc:
        logger.warning("Plan generation LLM output could not be validated; using deterministic fallback plan: %s", exc)
        return None


def _ground_plan(plan: ExperimentPlan, qc: LiteratureQC | None, evidence: list[TavilyEvidence]) -> ExperimentPlan:
    trace = _source_trace(qc, evidence)
    if not trace:
        trace = plan.source_trace

    fixed = plan.model_copy(deep=True)
    if not fixed.source_trace:
        fixed.source_trace = trace

    safety_text = " ".join(fixed.safety_and_ethics_notes.content).lower()
    if "institutional" not in safety_text or "approval" not in safety_text:
        fixed.safety_and_ethics_notes.content.append(
            "Institutional safety, ethics, biosafety, and procurement approval may be required before any execution."
        )
    if "source" not in fixed.confidence_notes.content.lower() and "trace" not in fixed.confidence_notes.content.lower():
        fixed.confidence_notes.content = f"{fixed.confidence_notes.content} Major claims should be reviewed against the source_trace URLs."

    return fixed


def generate_plan(
    hypothesis: str,
    qc: LiteratureQC | None = None,
    domain: str | None = None,
    constraints: str | None = None,
    protocol_evidence: list[TavilyEvidence] | None = None,
    materials_evidence: list[TavilyEvidence] | None = None,
    validation_evidence: list[TavilyEvidence] | None = None,
    prior_feedback: list[ScientistFeedback] | None = None,
) -> ExperimentPlan:
    protocols, materials, validation = _fetch_missing_evidence(
        " ".join(part for part in [domain, hypothesis, constraints] if part),
        protocol_evidence,
        materials_evidence,
        validation_evidence,
    )
    evidence = _dedupe_evidence(protocols + materials + validation)
    
    feedback = prior_feedback or []
    if not feedback:
        from .feedback_store import get_relevant_feedback
        feedback = get_relevant_feedback(hypothesis, domain or "", "")
        
    qc_context = qc.model_dump() if qc else None

    prompt = f"""
You are AI SciBuddy, creating a PI-review-ready planning draft.

Goal:
Create a structured, source-grounded ExperimentPlan JSON for the hypothesis. This is not a final wet-lab instruction.

Hypothesis:
{hypothesis}

Domain:
{domain or "Not specified"}

Constraints:
{constraints or "Not specified"}

Literature QC:
{json.dumps(qc_context)}

Tavily evidence from protocol, materials, and validation searches:
{json.dumps(_evidence_context(evidence))}

Expert lessons learned (from relevant past feedback):
{json.dumps([{"correction": item.correction, "section": item.section, "rating": item.rating} for item in feedback])}

Requirements:
- Include executive summary, budget (include all key materials/reagents as line items), timeline, risks, safety/ethics notes, and source trace.
- Make every major claim traceable to one of the provided Tavily sources. Use source URLs in budget notes, confidence_notes, and source_trace.
- Every plan section must include content, confidence, supporting_sources, and assumptions.
- Include all key experimental materials and reagents directly as budget line items with estimated costs.
- Do not provide dangerous procedural details that would let an untrained person run risky biological or chemical experiments.
- For risky domains, add safety review notes and recommend institutional approval.

{_plan_schema_prompt()}
""".strip()

    plan = _llm_generate(prompt)
    if plan is None:
        plan = _mock_plan(hypothesis, qc, evidence, constraints, feedback)
    else:
        plan = _ground_plan(plan, qc, evidence)
        
    plan.lab_workflow = generate_lab_view(plan)
    return plan


def regenerate_plan_with_feedback(hypothesis: str, current_plan: ExperimentPlan, feedback: ScientistFeedback) -> ExperimentPlan:
    prompt = f"""
Revise this PI-review planning draft using scientist feedback while preserving source grounding and safety limits.

Hypothesis:
{hypothesis}

Current plan:
{current_plan.model_dump_json()}

Scientist feedback:
{feedback.model_dump_json()}

Do not add operational wet-lab detail. Keep all major claims tied to existing source_trace URLs.
Add a note saying "Updated based on expert feedback" to confidence_notes.
Include the feedback item as a new entry in source_trace with title="Expert Feedback", url="#feedback", and source="Scientist Review".
List the section name that was modified in updated_sections.

{_plan_schema_prompt()}
""".strip()

    plan = _llm_generate(prompt)
    if plan is not None:
        plan = _ground_plan(plan, None, [])
        plan.lab_workflow = generate_lab_view(plan)
        return plan

    revised = current_plan.model_copy(deep=True)
    revised.confidence_notes.content = f"{revised.confidence_notes.content} Updated based on expert feedback in demo mode from {feedback.section}: {feedback.correction}"
    revised.risks_and_assumptions.content.append(f"Reviewer correction to resolve: {feedback.correction}")
    if feedback.section not in revised.updated_sections:
        revised.updated_sections.append(feedback.section)
    
    revised.source_trace.append(SourceCitation(
        title="Expert Feedback",
        url="#feedback",
        source="Scientist Review"
    ))
    return revised


def regenerate_plan_from_lab_view(request: "LabViewRegenerateRequest") -> ExperimentPlan:
    """Regenerate an ExperimentPlan driven by the scientist-edited LabView graph.

    Provenance is derived server-side from node.state.version (not trusted from
    the frontend) to ensure the safety rules cannot be bypassed by crafted payloads.

    Falls back to a structured mock if Databricks is unavailable.
    """
    from .lab_regen_prompt import build_lab_regen_prompt, diff_summary
    from .schemas import LabViewRegenerateRequest  # local import avoids circular

    prompt = build_lab_regen_prompt(request, _plan_schema_prompt())
    plan = _llm_generate(prompt)

    if plan is not None:
        plan = _ground_plan(plan, None, [s for s in request.current_plan.source_trace])
        plan.lab_workflow = request.edited_lab_view  # preserve exact edited graph
        plan.lab_workflow = request.edited_lab_view.__class__(
            version=(request.edited_lab_view.version + 1),
            nodes=request.edited_lab_view.nodes,
            edges=request.edited_lab_view.edges,
        )
        return plan

    # --- Structured fallback (no LLM) ---
    summary = diff_summary(request)
    revised = request.current_plan.model_copy(deep=True)

    # Annotate confidence_notes with diff summary
    revised.confidence_notes.content = (
        f"{revised.confidence_notes.content} "
        f"Graph-driven revision applied ({summary}); LLM unavailable — demo fallback."
    )

    # Surface each user-edited node as a risk/note for PI review
    edited_nodes = [n for n in request.edited_lab_view.nodes if n.state.version > 1]
    added_nodes  = [
        n for n in request.edited_lab_view.nodes
        if n.id not in {x.id for x in (request.current_plan.lab_workflow.nodes if request.current_plan.lab_workflow else [])}
    ]
    for n in edited_nodes:
        revised.risks_and_assumptions.content.append(
            f"Graph edit (user-modified): [{n.label}] — {n.description}"
        )
    for n in added_nodes:
        revised.risks_and_assumptions.content.append(
            f"Graph edit (user-added node): [{n.label}] — {n.description}"
        )

    # Scientist feedback
    for fb in request.scientist_feedback:
        revised.risks_and_assumptions.content.append(
            f"Scientist correction [{fb.section}]: {fb.correction}"
        )
        if fb.section not in revised.updated_sections:
            revised.updated_sections.append(fb.section)

    if request.user_notes:
        revised.risks_and_assumptions.content.append(
            f"User notes for regen: {request.user_notes}"
        )

    # Safety gate always present
    revised.safety_and_ethics_notes.content.append(
        "Graph-driven revision — PI review required before execution."
    )

    revised.source_trace.append(SourceCitation(
        title="Lab View Graph Revision",
        url="#lab-view-edit",
        source="User Graph Edit"
    ))

    # Bump lab_workflow version, preserve edited graph
    revised.lab_workflow = request.edited_lab_view.__class__(
        version=(request.edited_lab_view.version + 1),
        nodes=request.edited_lab_view.nodes,
        edges=request.edited_lab_view.edges,
    )

    revised.updated_sections = list(set(revised.updated_sections + ["risks_and_assumptions", "confidence_notes"]))
    return revised


def regenerate_plan_from_chat(payload: "ChatRegenerateRequest") -> ExperimentPlan:
    from .schemas import ChatRegenerateRequest

    chat_history_str = "\n".join([f"{msg.role.upper()}: {msg.content}" for msg in payload.messages])

    prompt = f"""
CRITICAL INSTRUCTION: You MUST revise this PI-review planning draft to incorporate the changes discussed in the Conversation History between the user and the agent.
You are NOT generating a new plan from scratch. You are editing the Current plan based on the user's requested revisions in the chat.
If the user requested a change to the budget, you MUST update the budget section with specific line items. If they asked to adjust the timeline, update the timeline. If they asked about risks or safety, update those sections.

Preserve source grounding and safety limits.

Hypothesis:
{payload.hypothesis}

Current plan:
{payload.current_plan.model_dump_json()}

Conversation History:
{chat_history_str}

Active Section Context:
{payload.active_section or "None provided - apply globally if applicable"}

Do not add operational wet-lab detail. Keep all major claims tied to existing source_trace URLs.
Add a note saying "Updated based on chat conversation" to confidence_notes.
Include a new entry in source_trace with title="Chat Revision", url="#chat", and source="User Conversation".
List the section name(s) that were modified in updated_sections.

{_plan_schema_prompt()}
""".strip()

    plan = _llm_generate(prompt)
    if plan is not None:
        plan = _ground_plan(plan, None, [])
        plan.lab_workflow = generate_lab_view(plan)
        
        # Log to Review Log — best-effort, don't crash if filesystem is read-only (e.g. Vercel)
        try:
            from .feedback_store import add_feedback
            from .schemas import ScientistFeedback

            user_msgs = [msg for msg in payload.messages if msg.role == "user"]
            last_request = user_msgs[-1].content if user_msgs else "Chat revision"

            add_feedback(ScientistFeedback(
                plan_id=plan.plan_id,
                section=", ".join(plan.updated_sections) if plan.updated_sections else "General",
                rating=5,
                correction=f"Agent Chat Revision Applied:\n{last_request}",
                tags=["chat-revision", "agentic"],
                hypothesis=payload.hypothesis
            ))
        except Exception as feedback_err:
            logger.warning("Could not persist chat revision feedback (read-only fs?): %s", feedback_err)

        return plan

    # Fallback if LLM fails
    revised = payload.current_plan.model_copy(deep=True)
    revised.confidence_notes.content = f"{revised.confidence_notes.content} Updated based on chat conversation in demo mode."
    revised.risks_and_assumptions.content.append("Chat-based revision applied in demo mode.")
    
    revised.source_trace.append(SourceCitation(
        title="Chat Revision",
        url="#chat",
        source="User Conversation"
    ))
    return revised
