from typing import Generic, Literal, TypeVar

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


class ExperimentPlan(StrictModel):
    title: str
    hypothesis: str
    executive_summary: GroundedSection[str]
    protocol_summary: GroundedSection[list[str]]
    materials: GroundedSection[list[MaterialItem]]
    budget: GroundedSection[list[BudgetItem]]
    timeline: GroundedSection[list[TimelineItem]]
    validation: GroundedSection[list[ValidationItem]]
    risks_and_assumptions: GroundedSection[list[str]]
    safety_and_ethics_notes: GroundedSection[list[str]]
    source_trace: list[SourceCitation]
    confidence_notes: GroundedSection[str]


class FeedbackRecord(ScientistFeedback):
    id: str
    created_at: str


class RegenerateRequest(StrictModel):
    hypothesis: str = Field(..., min_length=8)
    current_plan: ExperimentPlan
    feedback: ScientistFeedback
