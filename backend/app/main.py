import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .chat_literature import chat_about_literature
from .feedback_store import add_feedback, list_feedback
from .literature_qc import assess_literature_qc
from .plan_generator import generate_plan, regenerate_plan_with_feedback, regenerate_plan_from_lab_view
from .schemas import (
    ChatAboutLiteratureRequest,
    ChatAboutLiteratureResponse,
    FeedbackRecord,
    ExperimentPlan,
    GeneratePlanRequest,
    HypothesisInput,
    LabViewRegenerateRequest,
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


@app.post("/api/chat-literature", response_model=ChatAboutLiteratureResponse)
def chat_literature(payload: ChatAboutLiteratureRequest) -> ChatAboutLiteratureResponse:
    """
    Chat endpoint for interacting with the AI about hypotheses and literature QC results.
    """
    return chat_about_literature(payload)


@app.post("/api/regenerate-from-lab-view", response_model=ExperimentPlan)
def regenerate_from_lab_view(payload: LabViewRegenerateRequest) -> ExperimentPlan:
    """Regenerate the experiment plan driven by the scientist's edited Lab View graph.

    Provenance of AI-generated vs user-edited nodes is enforced server-side.
    Falls back gracefully to a structured diff-annotated plan if Ollama is unavailable.
    """
    return regenerate_plan_from_lab_view(payload)
