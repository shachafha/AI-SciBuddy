"""lab_regen_prompt.py

Builds the LLM prompt for regenerating an ExperimentPlan from an edited LabView.

Key design:
- Provenance is derived from node.state.version (version>1 = user-edited).
- The diff is computed server-side (not trusted from frontend) against the
  original plan's lab_workflow.
- Safety framing is hardcoded: node descriptions are passed as high-level
  intent only; the LLM is explicitly blocked from converting them into
  operational wet-lab instructions.
"""

from __future__ import annotations

from .schemas import LabView, LabNode, LabViewRegenerateRequest


# ---------------------------------------------------------------------------
# Diff helpers
# ---------------------------------------------------------------------------

def _node_ids(view: LabView) -> set[str]:
    return {n.id for n in view.nodes}


def _classify_nodes(edited: LabView, original: LabView | None) -> dict[str, list[str]]:
    """Return added / removed / modified / ai_generated / user_edited buckets."""
    orig_ids = _node_ids(original) if original else set()
    edited_ids = _node_ids(edited)

    added = [n.id for n in edited.nodes if n.id not in orig_ids]
    removed = list(orig_ids - edited_ids)
    modified = [
        n.id for n in edited.nodes
        if n.id in orig_ids and n.state.version > 1
    ]
    ai_generated = [
        n.id for n in edited.nodes
        if n.id not in added and n.state.version == 1
    ]
    user_edited = [
        n.id for n in edited.nodes
        if n.state.version > 1
    ]

    return {
        "added": added,
        "removed": removed,
        "modified": modified,
        "ai_generated": ai_generated,
        "user_edited": user_edited,
    }


# ---------------------------------------------------------------------------
# Graph serializer
# ---------------------------------------------------------------------------

def _serialize_node(node: LabNode, diff: dict[str, list[str]]) -> str:
    """Render a node as a concise structured text block for the prompt."""
    provenance = "USER-EDITED" if node.id in diff["user_edited"] else "AI-GENERATED"
    if node.id in diff["added"]:
        provenance = "USER-ADDED (new)"
    conf_pct = int(node.metadata.confidence * 100)
    assumptions = "; ".join(node.metadata.assumptions[:3]) or "none"
    sources = ", ".join(node.metadata.supporting_sources[:2]) or "none"

    lines = [
        f"[{node.id}] ({node.node_type.upper()}) {node.label}  |  provenance={provenance}  |  confidence={conf_pct}%",
        f"  Description: {node.description}",
        f"  Assumptions: {assumptions}",
        f"  Sources: {sources}",
    ]
    if node.state.last_reviewer_notes:
        lines.append(f"  Reviewer notes: {node.state.last_reviewer_notes}")
    return "\n".join(lines)


def _serialize_edges(view: LabView) -> str:
    if not view.edges:
        return "  (no edges)"
    return "\n".join(
        f"  {e.source} → {e.target}" + (f"  [{e.label}]" if e.label else "")
        for e in view.edges
    )


def _serialize_graph(view: LabView, diff: dict[str, list[str]]) -> str:
    node_blocks = "\n\n".join(_serialize_node(n, diff) for n in view.nodes)
    edge_block = _serialize_edges(view)
    return f"NODES:\n\n{node_blocks}\n\nEDGES:\n{edge_block}"


# ---------------------------------------------------------------------------
# Main prompt builder
# ---------------------------------------------------------------------------

def build_lab_regen_prompt(request: LabViewRegenerateRequest, plan_schema_prompt: str) -> str:
    """Assemble the full LLM prompt string for lab-view-driven plan regeneration."""
    original_lv = request.current_plan.lab_workflow
    diff = _classify_nodes(request.edited_lab_view, original_lv)

    graph_text = _serialize_graph(request.edited_lab_view, diff)

    # Provenance summary
    prov_lines = [
        f"  Added nodes (user intent, must incorporate): {diff['added'] or 'none'}",
        f"  Removed nodes (user removed, reflect in plan): {diff['removed'] or 'none'}",
        f"  User-edited nodes (user intent overrides AI): {diff['user_edited'] or 'none'}",
        f"  AI-generated nodes (preserve unless contradicted by edits): {diff['ai_generated'] or 'none'}",
    ]
    provenance_block = "\n".join(prov_lines)

    # Scientist feedback block
    feedback_block = "None provided."
    if request.scientist_feedback:
        items = [
            f"  - [{fb.section}] Rating {fb.rating}/5: {fb.correction}"
            + (f" (tags: {', '.join(fb.tags)})" if fb.tags else "")
            for fb in request.scientist_feedback
        ]
        feedback_block = "\n".join(items)

    # Source URLs from original plan for grounding
    source_urls = [s.url for s in request.current_plan.source_trace[:8]]
    sources_block = "\n".join(f"  - {u}" for u in source_urls) or "  (none — use placeholder)"

    user_notes_block = request.user_notes or "None."

    return f"""You are AI SciBuddy. Your task is to revise an experiment planning draft so that it reflects the scientist's edited lab workflow graph.

HYPOTHESIS:
{request.hypothesis}

EDITED LAB WORKFLOW (canonical source of truth for this revision):
{graph_text}

PROVENANCE:
{provenance_block}

SCIENTIST FEEDBACK (expert corrections to incorporate):
{feedback_block}

USER NOTES:
{user_notes_block}

ORIGINAL SOURCE URLS (use these for grounding; do not invent new URLs):
{sources_block}

RULES — READ CAREFULLY:
1. The edited lab workflow defines the conceptual structure of the revised plan.
   Reflect added, removed, and modified nodes in the relevant plan sections
   (protocol_summary, materials, timeline, validation, risks_and_assumptions).
2. User-edited nodes represent scientific intent. Honor them as high-level design decisions.
3. AI-generated nodes may be preserved unchanged unless the graph edits contradict them.
4. All content must remain HIGH-LEVEL and CONCEPTUAL.
   Do NOT translate node descriptions into operational wet-lab procedures,
   exact temperatures, doses, timings, hazardous recipes, or step-by-step
   biological/chemical instructions an untrained person could execute.
5. Preserve source_trace URLs from the original plan. Do not invent catalog numbers.
6. Set updated_sections to list every plan section you change.
7. Add a confidence_notes entry: "Revised based on {len(diff['user_edited'])} user-edited, {len(diff['added'])} added, {len(diff['removed'])} removed graph node(s)."
8. Keep safety_and_ethics_notes intact and add: "Graph-driven revision — PI review required before execution."

{plan_schema_prompt}""".strip()


# ---------------------------------------------------------------------------
# Diff summary (for frontend display / confidence_notes fallback)
# ---------------------------------------------------------------------------

def diff_summary(request: LabViewRegenerateRequest) -> str:
    original_lv = request.current_plan.lab_workflow
    diff = _classify_nodes(request.edited_lab_view, original_lv)
    parts = []
    if diff["added"]:
        parts.append(f"{len(diff['added'])} node(s) added")
    if diff["removed"]:
        parts.append(f"{len(diff['removed'])} node(s) removed")
    if diff["modified"]:
        parts.append(f"{len(diff['modified'])} node(s) modified")
    return ", ".join(parts) if parts else "no structural changes"
