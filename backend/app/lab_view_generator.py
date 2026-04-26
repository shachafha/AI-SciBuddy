import json
from json import JSONDecodeError
from typing import Any

from .llm_client import databricks_prompt
from .schemas import ExperimentPlan, LabEdge, LabNode, LabNodeMeta, LabNodeState, LabView


def _mock_lab_view(plan: ExperimentPlan) -> LabView:
    nodes = []
    edges = []
    fallback_sources = plan.source_trace[:1]
    fallback_urls = [s.url for s in fallback_sources] if fallback_sources else []
    learn_placeholder = {
        "what_is_this": "A fundamental step in setting up the experiment.",
        "why_important": "Ensures baseline metrics are established.",
        "connection_to_hypothesis": "Provides the control data needed to validate the intervention.",
        "common_alternatives": ["In-silico modeling", "Alternative assay"],
        "risks": ["Contamination", "Protocol deviation"]
    }
    
    n1 = LabNode(
        id="step-1",
        node_type="process",
        label="Review & Design",
        description="Review adjacent literature and protocol sources.",
        metadata=LabNodeMeta(confidence=0.8, supporting_sources=fallback_urls, assumptions=["Proceeding based on initial evidence."]),
        state=LabNodeState(status="draft"),
        fields=[],
        learn_content=learn_placeholder
    )
    n2 = LabNode(
        id="step-2",
        node_type="material",
        label="Sourcing",
        description="Procure materials and set up comparators.",
        metadata=LabNodeMeta(confidence=0.7, supporting_sources=fallback_urls, assumptions=["Materials available and cost-effective."]),
        state=LabNodeState(status="draft"),
        fields=[],
        learn_content=learn_placeholder
    )
    n3 = LabNode(
        id="step-3",
        node_type="validation",
        label="Execution",
        description="Run validation assays.",
        metadata=LabNodeMeta(confidence=0.75, supporting_sources=fallback_urls, assumptions=["Controls perform as expected."]),
        state=LabNodeState(status="draft"),
        fields=[],
        learn_content=learn_placeholder
    )
    
    nodes.extend([n1, n2, n3])
    edges.append(LabEdge(source="step-1", target="step-2", label="approved outline"))
    edges.append(LabEdge(source="step-2", target="step-3", label="materials ready"))
    
    return LabView(version=1, nodes=nodes, edges=edges)


def _extract_json(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        return json.loads(text[start : end + 1])


def generate_lab_view(plan: ExperimentPlan) -> LabView:
    prompt = f"""
You are AI SciBuddy, generating a visual Directed Acyclic Graph (DAG) for an experiment plan.

Goal:
Convert the provided ExperimentPlan into a LabView graph structure with nodes and edges.
This is a high-level conceptual graph, not an operational wet-lab protocol. Do not output dangerous procedural details.

ExperimentPlan context:
{plan.model_dump_json(include={"hypothesis", "executive_summary", "budget", "timeline"})}

Output exactly one valid JSON object matching this schema:
{{
  "version": 1,
  "nodes": [
    {{
      "id": "string (unique)",
      "node_type": "string (one of: material, process, assay, validation)",
      "label": "string (short name)",
      "description": "string (no wet-lab details)",
      "fields": [],
      "metadata": {{
        "confidence": 0.8,
        "supporting_sources": ["URL from the plan"],
        "assumptions": ["string"]
      }},
      "state": {{
        "status": "draft",
        "version": 1,
        "last_reviewer_notes": null
      }},
      "learn_content": {{
        "what_is_this": "string (High-level explanation)",
        "why_important": "string",
        "connection_to_hypothesis": "string",
        "common_alternatives": ["string"],
        "risks": ["string"]
      }}
    }}
  ],
  "edges": [
    {{
      "source": "string (node id)",
      "target": "string (node id)",
      "label": "string or null",
      "condition": "string or null"
    }}
  ]
}}

Keep fields empty `[]` for now to reduce complexity.
Ensure all node `id`s used in `edges` exist in `nodes`.
Do not include markdown or formatting, just raw JSON.
""".strip()

    try:
        raw_text = databricks_prompt(prompt, temperature=0.1, timeout=45)
        if raw_text is None:
            raise RuntimeError("Databricks LLM is not configured or unavailable.")
        return LabView.model_validate(_extract_json(raw_text))
    except Exception as e:
        print(f"Failed to generate lab view: {e}")
        return _mock_lab_view(plan)
