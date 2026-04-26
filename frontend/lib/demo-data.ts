import type { ExecutionPlan, ExecutionTask, ExecutionTaskSection, ExperimentPlan, LabView, LiteratureQC } from "./types";

export const sampleHypotheses = [
  {
    label: "CRP paper-based biosensor",
    hypothesis: "A paper-based electrochemical biosensor using anti-CRP capture chemistry can detect clinically relevant C-reactive protein ranges from small-volume serum samples.",
    domain: "diagnostics and biosensors",
    constraints: "Keep protocol guidance high-level and suitable for PI review.",
  },
  {
    label: "Trehalose cryoprotection for HeLa cells",
    hypothesis: "Trehalose pretreatment improves post-thaw membrane integrity and viability in HeLa cells compared with standard cryoprotection alone.",
    domain: "cell biology",
    constraints: "Avoid operational wet-lab parameters; emphasize safety and review approval.",
  },
  {
    label: "Solar cell alternative materials",
    hypothesis: "Earth-abundant chalcogenide absorber materials can improve stability in low-cost thin-film solar cells while preserving practical power conversion efficiency.",
    domain: "materials science and photovoltaics",
    constraints: "Focus on planning, materials sourcing, and validation metrics.",
  },
];

const references = {
  biosensor: [
    {
      title: "Paper-based electrochemical immunosensors for inflammatory biomarkers",
      url: "https://example.org/paper-crp-immunosensor",
      source: "literature",
      relevance_reason: "Adjacent paper-style evidence for paper substrates, electrochemical detection, and CRP biomarker readouts.",
      evidence_type: "mock literature result",
    },
    {
      title: "Point-of-care CRP assay design considerations",
      url: "https://example.org/crp-point-of-care-design",
      source: "protocol",
      relevance_reason: "Protocol-style source for high-level assay validation, sample handling review, and comparator planning.",
      evidence_type: "mock protocol result",
    },
  ],
  hela: [
    {
      title: "Trehalose and cell membrane protection during cryopreservation",
      url: "https://example.org/trehalose-cryoprotection-review",
      source: "literature",
      relevance_reason: "Similar work connecting trehalose, membrane stabilization, and post-thaw viability outcomes.",
      evidence_type: "mock literature result",
    },
    {
      title: "Cell viability assay validation after thaw recovery",
      url: "https://example.org/post-thaw-viability-validation",
      source: "validation",
      relevance_reason: "Validation-oriented reference for viability, membrane integrity, and replicate-level QC.",
      evidence_type: "mock validation result",
    },
  ],
  solar: [
    {
      title: "Earth-abundant chalcogenide absorbers for thin-film photovoltaics",
      url: "https://example.org/chalcogenide-thin-film-pv",
      source: "literature",
      relevance_reason: "Materials literature supporting absorber selection, stability screening, and efficiency tradeoffs.",
      evidence_type: "mock literature result",
    },
    {
      title: "Stability validation methods for emerging photovoltaic materials",
      url: "https://example.org/pv-stability-validation",
      source: "validation",
      relevance_reason: "Validation source for accelerated aging, device characterization, and degradation tracking.",
      evidence_type: "mock validation result",
    },
  ],
};

function keyForHypothesis(hypothesis: string): keyof typeof references {
  const text = hypothesis.toLowerCase();
  if (text.includes("trehalose") || text.includes("hela")) return "hela";
  if (text.includes("solar") || text.includes("chalcogenide")) return "solar";
  return "biosensor";
}

function section<T>(content: T, sources: string[], confidence = 0.72, assumptions: string[] = ["Demo fallback assumption; verify with live retrieved sources."]) {
  return { content, confidence, supporting_sources: sources, assumptions };
}

// ---------------------------------------------------------------------------
// Rich domain-aware LabView graphs
// ---------------------------------------------------------------------------

const LAB_VIEWS: Record<keyof typeof references, LabView> = {
  biosensor: {
    version: 1,
    nodes: [
      {
        id: "bio-1",
        node_type: "process",
        label: "Literature Review",
        description: "Survey adjacent CRP immunosensor literature and identify protocol gaps.",
        fields: [],
        metadata: {
          confidence: 0.88,
          supporting_sources: ["https://example.org/paper-crp-immunosensor"],
          assumptions: ["PubMed and Tavily evidence is representative for current methods."],
        },
        state: { status: "reviewed", version: 1 },
        learn_content: {
          what_is_this: "A systematic survey of existing CRP biosensor literature to frame the novelty claim.",
          why_important: "Establishes prior art baseline, prevents duplication, and identifies the most productive design space.",
          connection_to_hypothesis: "Confirms that paper-based electrochemical CRP detection is adjacent but not identical to prior work, supporting the novelty framing.",
          common_alternatives: ["Direct empirical screening without review", "Scoping review via meta-analysis tool"],
          risks: ["Missing recent preprints in non-indexed journals", "Over-relying on a single search engine"],
        },
      },
      {
        id: "bio-2",
        node_type: "material",
        label: "Paper Substrate & Reagents",
        description: "Select and procure nitrocellulose or carbon-ink paper substrate and anti-CRP capture antibody.",
        fields: [],
        metadata: {
          confidence: 0.62,
          supporting_sources: ["https://example.org/crp-point-of-care-design"],
          assumptions: ["Anti-CRP antibody with documented KD is commercially available.", "Paper substrate spec is stable across batches."],
        },
        state: { status: "flagged", version: 2 },
        learn_content: {
          what_is_this: "The physical sensing scaffold and capture chemistry that define the core detection mechanism.",
          why_important: "Material quality determines limit-of-detection and assay reproducibility.",
          connection_to_hypothesis: "Anti-CRP capture antibody is the specific binding element that enables CRP quantification from serum.",
          common_alternatives: ["Aptamer-based capture chemistry", "Lateral flow strip format", "Screen-printed electrode"],
          risks: ["Batch-to-batch antibody lot variation", "Substrate hydrophilicity inconsistency", "Antigen cross-reactivity"],
        },
      },
      {
        id: "bio-3",
        node_type: "assay",
        label: "Electrochemical Calibration",
        description: "Establish dose-response curve using spiked CRP standards across the clinical range.",
        fields: [],
        metadata: {
          confidence: 0.76,
          supporting_sources: ["https://example.org/paper-crp-immunosensor", "https://example.org/crp-point-of-care-design"],
          assumptions: ["Spiked serum matrix is representative of clinical samples."],
        },
        state: { status: "draft", version: 1 },
        learn_content: {
          what_is_this: "The quantitative characterization of the sensor response as a function of CRP concentration.",
          why_important: "Without a calibration curve, no clinical interpretation of signals is possible.",
          connection_to_hypothesis: "Proves the sensor can resolve the clinically relevant range stated in the hypothesis.",
          common_alternatives: ["Optical (colorimetric) readout", "Impedance spectroscopy", "Lateral flow visual interpretation"],
          risks: ["Matrix effects from non-target serum components", "Non-linearity at high CRP concentrations"],
        },
      },
      {
        id: "bio-4",
        node_type: "validation",
        label: "Clinical Sample Validation",
        description: "Test sensor on blinded patient-derived serum samples; compare to gold-standard immunoturbidimetry.",
        fields: [],
        metadata: {
          confidence: 0.81,
          supporting_sources: ["https://example.org/crp-point-of-care-design"],
          assumptions: ["Comparator method (immunoturbidimetry) is validated and available at partner site."],
        },
        state: { status: "draft", version: 1 },
        learn_content: {
          what_is_this: "Head-to-head comparison of biosensor output against a validated clinical reference method.",
          why_important: "Provides translational evidence that the sensor is fit for clinical decision-making.",
          connection_to_hypothesis: "Directly tests the core claim: the biosensor can detect clinically relevant CRP ranges in real samples.",
          common_alternatives: ["ELISA as comparator", "Simoa digital ELISA", "Fully automated analyzer comparison"],
          risks: ["Sample volume limitations", "Pre-analytical variability (freeze-thaw cycles)", "Ethics approval timeline"],
        },
      },
      {
        id: "bio-5",
        node_type: "process",
        label: "PI Review & Decision Gate",
        description: "Principal Investigator reviews all results and assumptions before any next-stage commitment.",
        fields: [],
        metadata: {
          confidence: 0.95,
          supporting_sources: ["https://example.org/crp-point-of-care-design"],
          assumptions: ["PI review is a mandatory safety gate."],
        },
        state: { status: "reviewed", version: 1 },
        learn_content: {
          what_is_this: "A formal checkpoint where qualified scientific leadership reviews data, assumptions, and safety before escalation.",
          why_important: "Prevents premature translation of unvalidated results into clinical or regulatory contexts.",
          connection_to_hypothesis: "Ensures all hypothesis claims are grounded before any public claim is made.",
          common_alternatives: ["External scientific advisory board review", "Peer review manuscript submission"],
          risks: ["Reviewer availability delays", "Conflicting interpretations across reviewers"],
        },
      },
    ],
    edges: [
      { source: "bio-1", target: "bio-2", label: "design confirmed", condition: null },
      { source: "bio-2", target: "bio-3", label: "reagents procured", condition: null },
      { source: "bio-3", target: "bio-4", label: "calibration passed", condition: null },
      { source: "bio-4", target: "bio-5", label: "results ready", condition: null },
    ],
  },

  hela: {
    version: 1,
    nodes: [
      {
        id: "hela-1",
        node_type: "process",
        label: "Literature Survey",
        description: "Review trehalose-based cryoprotection literature and comparator outcomes.",
        fields: [],
        metadata: {
          confidence: 0.86,
          supporting_sources: ["https://example.org/trehalose-cryoprotection-review"],
          assumptions: ["Prior HeLa cryoprotection literature is accessible and comparable."],
        },
        state: { status: "reviewed", version: 1 },
        learn_content: {
          what_is_this: "A structured review of published trehalose cryoprotection approaches for mammalian cell lines.",
          why_important: "Establishes whether trehalose pretreatment is novel for HeLa or already well-characterized.",
          connection_to_hypothesis: "Identifies the gap that trehalose-alone or DMSO-alone does not fully protect HeLa post-thaw.",
          common_alternatives: ["Systematic review via Covidence", "Meta-analysis of viability endpoints"],
          risks: ["Publication bias toward positive outcomes", "Lab-specific protocol variation across studies"],
        },
      },
      {
        id: "hela-2",
        node_type: "material",
        label: "Cell Line & Reagent Sourcing",
        description: "Authenticate HeLa cell stock and procure trehalose and cryoprotectant reagents from vetted suppliers.",
        fields: [],
        metadata: {
          confidence: 0.70,
          supporting_sources: ["https://example.org/trehalose-cryoprotection-review"],
          assumptions: ["Authenticated HeLa from ATCC or institutional bank is available."],
        },
        state: { status: "draft", version: 1 },
        learn_content: {
          what_is_this: "Acquisition of authenticated cell stocks and high-purity cryoprotective agents.",
          why_important: "Mycoplasma contamination or unauthenticated cell lines invalidate all downstream results.",
          connection_to_hypothesis: "Ensures the experimental model matches the biological system named in the hypothesis.",
          common_alternatives: ["Use existing in-house passage stocks", "Outsource cryopreservation to core facility"],
          risks: ["Passage number drift affecting phenotype", "Reagent purity inconsistency", "Cold chain management"],
        },
      },
      {
        id: "hela-3",
        node_type: "assay",
        label: "Cryopreservation Protocol Setup",
        description: "Define conceptual freezing and thawing ramp parameters for trehalose vs. standard control groups.",
        fields: [],
        metadata: {
          confidence: 0.65,
          supporting_sources: ["https://example.org/trehalose-cryoprotection-review", "https://example.org/post-thaw-viability-validation"],
          assumptions: ["Ramp parameters remain conceptual; final values require qualified PI approval."],
        },
        state: { status: "flagged", version: 2 },
        learn_content: {
          what_is_this: "High-level design of the freezing and thawing workflow for comparing trehalose to standard DMSO cryoprotection.",
          why_important: "Protocol design determines whether the experiment can detect the membrane integrity differences the hypothesis predicts.",
          connection_to_hypothesis: "The protocol is the direct operational expression of the experimental condition difference.",
          common_alternatives: ["Controlled-rate freezer vs. isopropanol-jacketed freezing", "Vapor-phase nitrogen storage comparison"],
          risks: ["Non-operational protocol details must not be shared without PI approval", "Ramp rate variation between labs"],
        },
      },
      {
        id: "hela-4",
        node_type: "validation",
        label: "Post-Thaw Viability Assay",
        description: "Measure membrane integrity and cell viability across trehalose and comparator groups using validated readouts.",
        fields: [],
        metadata: {
          confidence: 0.84,
          supporting_sources: ["https://example.org/post-thaw-viability-validation"],
          assumptions: ["Chosen viability assay has published validation data."],
        },
        state: { status: "draft", version: 1 },
        learn_content: {
          what_is_this: "Quantitative measurement of cell survival and membrane integrity after the thaw cycle.",
          why_important: "Membrane integrity is the specific biological endpoint the hypothesis claims trehalose improves.",
          connection_to_hypothesis: "Directly tests the measurable outcome: post-thaw membrane integrity and viability in HeLa.",
          common_alternatives: ["Trypan blue exclusion", "Flow cytometry annexin-V / PI", "Resazurin metabolic assay"],
          risks: ["Assay timing sensitivity (cells must be measured within 30 min)", "Instrument calibration drift"],
        },
      },
      {
        id: "hela-5",
        node_type: "process",
        label: "Safety & Ethics Review",
        description: "Confirm biosafety level requirements for HeLa work and obtain institutional signoff.",
        fields: [],
        metadata: {
          confidence: 0.92,
          supporting_sources: ["https://example.org/trehalose-cryoprotection-review"],
          assumptions: ["HeLa cells require BSL-2 practices per institutional IBC guidelines."],
        },
        state: { status: "approved", version: 1 },
        learn_content: {
          what_is_this: "A mandatory institutional safety review before any work with a human-derived cell line proceeds.",
          why_important: "Human-origin cell lines require BSL-2 practices, documented risk assessment, and IBC registration.",
          connection_to_hypothesis: "Safety compliance is a prerequisite; no hypothesis can justify bypassing biosafety requirements.",
          common_alternatives: ["Use a non-human origin cell comparator to reduce BSL requirements"],
          risks: ["IBC approval delays", "Undeclared mycoplasma contamination in existing stocks"],
        },
      },
    ],
    edges: [
      { source: "hela-1", target: "hela-2", label: "design gap identified", condition: null },
      { source: "hela-2", target: "hela-3", label: "materials ready", condition: null },
      { source: "hela-3", target: "hela-4", label: "protocol approved", condition: null },
      { source: "hela-4", target: "hela-5", label: "data collected", condition: null },
    ],
  },

  solar: {
    version: 1,
    nodes: [
      {
        id: "sol-1",
        node_type: "process",
        label: "Absorber Candidate Review",
        description: "Identify and rank earth-abundant chalcogenide candidates by efficiency and stability reports.",
        fields: [],
        metadata: {
          confidence: 0.83,
          supporting_sources: ["https://example.org/chalcogenide-thin-film-pv"],
          assumptions: ["Literature PCE and stability benchmarks are reproducible across groups."],
        },
        state: { status: "reviewed", version: 1 },
        learn_content: {
          what_is_this: "A comparative ranking of candidate absorber materials (e.g. CZTS, SnS, Sb₂Se₃) based on published efficiency and stability data.",
          why_important: "Selecting the wrong absorber family wastes fabrication budget; a literature-driven shortlist de-risks material selection.",
          connection_to_hypothesis: "The hypothesis requires earth-abundant materials — this step identifies which candidates qualify.",
          common_alternatives: ["High-throughput computational screening (DFT)", "Combinatorial sputtering mapping"],
          risks: ["PCE benchmarks often lab-specific and hard to reproduce", "Open-circuit voltage deficit often underreported"],
        },
      },
      {
        id: "sol-2",
        node_type: "material",
        label: "Precursor & Substrate Sourcing",
        description: "Procure high-purity chalcogenide precursors and fluorine-doped tin oxide substrates.",
        fields: [],
        metadata: {
          confidence: 0.68,
          supporting_sources: ["https://example.org/chalcogenide-thin-film-pv"],
          assumptions: ["Target precursor purity ≥99.99% is commercially available.", "FTO substrate is compatible with deposition method."],
        },
        state: { status: "draft", version: 1 },
        learn_content: {
          what_is_this: "Acquisition of elemental or compound precursors for thin-film deposition and transparent conductive oxide substrates.",
          why_important: "Precursor purity and stoichiometric control directly determine film quality and device yield.",
          connection_to_hypothesis: "Earth-abundant means specific elemental choices (Cu, Zn, Sn, S/Se); sourcing validates feasibility.",
          common_alternatives: ["Sol-gel precursors", "Nanoparticle ink deposition", "Electrodeposition from solution"],
          risks: ["Precursor contamination causes deep trap states in absorber", "FTO roughness affects shunt resistance"],
        },
      },
      {
        id: "sol-3",
        node_type: "assay",
        label: "Thin-Film Deposition Design",
        description: "Define conceptual deposition method and stack architecture for PI review.",
        fields: [],
        metadata: {
          confidence: 0.60,
          supporting_sources: ["https://example.org/chalcogenide-thin-film-pv", "https://example.org/pv-stability-validation"],
          assumptions: ["Deposition parameters are high-level; operational values require qualified personnel sign-off."],
        },
        state: { status: "flagged", version: 2 },
        learn_content: {
          what_is_this: "High-level specification of the thin-film layer stack (absorber, buffer, contacts) and deposition approach.",
          why_important: "Architecture choices lock in the efficiency ceiling and stability mechanism for the final device.",
          connection_to_hypothesis: "The thin-film stack is the physical implementation of the hypothesis claim.",
          common_alternatives: ["Thermal evaporation", "Chemical bath deposition (CBD) for buffer", "Sputtering of contacts"],
          risks: ["Interface recombination at absorber/buffer junction", "Pinhole formation during annealing step"],
        },
      },
      {
        id: "sol-4",
        node_type: "validation",
        label: "Stability & Efficiency Characterization",
        description: "Characterize PCE under 1-sun illumination and run accelerated aging per IEC 61215 analogue.",
        fields: [],
        metadata: {
          confidence: 0.79,
          supporting_sources: ["https://example.org/pv-stability-validation"],
          assumptions: ["Access to solar simulator and damp-heat chamber available at partner facility."],
        },
        state: { status: "draft", version: 1 },
        learn_content: {
          what_is_this: "Quantitative measurement of device power conversion efficiency and accelerated degradation under stress conditions.",
          why_important: "Hypothesis claims stability improvement — only controlled aging data can validate this claim.",
          connection_to_hypothesis: "Directly tests both sides of the hypothesis: efficiency preservation AND stability improvement.",
          common_alternatives: ["Outdoor real-world exposure tracking", "Continuous maximum power point tracking (MPPT) under light soak"],
          risks: ["Light soaking hysteresis misrepresents true steady-state PCE", "Accelerated aging may not predict real field conditions"],
        },
      },
      {
        id: "sol-5",
        node_type: "process",
        label: "PI Review & IP Assessment",
        description: "Review all device results and assess IP landscape before any public disclosure.",
        fields: [],
        metadata: {
          confidence: 0.90,
          supporting_sources: ["https://example.org/chalcogenide-thin-film-pv"],
          assumptions: ["Technology Transfer Office is consulted before publication or commercialization steps."],
        },
        state: { status: "reviewed", version: 1 },
        learn_content: {
          what_is_this: "Final scientific and IP review gate before results leave the lab.",
          why_important: "Photovoltaic material innovations may be patentable; premature disclosure forfeits IP rights.",
          connection_to_hypothesis: "Ensures the efficiency and stability claims are correctly scoped before dissemination.",
          common_alternatives: ["Skip IP assessment for purely academic publication", "Technology Transfer pre-filing search"],
          risks: ["Novelty destroyed by prior disclosure", "Overstated efficiency claims in preliminary reports"],
        },
      },
    ],
    edges: [
      { source: "sol-1", target: "sol-2", label: "candidate shortlist", condition: null },
      { source: "sol-2", target: "sol-3", label: "precursors available", condition: null },
      { source: "sol-3", target: "sol-4", label: "stack approved", condition: null },
      { source: "sol-4", target: "sol-5", label: "data reviewed", condition: null },
    ],
  },
};

export function demoLabView(hypothesis: string): LabView {
  return LAB_VIEWS[keyForHypothesis(hypothesis)];
}

export function demoLiteratureQC(hypothesis: string): LiteratureQC {
  const key = keyForHypothesis(hypothesis);
  return {
    novelty_signal: key === "solar" ? "similar_work_exists" : "similar_work_exists",
    confidence: key === "biosensor" ? 0.7 : 0.66,
    summary:
      "Demo data: prior work appears adjacent rather than an exact match. A PI should review whether intervention, system, outcome, and method overlap before claiming novelty.",
    references: references[key],
  };
}

export function demoExperimentPlan(hypothesis: string, qc: LiteratureQC | null): ExperimentPlan {
  const key = keyForHypothesis(hypothesis);
  const refs = qc?.references.length ? qc.references : references[key];
  const sourceTrace = refs.map((ref) => ({ title: ref.title, url: ref.url, source: ref.source }));
  const firstUrl = sourceTrace[0]?.url ?? "https://example.org/demo-source";
  const validationUrl = sourceTrace[1]?.url ?? firstUrl;

  const domainText = key === "solar" ? "materials characterization" : key === "hela" ? "cell viability review" : "biosensor validation";

  return {
    title: "Demo PI-review planning draft",
    hypothesis,
    executive_summary: section(
      `Demo data: this plan frames the hypothesis as a source-grounded ${domainText} study with high-level protocol planning, safety review gates, and traceable validation criteria.`,
      [firstUrl],
      0.7,
    ),
    protocol_summary: section([
      "Review adjacent literature and protocol sources before locking the study design.",
      "Define comparator groups, primary endpoint, and exclusion criteria at a conceptual level for PI approval.",
      "Use qualified personnel and approved local protocols for any experimental execution.",
      "Analyze results against predefined validation metrics and document deviations before interpretation.",
    ], [firstUrl, validationUrl], 0.68),
    materials: section([
      {
        item: key === "solar" ? "Candidate absorber material set" : key === "hela" ? "Authenticated cell model source" : "Paper sensor substrate and capture chemistry",
        purpose: "Support the core comparison implied by the hypothesis.",
        supplier_hint: key === "solar" ? "Use vetted materials vendors or institutional synthesis channels." : "Use institution-approved commercial or core-facility sourcing.",
        catalog_number: "not found in retrieved sources",
        estimated_cost: key === "solar" ? 1200 : 450,
        evidence_url: firstUrl,
      },
      {
        item: key === "solar" ? "Device characterization access" : key === "hela" ? "Viability and membrane integrity assay service" : "Electrochemical reader or shared instrumentation",
        purpose: "Measure the primary and orthogonal validation endpoints.",
        supplier_hint: "Prefer validated platforms with documented QC support.",
        catalog_number: "not found in retrieved sources",
        estimated_cost: key === "solar" ? 1800 : 850,
        evidence_url: validationUrl,
      },
    ], [firstUrl, validationUrl], 0.62, ["Catalog numbers are not invented; unavailable values are marked as not found in retrieved sources."]),
    budget: section([
      { category: "Materials", item: "Primary samples or candidate materials", estimated_cost: key === "solar" ? 1200 : 450, notes: `Demo estimate grounded by ${firstUrl}.` },
      { category: "Validation", item: "Primary and orthogonal measurement access", estimated_cost: key === "solar" ? 1800 : 850, notes: `Demo estimate grounded by ${validationUrl}.` },
      { category: "Review", item: "PI review, safety review, and analysis time", estimated_cost: 500, notes: "Planning estimate for hackathon demo; replace with local quotes." },
    ], [firstUrl, validationUrl], 0.6, ["Budget is a demo planning estimate, not a quote."]),
    timeline: section([
      { phase: "Evidence review", duration: "1 week", dependencies: ["QC references"], deliverable: "PI-approved study outline" },
      { phase: "Sourcing and validation setup", duration: "1-2 weeks", dependencies: ["Supplier availability", "Safety review"], deliverable: "Materials and measurement plan" },
      { phase: "Qualified execution and analysis", duration: "2-5 weeks", dependencies: ["Approved protocol"], deliverable: "QC-reviewed decision memo" },
    ], [firstUrl, validationUrl], 0.64),
    validation: section([
      { metric: "Primary endpoint", success_threshold: "Directionally consistent with the hypothesis and larger than expected control variation.", measurement_method: `High-level validated readout category supported by ${validationUrl}.` },
      { metric: "Orthogonal confirmation", success_threshold: "Independent measurement supports the same conclusion.", measurement_method: "Secondary validation method selected during PI review." },
      { metric: "Traceability", success_threshold: "Every major design choice maps to a reference or reviewer note.", measurement_method: "Source trace and feedback audit." },
    ], [validationUrl], 0.7),
    risks_and_assumptions: section([
      "Demo data may not reflect the latest literature; use live Tavily results for final review.",
      "Novelty may narrow after exact intervention/system/outcome/method comparison.",
      "Budget and timeline are realistic planning placeholders, not procurement quotes.",
    ], [firstUrl], 0.72),
    safety_and_ethics_notes: section([
      "This is a PI-review-ready planning draft, not a final operational protocol.",
      "Institutional safety and ethics approval may be required before execution.",
      "Do not translate this into wet-lab or hazardous materials work without qualified supervision.",
    ], [firstUrl], 0.78),
    lab_workflow: LAB_VIEWS[key],
    source_trace: sourceTrace,
    confidence_notes: section("Demo data fallback is active. Replace with live Tavily/Ollama output before making research claims.", [firstUrl], 0.7),
    updated_sections: [],
  };
}

function executionTask(
  task_id: string,
  section: ExecutionTaskSection,
  title: string,
  description: string,
  status: ExecutionTask["status"] = "not_started",
  assignee?: string,
): ExecutionTask {
  return {
    task_id,
    section,
    title,
    description,
    status,
    assignee: assignee ?? null,
    notes: "",
    updated_at: new Date().toISOString(),
  };
}

export function demoExecutionPlan(planId: string, hypothesis = sampleHypotheses[0].hypothesis): ExecutionPlan {
  return {
    plan_id: planId,
    title: "Execution Plan: Demo Hand-off Workspace",
    hypothesis,
    creator_email: "pi-demo@scibuddy.local",
    executor_emails: ["executor-demo@scibuddy.local", "reviewer-demo@scibuddy.local"],
    status: "in_progress",
    source_plan_summary:
      "Demo workspace fallback: this plan shows how a reviewed scientific plan can be handed off to an executor, tracked across milestones, and returned for scientist review.",
    safety_notice:
      "This workspace is for planning and coordination only. Do not begin regulated, hazardous, clinical, animal, human-subject, gene-editing, or chemical-risk work without appropriate PI and institutional approval.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tasks: {
      Preparation: [
        executionTask("prep-1", "Preparation", "Confirm PI approval", "Done when the responsible scientist or PI has approved this plan for coordination use.", "needs_review", "Dr. Avery"),
        executionTask("prep-2", "Preparation", "Assign execution roles", "Done when an owner, executor, and reviewer are named in the workspace.", "done", "Mina"),
        executionTask("prep-3", "Preparation", "Open the execution log", "Done when the team has a shared place to record updates, deviations, and observations.", "done", "Mina"),
      ],
      "Design Review": [
        executionTask("design-1", "Design Review", "Confirm study objective", "Done when the executor can restate the hypothesis and intended outcome in one short summary.", "done", "Mina"),
        executionTask("design-2", "Design Review", "Confirm controls and validation criteria", "Done when the team has agreed how controls and success checks will be judged.", "needs_review", "Dr. Avery"),
        executionTask("design-3", "Design Review", "Flag open assumptions", "Done when unresolved assumptions or scope questions are logged for review.", "in_progress", "Mina"),
      ],
      "Materials and Logistics": [
        executionTask("materials-1", "Materials and Logistics", "Confirm materials availability", "Done when required resources are confirmed available or sourcing is assigned.", "done", "Leo"),
        executionTask("materials-2", "Materials and Logistics", "Confirm logistics and timing", "Done when scheduling and dependencies are clear for planned milestones.", "in_progress", "Leo"),
        executionTask("materials-3", "Materials and Logistics", "Confirm budget coverage", "Done when funding, purchasing, or internal approvals are sufficient for the planned work.", "not_started"),
      ],
      "Execution Tracking": [
        executionTask("tracking-1", "Execution Tracking", "Track milestone progress", "Done when current status is recorded for each major milestone in the workspace.", "in_progress", "Mina"),
        executionTask("tracking-2", "Execution Tracking", "Record deviations", "Done when any scope, timing, or resource deviations are logged with date and owner.", "blocked", "Mina"),
        executionTask("tracking-3", "Execution Tracking", "Upload observations", "Done when non-procedural observations, outputs, or notes are captured for the team.", "not_started"),
      ],
      "Validation and Analysis": [
        executionTask("validation-1", "Validation and Analysis", "Confirm validation plan", "Done when validation checks are defined for the reviewed plan.", "done", "Reviewer"),
        executionTask("validation-2", "Validation and Analysis", "Review analysis readiness", "Done when analysis owners, required outputs, and review expectations are documented.", "in_progress", "Reviewer"),
        executionTask("validation-3", "Validation and Analysis", "Capture review-ready evidence", "Done when observations and supporting outputs are organized for scientist review.", "not_started"),
      ],
      "Safety and Compliance": [
        executionTask("safety-1", "Safety and Compliance", "Review safety requirements", "Done when the team has reviewed safety considerations and escalation needs.", "done", "Safety Lead"),
        executionTask("safety-2", "Safety and Compliance", "Confirm required approvals", "Done when any PI, institutional, or program approvals are identified and tracked before work proceeds.", "needs_review", "Dr. Avery"),
        executionTask("safety-3", "Safety and Compliance", "Escalate regulated work", "Done when regulated or hazardous work has been escalated for approval.", "not_started"),
      ],
      "Final Review": [
        executionTask("final-1", "Final Review", "Request PI review", "Done when the scientist or PI has been asked to review the execution record and outcomes.", "needs_review", "Dr. Avery"),
        executionTask("final-2", "Final Review", "Confirm completion notes", "Done when final notes, unresolved questions, and next steps are documented.", "not_started"),
        executionTask("final-3", "Final Review", "Close the workspace", "Done when the plan is ready to archive or continue with a new review cycle.", "not_started"),
      ],
    },
  };
}
