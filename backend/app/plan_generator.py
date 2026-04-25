import json
import os
from json import JSONDecodeError
from typing import Any

import httpx

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
        executive_summary=(
            "This draft converts the hypothesis into a source-grounded review plan with high-level protocol design, "
            "material categories, validation metrics, and explicit safety review gates."
        ),
        protocol_summary=[
            f"Review protocol evidence before selecting the final study design: {protocol_url}",
            "Define experimental and comparator groups at a conceptual level, then have qualified personnel translate them into an approved protocol.",
            "Use validated endpoint categories and prespecified decision criteria rather than improvised operational steps.",
            "Document deviations, QC flags, and analysis assumptions for PI review before interpreting results.",
        ],
        materials=[
            {
                "item": "Domain-appropriate experimental model or sample source",
                "purpose": "Support matched comparison groups aligned to the hypothesis.",
                "supplier_hint": "Use institution-approved sourcing or vetted suppliers identified in Tavily material evidence.",
                "estimated_cost": 400.0,
                "evidence_url": material_url,
            },
            {
                "item": "Validated assay or measurement service",
                "purpose": "Measure the primary outcome and an orthogonal confirmation readout.",
                "supplier_hint": "Prefer assays with published validation or supplier documentation.",
                "estimated_cost": 900.0,
                "evidence_url": validation_url,
            },
            {
                "item": "Data capture and QC workspace",
                "purpose": "Track source references, raw observations, QC outcomes, and review decisions.",
                "supplier_hint": "Use an approved ELN, repository, or internal analysis environment.",
                "estimated_cost": 150.0,
                "evidence_url": evidence_url,
            },
        ],
        budget=[
            {"category": "Evidence review", "item": "PI and literature/protocol review", "estimated_cost": 300.0, "notes": f"Traceable to {evidence_url}."},
            {"category": "Materials", "item": "Samples, reagents, or services", "estimated_cost": 1300.0, "notes": f"Grounded by supplier/material evidence: {material_url}."},
            {"category": "Validation", "item": "Primary and orthogonal readouts", "estimated_cost": 900.0, "notes": f"Grounded by validation evidence: {validation_url}."},
        ],
        timeline=[
            {"phase": "PI design review", "duration": "1 week", "dependencies": ["Literature QC", "Protocol evidence review"], "deliverable": "Approved high-level study design"},
            {"phase": "Sourcing and safety review", "duration": "1-2 weeks", "dependencies": ["Materials evidence", "Institutional approval if required"], "deliverable": "Sourcing and safety decision log"},
            {"phase": "Qualified execution and analysis", "duration": "2-5 weeks", "dependencies": ["Approved protocol", "Validated measurement plan"], "deliverable": "QC-reviewed results summary"},
        ],
        validation=[
            {"metric": "Primary outcome direction", "success_threshold": "Effect is consistent with the hypothesis and materially larger than control variation.", "measurement_method": f"Validated endpoint category supported by {validation_url}."},
            {"metric": "Control behavior", "success_threshold": "Comparator and quality controls perform within predefined expectations.", "measurement_method": "Control QC review by qualified personnel."},
            {"metric": "Traceability", "success_threshold": "Each design choice maps to a source trace or reviewer correction.", "measurement_method": "Source trace and feedback audit."},
        ],
        risks_and_assumptions=[
            "This draft assumes Tavily evidence is representative enough for planning but not final protocol approval.",
            "Novelty claims remain provisional until the PI reviews exact overlap in intervention, system, outcome, and method.",
            "Budget estimates are hackathon-grade planning ranges and require supplier quotes before use.",
            f"User constraints considered: {constraints or 'none provided'}.{feedback_note}",
        ],
        safety_and_ethics_notes=[
            "PI review is required before translating this draft into any operational wet-lab procedure.",
            "Do not use this output as step-by-step biological, chemical, clinical, animal, or environmental release instructions.",
            "For regulated, hazardous, pathogenic, human-subject, animal-subject, gene-editing, or chemical-risk work, obtain institutional approval before execution.",
        ],
        source_trace=trace,
        confidence_notes="Generated with deterministic fallback. Every major planning section includes an evidence URL or source trace for review.",
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
  "executive_summary": "string",
  "protocol_summary": ["high-level planning step only, no operational wet-lab detail"],
  "materials": [
    {
      "item": "string",
      "purpose": "string",
      "supplier_hint": "string",
      "estimated_cost": 0,
      "evidence_url": "must be one of the provided Tavily source URLs"
    }
  ],
  "budget": [
    {
      "category": "string",
      "item": "string",
      "estimated_cost": 0,
      "notes": "include source URL or source title"
    }
  ],
  "timeline": [
    {
      "phase": "string",
      "duration": "string",
      "dependencies": ["string"],
      "deliverable": "string"
    }
  ],
  "validation": [
    {
      "metric": "string",
      "success_threshold": "string",
      "measurement_method": "high-level method category with source URL or source title"
    }
  ],
  "risks_and_assumptions": ["string"],
  "safety_and_ethics_notes": ["string"],
  "source_trace": [
    {
      "title": "string",
      "url": "string",
      "source": "string"
    }
  ],
  "confidence_notes": "string"
}
Do not include markdown. Do not include temperatures, doses, timings, recipes, exact procedural parameters, or instructions that would let an untrained person run a biological or chemical experiment.
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


def _ollama_generate(prompt: str) -> ExperimentPlan | None:
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    model = os.getenv("OLLAMA_MODEL", "gemma3")

    try:
        response = httpx.post(
            f"{base_url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.2},
            },
            timeout=75,
        )
        response.raise_for_status()
        raw_text = response.json().get("response", "")
        return ExperimentPlan.model_validate(_extract_json(raw_text))
    except Exception:
        return None


def _ground_plan(plan: ExperimentPlan, qc: LiteratureQC | None, evidence: list[TavilyEvidence]) -> ExperimentPlan:
    trace = _source_trace(qc, evidence)
    if not trace:
        trace = plan.source_trace
    source_urls = {source.url for source in trace}
    fallback_url = trace[0].url if trace else "https://example.org/demo-evidence"

    fixed = plan.model_copy(deep=True)
    if not fixed.source_trace:
        fixed.source_trace = trace

    for material in fixed.materials:
        if not material.evidence_url or material.evidence_url not in source_urls:
            material.evidence_url = fallback_url

    safety_text = " ".join(fixed.safety_and_ethics_notes).lower()
    if "institutional" not in safety_text or "approval" not in safety_text:
        fixed.safety_and_ethics_notes.append(
            "Institutional safety, ethics, biosafety, and procurement approval may be required before any execution."
        )
    if "source" not in fixed.confidence_notes.lower() and "trace" not in fixed.confidence_notes.lower():
        fixed.confidence_notes = f"{fixed.confidence_notes} Major claims should be reviewed against the source_trace URLs."

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

Prior scientist feedback:
{json.dumps([item.model_dump() for item in feedback])}

Requirements:
- Include executive summary, protocol summary, materials and supply chain hints, budget, timeline, validation, risks, safety/ethics notes, and source trace.
- Make every major claim traceable to one of the provided Tavily sources. Use source URLs in material evidence_url, budget notes, validation methods, confidence_notes, and source_trace.
- Keep protocol_summary high-level and non-operational.
- Do not provide dangerous procedural details that would let an untrained person run risky biological or chemical experiments.
- For risky domains, add safety review notes and recommend institutional approval.

{_plan_schema_prompt()}
""".strip()

    plan = _ollama_generate(prompt)
    if plan is None:
        return _mock_plan(hypothesis, qc, evidence, constraints, feedback)

    return _ground_plan(plan, qc, evidence)


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

{_plan_schema_prompt()}
""".strip()

    plan = _ollama_generate(prompt)
    if plan is not None:
        return _ground_plan(plan, None, [])

    revised = current_plan.model_copy(deep=True)
    revised.confidence_notes = f"{revised.confidence_notes} Revised in demo mode from feedback on {feedback.section}: {feedback.correction}"
    revised.risks_and_assumptions.append(f"Reviewer correction to resolve: {feedback.correction}")
    return revised
