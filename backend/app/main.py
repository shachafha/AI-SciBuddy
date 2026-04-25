import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .feedback_store import add_feedback, list_feedback
from .literature_qc import assess_literature_qc
from .plan_generator import generate_plan, regenerate_plan_with_feedback
from .schemas import (
    FeedbackRecord,
    ExperimentPlan,
    GeneratePlanRequest,
    HypothesisInput,
    LiteratureQC,
    RegenerateRequest,
    ScientistFeedback,
)

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")

app = FastAPI(title="AI SciBuddy API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "AI SciBuddy"}


@app.post("/api/literature-qc", response_model=LiteratureQC)
def literature_qc(payload: HypothesisInput) -> LiteratureQC:
    return assess_literature_qc(payload.hypothesis, payload.domain, payload.constraints)


@app.post("/api/generate-plan", response_model=ExperimentPlan)
def create_plan(payload: GeneratePlanRequest) -> ExperimentPlan:
    return generate_plan(
        hypothesis=payload.hypothesis,
        qc=payload.qc or payload.literature_qc,
        domain=payload.domain,
        constraints=payload.constraints,
        protocol_evidence=payload.protocol_evidence,
        materials_evidence=payload.materials_evidence,
        validation_evidence=payload.validation_evidence,
        prior_feedback=payload.prior_feedback,
    )


@app.post("/api/feedback", response_model=FeedbackRecord)
def create_feedback(payload: ScientistFeedback) -> FeedbackRecord:
    return add_feedback(payload)


@app.get("/api/feedback", response_model=list[FeedbackRecord])
def get_feedback() -> list[FeedbackRecord]:
    return list_feedback()


@app.post("/api/regenerate-with-feedback", response_model=ExperimentPlan)
def regenerate(payload: RegenerateRequest) -> ExperimentPlan:
    return regenerate_plan_with_feedback(payload.hypothesis, payload.current_plan, payload.feedback)
