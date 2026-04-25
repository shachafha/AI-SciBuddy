import type { ChatAboutLiteratureRequest, ChatAboutLiteratureResponse, ExperimentPlan, FeedbackRecord, HypothesisInput, LiteratureQC, ScientistFeedback } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function runLiteratureQC(payload: HypothesisInput) {
  return request<LiteratureQC>("/api/literature-qc", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generatePlan(payload: HypothesisInput, qc: LiteratureQC | null) {
  return request<ExperimentPlan>("/api/generate-plan", {
    method: "POST",
    body: JSON.stringify({ ...payload, qc }),
  });
}

export function submitFeedback(payload: ScientistFeedback) {
  return request<FeedbackRecord>("/api/feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getFeedback() {
  return request<FeedbackRecord[]>("/api/feedback");
}

export function regenerateWithFeedback(hypothesis: string, currentPlan: ExperimentPlan, feedback: ScientistFeedback) {
  return request<ExperimentPlan>("/api/regenerate-with-feedback", {
    method: "POST",
    body: JSON.stringify({ hypothesis, current_plan: currentPlan, feedback }),
  });
}

export function chatAboutLiterature(payload: ChatAboutLiteratureRequest) {
  return request<ChatAboutLiteratureResponse>("/api/chat-literature", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
