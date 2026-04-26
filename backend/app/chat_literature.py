import json
from json import JSONDecodeError
from typing import Any

from .llm_client import databricks_prompt
from .schemas import (
    ChatAboutLiteratureRequest,
    ChatAboutLiteratureResponse,
    ChatMessage,
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


def _format_conversation(messages: list[ChatMessage]) -> str:
    formatted = []
    for msg in messages:
        role = msg.role.upper()
        formatted.append(f"[{role}]:\n{msg.content}")
    return "\n\n".join(formatted)


def _llm_chat_generate(prompt: str) -> ChatAboutLiteratureResponse | None:
    try:
        raw_text = databricks_prompt(prompt, temperature=0.3, timeout=30)
        if raw_text is None:
            return None
        parsed = _extract_json(raw_text)
        return ChatAboutLiteratureResponse.model_validate(parsed)
    except Exception:
        return None


def _deterministic_fallback(request: ChatAboutLiteratureRequest) -> ChatAboutLiteratureResponse:
    content_parts = []
    
    if request.qc:
        if request.qc.novelty_signal == "not_found":
            content_parts.append("I couldn't find any closely related literature for this hypothesis.")
        elif request.qc.novelty_signal == "similar_work_exists":
            content_parts.append("I found some similar work in the literature.")
        elif request.qc.novelty_signal == "exact_match_found":
            content_parts.append("I found literature that is extremely similar or an exact match to this hypothesis.")
            
        if request.qc.references:
            refs = [f"- {ref.title}" for ref in request.qc.references[:3]]
            content_parts.append("Here are the top related references:\n" + "\n".join(refs))
            
    content_parts.append("\nHow would you like to proceed? You can ask me to help you refine the hypothesis, or if it looks good, you can proceed to generate the PI-Review Draft.")
    
    return ChatAboutLiteratureResponse(
        message=ChatMessage(role="assistant", content="\n\n".join(content_parts)),
        suggested_hypothesis=None,
        should_refresh_qc=False
    )


def chat_about_literature(request: ChatAboutLiteratureRequest) -> ChatAboutLiteratureResponse:
    qc_context = request.qc.model_dump() if request.qc else None

    prompt = f"""
You are AI SciBuddy, an expert scientific planning assistant.

Goal:
Respond to the user's latest message in the conversation, taking into account their hypothesis, domain, constraints, and the Literature QC results.

Current Hypothesis:
{request.hypothesis}

Domain: {request.domain or "Not specified"}
Constraints: {request.constraints or "Not specified"}

Literature QC Context (if available):
{json.dumps(qc_context)}

Conversation History:
{_format_conversation(request.messages)}

Rules:
1. PHASE AWARENESS: Check the Conversation History. If you see a system message containing "[Plan context: ...]", then you are in the POST-PLAN phase. If not, you are in the PRE-PLAN phase.
   - PRE-PLAN Phase: Help the researcher refine their hypothesis. Discuss novelty, literature gaps, or conceptual controls.
   - POST-PLAN Phase: You are acting as a Plan Review & Editing Assistant. Help the user modify their generated plan (e.g. changing budget, modifying lab view nodes, updating materials). Acknowledge their requested changes and confirm how the plan should be updated. IMPORTANT: You do not have the ability to instantly modify the plan yourself. You must tell the user to click the "Apply Chat to Plan" button to actually apply the revisions.
2. DO NOT generate wet-lab operational instructions.
3. DO NOT include temperatures, doses, procedural timings, recipes, or step-by-step protocols.
4. Keep your response concise, helpful, and professional.
5. If the user asks to "rewrite", "change", "refine", "modify", or "update" the hypothesis during the PRE-PLAN phase, suggest a new hypothesis string in `suggested_hypothesis`. Otherwise, set it to null.
6. Set `should_refresh_qc` to true ONLY if you suggest a new hypothesis that materially changes the scientific meaning of the current hypothesis.

You must return EXACTLY one valid JSON object matching this schema:
{{
  "message": {{
    "role": "assistant",
    "content": "Your response text here."
  }},
  "suggested_hypothesis": "string or null",
  "should_refresh_qc": boolean
}}
""".strip()

    response = _llm_chat_generate(prompt)
    if response is None:
        return _deterministic_fallback(request)
        
    return response
