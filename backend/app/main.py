import os
import logging

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .chat_literature import chat_about_literature
from .execution_store import (
    ExecutionPlanNotFoundError,
    ExecutionStoreError,
    ExecutionTaskNotFoundError,
    create_execution_plan,
    get_execution_plan,
    invite_executors,
    update_execution_task,
)
from .feedback_store import add_feedback, list_feedback
from .literature_qc import assess_literature_qc
from .plan_generator import generate_plan, regenerate_plan_from_lab_view, regenerate_plan_with_feedback
from .schemas import (
    ChatAboutLiteratureRequest,
    ChatAboutLiteratureResponse,
    CreateExecutionPlanRequest,
    ExecutionPlan,
    FeedbackRecord,
    ExperimentPlan,
    GeneratePlanRequest,
    HypothesisInput,
    InviteExecutorsRequest,
    InviteExecutorsResponse,
    LabViewRegenerateRequest,
    LiteratureQC,
    RegenerateRequest,
    ScientistFeedback,
    UpdateTaskRequest,
)

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")

app = FastAPI(title="AI SciBuddy API", version="0.1.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "")

allow_origins = [
    "http://localhost:3000",
]

if frontend_origin:
    allow_origins.append(frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
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
    return chat_about_literature(payload)


@app.post("/api/regenerate-from-lab-view", response_model=ExperimentPlan)
def regenerate_from_lab_view(payload: LabViewRegenerateRequest) -> ExperimentPlan:
    return regenerate_plan_from_lab_view(payload)


@app.post("/api/execution-plans", response_model=ExecutionPlan)
def launch_execution_plan(payload: CreateExecutionPlanRequest) -> ExecutionPlan:
    try:
        return create_execution_plan(
            source_plan=payload.source_plan,
            creator_email=payload.creator_email,
            executor_emails=payload.executor_emails,
        )
    except ExecutionStoreError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/execution-plans/{plan_id}", response_model=ExecutionPlan)
def read_execution_plan(plan_id: str) -> ExecutionPlan:
    try:
        return get_execution_plan(plan_id)
    except ExecutionPlanNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Execution plan not found") from exc
    except ExecutionStoreError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.patch("/api/execution-plans/{plan_id}/tasks/{task_id}", response_model=ExecutionPlan)
def patch_execution_task(plan_id: str, task_id: str, payload: UpdateTaskRequest) -> ExecutionPlan:
    try:
        return update_execution_task(plan_id, task_id, payload)
    except ExecutionPlanNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Execution plan not found") from exc
    except ExecutionTaskNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Execution task not found") from exc
    except ExecutionStoreError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/execution-plans/{plan_id}/invite", response_model=InviteExecutorsResponse)
def invite_execution_plan_executors(
    plan_id: str,
    payload: InviteExecutorsRequest,
    request: Request,
) -> InviteExecutorsResponse:
    origin = (request.headers.get("origin") or "").rstrip("/")
    share_url = f"{origin}/plan/{plan_id}" if origin else f"/plan/{plan_id}"
    try:
        return invite_executors(plan_id, payload.executor_emails, share_url)
    except ExecutionPlanNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Execution plan not found") from exc
    except ExecutionStoreError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
