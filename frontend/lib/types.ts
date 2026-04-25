export type HypothesisInput = {
  hypothesis: string;
  domain?: string;
  constraints?: string;
};

export type LiteratureReference = {
  title: string;
  url: string;
  source: string;
  relevance_reason: string;
  evidence_type: string;
};

export type LiteratureQC = {
  novelty_signal: "not_found" | "similar_work_exists" | "exact_match_found";
  confidence: number;
  summary: string;
  references: LiteratureReference[];
};

export type MaterialItem = {
  item: string;
  purpose: string;
  supplier_hint: string;
  estimated_cost: number;
  evidence_url: string;
};

export type BudgetItem = {
  category: string;
  item: string;
  estimated_cost: number;
  notes: string;
};

export type TimelineItem = {
  phase: string;
  duration: string;
  dependencies: string[];
  deliverable: string;
};

export type ValidationItem = {
  metric: string;
  success_threshold: string;
  measurement_method: string;
};

export type SourceCitation = {
  title: string;
  url: string;
  source: string;
};

export type ExperimentPlan = {
  title: string;
  hypothesis: string;
  executive_summary: string;
  protocol_summary: string[];
  materials: MaterialItem[];
  budget: BudgetItem[];
  timeline: TimelineItem[];
  validation: ValidationItem[];
  risks_and_assumptions: string[];
  safety_and_ethics_notes: string[];
  source_trace: SourceCitation[];
  confidence_notes: string;
};

export type ScientistFeedback = {
  plan_id: string;
  section: string;
  rating: number;
  correction: string;
  tags: string[];
};

export type FeedbackRecord = ScientistFeedback & {
  id: string;
  created_at: string;
};

