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

export type LabFieldType = "text" | "number" | "select" | "boolean";

export type LabFieldDef = {
  name: string;
  label: string;
  field_type: LabFieldType;
  options?: string[] | null;
  value?: any;
  editable: boolean;
};

export type LabNodeMeta = {
  confidence: number;
  supporting_sources: string[];
  assumptions: string[];
};

export interface LabNodeState {
  status: "draft" | "reviewed" | "flagged" | "approved";
  version: number;
  last_reviewer_notes?: string | null;
}

export interface LabNodeLearnContent {
  what_is_this: string;
  why_important: string;
  connection_to_hypothesis: string;
  common_alternatives: string[];
  risks: string[];
}

export interface LabNode {
  id: string;
  node_type: "material" | "process" | "assay" | "validation";
  label: string;
  description: string;
  fields: LabFieldDef[];
  metadata: LabNodeMeta;
  state: LabNodeState;
  learn_content?: LabNodeLearnContent | null;
}

export type LabEdge = {
  source: string;
  target: string;
  label?: string | null;
  condition?: string | null;
};

export type LabView = {
  version: number;
  nodes: LabNode[];
  edges: LabEdge[];
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
  budget: GroundedSection<BudgetItem[]>;
  timeline: GroundedSection<TimelineItem[]>;
  risks_and_assumptions: GroundedSection<string[]>;
  safety_and_ethics_notes: GroundedSection<string[]>;
  lab_workflow?: LabView | null;
  source_trace: SourceCitation[];
  confidence_notes: GroundedSection<string>;
  updated_sections?: string[];
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

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  created_at?: string | null;
};

export type ChatAboutLiteratureRequest = {
  messages: ChatMessage[];
  hypothesis: string;
  domain?: string | null;
  constraints?: string | null;
  qc?: LiteratureQC | null;
};

export type ChatAboutLiteratureResponse = {
  message: ChatMessage;
  suggested_hypothesis?: string | null;
  should_refresh_qc?: boolean;
};

export type ExecutionPlanStatus = "draft" | "in_progress" | "completed" | "archived";
export type ExecutionTaskStatus = "not_started" | "in_progress" | "blocked" | "done" | "needs_review";

export type ExecutionTaskSection =
  | "Preparation"
  | "Design Review"
  | "Materials and Logistics"
  | "Execution Tracking"
  | "Validation and Analysis"
  | "Safety and Compliance"
  | "Final Review";

export type ExecutionTask = {
  task_id: string;
  section: ExecutionTaskSection;
  title: string;
  description: string;
  status: ExecutionTaskStatus;
  assignee?: string | null;
  notes: string;
  updated_at: string;
};

export type ExecutionPlan = {
  plan_id: string;
  title: string;
  hypothesis: string;
  creator_email?: string | null;
  executor_emails: string[];
  status: ExecutionPlanStatus;
  tasks: Record<ExecutionTaskSection, ExecutionTask[]>;
  source_plan_summary: string;
  safety_notice: string;
  created_at: string;
  updated_at: string;
};

export type UpdateExecutionTaskPayload = {
  status?: ExecutionTaskStatus;
  assignee?: string | null;
  notes?: string;
};

export type InviteExecutorsPayload = {
  executor_emails: string[];
};

export type InviteExecutorsResponse = {
  invited_emails: string[];
  share_url: string;
  email_subject: string;
  email_body: string;
};

export type ChatRegenerateRequest = {
  hypothesis: string;
  current_plan: ExperimentPlan;
  messages: ChatMessage[];
  active_section?: string | null;
};
