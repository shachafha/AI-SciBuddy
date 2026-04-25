from typing import Literal

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


class LiteratureQC(StrictModel):
    novelty_signal: Literal["not_found", "similar_work_exists", "exact_match_found"]
    confidence: float = Field(..., ge=0, le=1)
    summary: str
    references: list[LiteratureReference]


class TavilyEvidence(StrictModel):
    title: str
    url: str
    content: str
    snippet: str
    score: float = Field(..., ge=0)
    source_type: Literal["literature", "protocol", "materials", "validation"]
    mock: bool = False


class ScientistFeedback(StrictModel):
    plan_id: str
    section: str
    rating: int = Field(..., ge=1, le=5)
    correction: str = Field(..., min_length=2)
    tags: list[str] = Field(default_factory=list)


class GeneratePlanRequest(HypothesisInput):
    qc: LiteratureQC | None = None
    literature_qc: LiteratureQC | None = None
    protocol_evidence: list[TavilyEvidence] | None = None
    materials_evidence: list[TavilyEvidence] | None = None
    validation_evidence: list[TavilyEvidence] | None = None
    prior_feedback: list[ScientistFeedback] = Field(default_factory=list)


class MaterialItem(StrictModel):
    item: str
    purpose: str
    supplier_hint: str
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
    executive_summary: str
    protocol_summary: list[str]
    materials: list[MaterialItem]
    budget: list[BudgetItem]
    timeline: list[TimelineItem]
    validation: list[ValidationItem]
    risks_and_assumptions: list[str]
    safety_and_ethics_notes: list[str]
    source_trace: list[SourceCitation]
    confidence_notes: str


class FeedbackRecord(ScientistFeedback):
    id: str
    created_at: str


class RegenerateRequest(StrictModel):
    hypothesis: str = Field(..., min_length=8)
    current_plan: ExperimentPlan
    feedback: ScientistFeedback
