import type { ExperimentPlan, LiteratureQC } from "./types";

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
    source_trace: sourceTrace,
    confidence_notes: section("Demo data fallback is active. Replace with live Tavily/Ollama output before making research claims.", [firstUrl], 0.7),
  };
}
