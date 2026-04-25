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

export type ReferenceRubricScore = {
  title: string;
  url: string;
  intervention_match: number;
  system_match: number;
  outcome_match: number;
  method_protocol_match: number;
  threshold_control_match: number;
  total: number;
  rationale: string;
};

export type ParsedHypothesis = {
  intervention?: string | null;
  system?: string | null;
  measurable_outcome?: string | null;
  threshold?: string | null;
  mechanism?: string | null;
  control_condition?: string | null;
  domain?: string | null;
};

export type TavilyEvidence = {
  title: string;
  url: string;
  content: string;
  snippet: string;
  score: number;
  source_type: "literature" | "exact_hypothesis" | "similar_paper" | "protocol" | "materials" | "validation" | "safety";
  mock: boolean;
  query?: string | null;
};

export type LiteratureQC = {
  novelty_signal: "not_found" | "similar_work_exists" | "exact_match_found";
  confidence: number;
  summary: string;
  references: LiteratureReference[];
  reference_scores?: ReferenceRubricScore[];
  parsed_hypothesis?: ParsedHypothesis | null;
  search_results?: TavilyEvidence[];
};

export type MaterialItem = {
  item: string;
  purpose: string;
  supplier_hint: string;
  catalog_number: string;
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

export type GroundedSection<T> = {
  content: T;
  confidence: number;
  supporting_sources: string[];
  assumptions: string[];
};

export type ExperimentPlan = {
  title: string;
  hypothesis: string;
  executive_summary: GroundedSection<string>;
  protocol_summary: GroundedSection<string[]>;
  materials: GroundedSection<MaterialItem[]>;
  budget: GroundedSection<BudgetItem[]>;
  timeline: GroundedSection<TimelineItem[]>;
  validation: GroundedSection<ValidationItem[]>;
  risks_and_assumptions: GroundedSection<string[]>;
  safety_and_ethics_notes: GroundedSection<string[]>;
  source_trace: SourceCitation[];
  confidence_notes: GroundedSection<string>;
};

export type ScientistFeedback = {
  plan_id: string;
  section: string;
  rating: number;
  correction: string;
  tags: string[];
  hypothesis?: string;
  parsed_domain?: string;
  experiment_type?: string;
};

export type FeedbackRecord = ScientistFeedback & {
  id: string;
  created_at: string;
};
