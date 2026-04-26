from typing import Any, Generic, Literal, TypeVar
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HypothesisInput(StrictModel):
    hypothesis: str = Field(..., min_length=8)
    domain: str | None = None
    constraints: str | None = None


class LiteratureReference(StrictModel):
    title: str
    url: str
    source: str
    relevance_reason: str
    evidence_type: str


class ReferenceRubricScore(StrictModel):
    title: str
    url: str
    intervention_match: int = Field(..., ge=0, le=2)
    system_match: int = Field(..., ge=0, le=2)
    outcome_match: int = Field(..., ge=0, le=2)
    method_protocol_match: int = Field(..., ge=0, le=2)
    threshold_control_match: int = Field(..., ge=0, le=2)
    total: int = Field(..., ge=0, le=10)
    rationale: str


class ParsedHypothesis(StrictModel):
    intervention: str | None = None
    system: str | None = None
    measurable_outcome: str | None = None
    threshold: str | None = None
    mechanism: str | None = None
    control_condition: str | None = None
    domain: str | None = None


class TavilyEvidence(StrictModel):
    title: str
    url: str
    content: str
    snippet: str
    score: float = Field(..., ge=0)
    source_type: Literal[
        "literature",
        "exact_hypothesis",
        "similar_paper",
        "protocol",
        "materials",
        "validation",
        "safety",
    ]
    mock: bool = False
    query: str | None = None


class LiteratureQC(StrictModel):
    novelty_signal: Literal["not_found", "similar_work_exists", "exact_match_found"]
    confidence: float = Field(..., ge=0, le=1)
    summary: str
    references: list[LiteratureReference]
    reference_scores: list[ReferenceRubricScore] = Field(default_factory=list)
    parsed_hypothesis: ParsedHypothesis | None = None
    search_results: list[TavilyEvidence] = Field(default_factory=list)


class ScientistFeedback(StrictModel):
    plan_id: str
    section: str
    rating: int = Field(..., ge=1, le=5)
    correction: str = Field(..., min_length=2)
    tags: list[str] = Field(default_factory=list)
    hypothesis: str = ""
    parsed_domain: str = ""
    experiment_type: str = ""


class GeneratePlanRequest(HypothesisInput):
    qc: LiteratureQC | None = None
    literature_qc: LiteratureQC | None = None
    protocol_evidence: list[TavilyEvidence] | None = None
    materials_evidence: list[TavilyEvidence] | None = None
    validation_evidence: list[TavilyEvidence] | None = None
    prior_feedback: list[ScientistFeedback] = Field(default_factory=list)


ContentT = TypeVar("ContentT")


class GroundedSection(StrictModel, Generic[ContentT]):
    content: ContentT
    confidence: float = Field(..., ge=0, le=1)
    supporting_sources: list[str]
    assumptions: list[str]


class MaterialItem(StrictModel):
    item: str
    purpose: str
    supplier_hint: str
    catalog_number: str
    estimated_cost: float = Field(..., ge=0)
    evidence_url: str


class BudgetItem(StrictModel):
    category: str
    item: str
    estimated_cost: float = Field(..., ge=0)
    notes: str


class TimelineItem(StrictModel):
    phase: str
    duration: str
    dependencies: list[str]
    deliverable: str


class ValidationItem(StrictModel):
    metric: str
    success_threshold: str
    measurement_method: str


class SourceCitation(StrictModel):
    title: str
    url: str
    source: str


class LabFieldDef(StrictModel):
    name: str
    label: str
    field_type: Literal["text", "number", "select", "boolean"]
    options: list[str] | None = None
    value: Any | None = None
    editable: bool = True


class LabNodeMeta(StrictModel):
    confidence: float = Field(..., ge=0, le=1)
    supporting_sources: list[str]
    assumptions: list[str]


class LabNodeState(StrictModel):
    status: Literal["draft", "reviewed", "flagged", "approved"] = "draft"
    version: int = 1
    last_reviewer_notes: str | None = None


class LabNodeLearnContent(StrictModel):
    what_is_this: str
    why_important: str
    connection_to_hypothesis: str
    common_alternatives: list[str]
    risks: list[str]


class LabNode(StrictModel):
    id: str
    node_type: Literal["material", "process", "assay", "validation"]
    label: str
    description: str
    fields: list[LabFieldDef] = Field(default_factory=list)
    metadata: LabNodeMeta
    state: LabNodeState = Field(default_factory=LabNodeState)
    learn_content: LabNodeLearnContent | None = None


class LabEdge(StrictModel):
    source: str
    target: str
    label: str | None = None
    condition: str | None = None


class LabView(StrictModel):
    version: int = 1
    nodes: list[LabNode]
    edges: list[LabEdge]


class ExperimentPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")

    plan_id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    hypothesis: str
    executive_summary: GroundedSection[str]
    budget: GroundedSection[list[BudgetItem]]
    timeline: GroundedSection[list[TimelineItem]]
    risks_and_assumptions: GroundedSection[list[str]]
    safety_and_ethics_notes: GroundedSection[list[str]]
    lab_workflow: LabView | None = None
    source_trace: list[SourceCitation]
    confidence_notes: GroundedSection[str]
    updated_sections: list[str] = Field(default_factory=list)



class FeedbackRecord(ScientistFeedback):
    id: str
    created_at: str


class RegenerateRequest(StrictModel):
    hypothesis: str = Field(..., min_length=8)
    current_plan: ExperimentPlan
    feedback: ScientistFeedback


ChatRole = Literal["user", "assistant", "system"]


class ChatMessage(StrictModel):
    role: ChatRole
    content: str
    created_at: str | None = None


class ChatAboutLiteratureRequest(StrictModel):
    messages: list[ChatMessage]
    hypothesis: str
    domain: str | None = None
    constraints: str | None = None
    qc: LiteratureQC | None = None


class ChatAboutLiteratureResponse(StrictModel):
    message: ChatMessage
    suggested_hypothesis: str | None = None
    should_refresh_qc: bool = False


class LabViewRegenerateRequest(StrictModel):
    hypothesis: str = Field(..., min_length=8)
    current_plan: ExperimentPlan
    edited_lab_view: LabView
    scientist_feedback: list[ScientistFeedback] = Field(default_factory=list)
    user_notes: str | None = None


ExecutionPlanStatus = Literal["draft", "in_progress", "completed", "archived"]
ExecutionTaskStatus = Literal["not_started", "in_progress", "blocked", "done", "needs_review"]
ExecutionTaskSection = Literal[
    "Preparation",
    "Design Review",
    "Materials and Logistics",
    "Execution Tracking",
    "Validation and Analysis",
    "Safety and Compliance",
    "Final Review",
]


class ExecutionTask(StrictModel):
    task_id: str
    section: ExecutionTaskSection
    title: str
    description: str
    status: ExecutionTaskStatus = "not_started"
    assignee: str | None = None
    notes: str = ""
    updated_at: str


class CreateExecutionPlanRequest(StrictModel):
    source_plan: ExperimentPlan
    creator_email: str | None = None
    executor_emails: list[str] = Field(default_factory=list)


class ExecutionPlan(StrictModel):
    plan_id: str
    title: str
    hypothesis: str
    creator_email: str | None = None
    executor_emails: list[str] = Field(default_factory=list)
    status: ExecutionPlanStatus = "draft"
    tasks: dict[ExecutionTaskSection, list[ExecutionTask]]
    source_plan_summary: str
    safety_notice: str
    created_at: str
    updated_at: str


class UpdateTaskRequest(StrictModel):
    status: ExecutionTaskStatus | None = None
    assignee: str | None = None
    notes: str | None = None


class InviteExecutorsRequest(StrictModel):
    executor_emails: list[str] = Field(..., min_length=1)


class InviteExecutorsResponse(StrictModel):
    invited_emails: list[str]
    share_url: str
    email_subject: str
    email_body: str


class ChatRegenerateRequest(StrictModel):
    hypothesis: str = Field(..., min_length=8)
    current_plan: ExperimentPlan
    messages: list[ChatMessage]
    active_section: str | None = None

