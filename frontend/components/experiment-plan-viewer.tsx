import { useState } from "react";
import { Badge, Card } from "@/components/ui";
import type { ExperimentPlan, GroundedSection, LiteratureQC } from "@/lib/types";
import {
  AlertTriangle,
  BadgeDollarSign,
  Beaker,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  FlaskConical,
  Link2,
  Network,
  Radar,
  RefreshCw,
  ShieldAlert,
  TestTube2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { LabViewCanvas } from "./lab-view-canvas";
import { LiteratureQCPanel } from "./literature-qc-panel";

type ExperimentPlanViewerMode = "experiment_plan" | "lab_view";
type PlanContextSection = "protocol" | "literature" | "materials" | "budget" | "timeline" | "validation" | "risks" | "sources";

const planContextSections: { id: PlanContextSection; label: string }[] = [
  { id: "protocol", label: "Protocol" },
  { id: "literature", label: "Literature" },
  { id: "materials", label: "Materials" },
  { id: "budget", label: "Budget" },
  { id: "timeline", label: "Timeline" },
  { id: "validation", label: "Validation" },
  { id: "risks", label: "Risks" },
  { id: "sources", label: "Sources" },
];

function SectionMeta({ section, className }: { section: GroundedSection<unknown>; className?: string }) {
  return (
    <div className={cn("mt-4 rounded-md border border-border/60 bg-muted/20 p-3 flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2">
        <Badge className={section.confidence > 0.8 ? "bg-primary/10 text-primary border-primary/20 font-mono" : "font-mono"}>
          CONFIDENCE {Math.round(section.confidence * 100)}%
        </Badge>
        {section.supporting_sources.slice(0, 3).map((url) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" className="text-[11px] font-mono font-semibold text-primary hover:underline">
            [SRC_TRACE]
          </a>
        ))}
      </div>
      {section.assumptions.length ? (
        <p className="text-xs text-muted-foreground font-medium">Assumptions: {section.assumptions.join(" | ")}</p>
      ) : null}
    </div>
  );
}

function PlanHeader({ plan, mock, mode }: { plan: ExperimentPlan; mock?: boolean; mode: ExperimentPlanViewerMode }) {
  const isLabView = mode === "lab_view";

  return (
    <div className="border-b border-border/60 bg-white/90 p-5 xl:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-2">
            {isLabView ? <Network className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
            {isLabView ? "Lab View" : "Experiment Plan"}
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">
            {isLabView ? "Laboratory Workflow" : plan.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {mock ? <Badge className="border-amber-200 bg-amber-50 text-amber-900 font-mono">MOCK_DATA</Badge> : null}
          <Badge className="bg-emerald-50 text-emerald-900 border-emerald-200 font-mono">QC PASSED</Badge>
          {plan.updated_sections && plan.updated_sections.length > 0 ? (
            <Badge className="bg-emerald-50 text-emerald-900 border-emerald-200 font-mono">
              UPDATED {plan.updated_sections.length}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PlanOverview({ plan }: { plan: ExperimentPlan }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm h-full">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">Executive Summary</h3>
          <p className="text-sm leading-relaxed text-slate-700">{plan.executive_summary.content}</p>
          <div className="mt-4 rounded-md border border-primary/10 bg-primary/5 p-4 text-sm leading-relaxed font-medium text-slate-800 border-l-4 border-l-primary">
            <span className="font-bold block mb-1 text-xs uppercase tracking-wider text-primary">Target Hypothesis</span>
            {plan.hypothesis}
          </div>
          <SectionMeta section={plan.executive_summary} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm h-full flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">Confidence & Notes</h3>
          <p className="text-sm leading-relaxed text-slate-700 flex-1">{plan.confidence_notes.content}</p>
          <div className="mt-4 pt-4 border-t border-border/40">
            <Badge className="font-mono bg-accent/10 text-accent border-accent/20">
              CONFIDENCE: {Math.round(plan.confidence_notes.confidence * 100)}%
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtocolSection({ plan }: { plan: ExperimentPlan }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-black tracking-tight">Protocol</h3>
      </div>
      <ol className="relative border-s border-muted-foreground/20 ml-3 space-y-6">
        {plan.protocol_summary.content.map((item, i) => (
          <li key={i} className="ms-6">
            <span className="absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 ring-8 ring-white">
              <span className="text-xs font-bold text-primary">{i + 1}</span>
            </span>
            <div className="rounded-xl border border-border/60 bg-white p-4 shadow-sm">
              <p className="text-sm leading-relaxed text-slate-700">{item}</p>
            </div>
          </li>
        ))}
      </ol>
      <SectionMeta section={plan.protocol_summary} className="mt-8" />
    </section>
  );
}

function MaterialsSection({ plan }: { plan: ExperimentPlan }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Beaker className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-black tracking-tight">Materials</h3>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {plan.materials.content.map((material) => (
          <a
            key={`${material.item}-${material.evidence_url}`}
            href={material.evidence_url}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col rounded-xl border border-border/60 bg-white p-5 text-sm transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-bold text-foreground group-hover:text-primary transition-colors text-base">{material.item}</div>
              <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs px-2 py-0.5 whitespace-nowrap">
                EST: ${material.estimated_cost.toLocaleString()}
              </Badge>
            </div>
            <p className="leading-relaxed text-slate-600 mb-4 flex-1">{material.purpose}</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-muted/20 p-2.5 rounded-md mt-auto">
              <div className="text-muted-foreground">
                <span className="font-bold text-slate-700 block mb-1">SUPPLIER</span> {material.supplier_hint}
              </div>
              <div className="text-muted-foreground">
                <span className="font-bold text-slate-700 block mb-1">CATALOG</span> {material.catalog_number}
              </div>
            </div>
          </a>
        ))}
      </div>
      <SectionMeta section={plan.materials} />
    </section>
  );
}

function BudgetSection({ plan, totalCost }: { plan: ExperimentPlan; totalCost: number }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div className="flex items-center gap-2">
          <BadgeDollarSign className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-black tracking-tight">Budget</h3>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Cost</div>
          <div className="text-2xl font-black font-mono text-primary">${totalCost.toLocaleString()}</div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground border-b border-border/60">
            <tr>
              <th className="px-5 py-3 font-bold">Category</th>
              <th className="px-5 py-3 font-bold">Item</th>
              <th className="px-5 py-3 font-bold text-right">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {plan.budget.content.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-700">{item.category}</td>
                <td className="px-5 py-4">
                  <div className="font-bold text-slate-900">{item.item}</div>
                  <div className="text-xs text-muted-foreground mt-1">{item.notes}</div>
                </td>
                <td className="px-5 py-4 text-right font-mono font-bold text-primary whitespace-nowrap">
                  ${item.estimated_cost.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SectionMeta section={plan.budget} />
    </section>
  );
}

function TimelineSection({ plan }: { plan: ExperimentPlan }) {
  return (
    <section>
      <div className="mb-6 flex items-center gap-2">
        <Clock3 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-black tracking-tight">Timeline</h3>
      </div>

      <div className="space-y-6">
        {plan.timeline.content.map((item, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-4 relative">
            {i !== plan.timeline.content.length - 1 && (
              <div className="hidden sm:block absolute left-[8.5rem] top-8 bottom-[-1.5rem] w-0.5 bg-border/60 -z-10"></div>
            )}

            <div className="sm:w-36 shrink-0 pt-1 z-10">
              <div className="bg-accent text-white text-center rounded-md py-1.5 px-3 font-mono text-xs font-bold shadow-sm">
                {item.duration}
              </div>
            </div>

            <div className="flex-1 rounded-xl border border-border/60 bg-white p-5 shadow-sm">
              <h4 className="font-bold text-base mb-2 text-slate-900">{item.phase}</h4>
              <p className="leading-relaxed text-slate-600 text-sm mb-4">{item.deliverable}</p>

              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 px-2 py-1 rounded">Dependencies</span>
                <div className="flex flex-wrap gap-1.5">
                  {item.dependencies.length > 0 ? (
                    item.dependencies.map((dep) => (
                      <span key={dep} className="text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                        {dep}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5">NONE</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <SectionMeta section={plan.timeline} className="mt-8" />
    </section>
  );
}

function ValidationSection({ plan }: { plan: ExperimentPlan }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <TestTube2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-black tracking-tight">Validation</h3>
      </div>
      <div className="grid gap-4">
        {plan.validation.content.map((item, i) => (
          <div key={i} className="flex gap-4 rounded-xl border border-border/60 bg-white p-5 shadow-sm">
            <div className="mt-0.5 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-slate-900 text-base mb-1">{item.metric}</div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3">
                <div className="flex-1 bg-emerald-50 text-emerald-900 border border-emerald-200 p-2.5 rounded-md text-sm">
                  <span className="font-bold text-[10px] uppercase tracking-wider block mb-1 opacity-70">Target Threshold</span>
                  {item.success_threshold}
                </div>
                <div className="flex-1 bg-slate-50 border border-border/40 p-2.5 rounded-md text-sm">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Measurement Method</span>
                  <span className="font-mono text-xs">{item.measurement_method}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <SectionMeta section={plan.validation} />
    </section>
  );
}

function RisksSection({ plan }: { plan: ExperimentPlan }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-black tracking-tight">Risks and Safety</h3>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="flex items-center gap-2 mb-4 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <h4 className="text-sm font-bold uppercase tracking-wider">Risks & Assumptions</h4>
          </div>
          <div className="space-y-3">
            {plan.risks_and_assumptions.content.map((item, i) => (
              <div key={i} className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 shadow-sm text-sm leading-relaxed text-amber-900 border-l-4 border-l-amber-400">
                {item}
              </div>
            ))}
          </div>
          <SectionMeta section={plan.risks_and_assumptions} className="mt-4" />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4 text-rose-600">
            <ShieldAlert className="h-5 w-5" />
            <h4 className="text-sm font-bold uppercase tracking-wider">Safety & Ethics</h4>
          </div>
          <div className="space-y-3">
            {plan.safety_and_ethics_notes.content.map((item, i) => (
              <div key={i} className="rounded-xl border border-rose-200/60 bg-rose-50/50 p-4 shadow-sm text-sm leading-relaxed text-rose-900 border-l-4 border-l-rose-400">
                {item}
              </div>
            ))}
          </div>
          <SectionMeta section={plan.safety_and_ethics_notes} className="mt-4" />
        </section>
      </div>
    </section>
  );
}

function SourcesSection({ plan }: { plan: ExperimentPlan }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-black tracking-tight">Sources</h3>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {plan.source_trace.map((source, i) => (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col rounded-xl border border-border/60 bg-white p-5 transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm leading-snug">{source.title}</div>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-40 group-hover:opacity-100 text-primary" />
            </div>
            <div className="mt-auto bg-slate-50 border border-border/40 p-2.5 rounded-md">
              <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Source Link</span>
              <div className="font-mono text-[10px] text-slate-600 truncate">{source.source}</div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function LiteratureSection({ qc, mock }: { qc?: LiteratureQC | null; mock?: boolean }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Radar className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-black tracking-tight">Literature</h3>
      </div>
      {qc ? (
        <LiteratureQCPanel qc={qc} demo={mock} compact={true} />
      ) : (
        <div className="rounded-xl border border-border/60 bg-white p-5 text-sm text-muted-foreground shadow-sm">
          Literature QC context is not attached to this plan view.
        </div>
      )}
    </section>
  );
}

function PlanContextNav({
  activeSection,
  onChange,
  qc,
}: {
  activeSection: PlanContextSection;
  onChange: (section: PlanContextSection) => void;
  qc?: LiteratureQC | null;
}) {
  return (
    <div className="sticky top-24 z-20 mb-8 rounded-xl border border-border/60 bg-white/90 p-2 shadow-sm backdrop-blur-md">
      <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Plan sections
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {planContextSections.map((section) => {
          const isActive = section.id === activeSection;
          const isDisabled = section.id === "literature" && !qc;
          return (
            <button
              key={section.id}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) onChange(section.id);
              }}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all",
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : isDisabled
                  ? "cursor-not-allowed text-slate-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ExperimentPlanViewer({
  plan,
  loading,
  mock,
  qc,
  mode = "experiment_plan",
  onRegenerate,
}: {
  plan: ExperimentPlan | null;
  loading?: boolean;
  mock?: boolean;
  qc?: LiteratureQC | null;
  mode?: ExperimentPlanViewerMode;
  onRegenerate?: (newPlan: ExperimentPlan) => void;
}) {
  const [activePlanSection, setActivePlanSection] = useState<PlanContextSection>("protocol");

  if (loading || !plan) {
    return null;
  }

  const totalCost = plan.budget.content.reduce((acc, item) => acc + item.estimated_cost, 0);

  if (mode === "lab_view") {
    return (
      <Card className="overflow-hidden flex flex-col shadow-soft">
        <PlanHeader plan={plan} mock={mock} mode={mode} />
        <div className="bg-slate-50/50 p-3 sm:p-5 xl:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Edit the conceptual workflow here. Layout, learn mode, node review, and graph-driven regeneration stay local to this workspace.
            </p>
            {plan.updated_sections && plan.updated_sections.length > 0 ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full">
                <RefreshCw className="w-3 h-3" />
                Plan updated · {plan.updated_sections.join(", ")}
              </div>
            ) : null}
          </div>
          <LabViewCanvas
            workflow={plan.lab_workflow}
            plan={plan}
            hypothesis={plan.hypothesis}
            onRegenerate={onRegenerate}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden flex flex-col shadow-soft">
      <PlanHeader plan={plan} mock={mock} mode={mode} />
      <div className="bg-slate-50/50 p-5 xl:p-8">
        <div className="space-y-8">
          <PlanOverview plan={plan} />
          <PlanContextNav activeSection={activePlanSection} onChange={setActivePlanSection} qc={qc} />
          <div className="rounded-xl border border-border/60 bg-white/40 p-4 shadow-sm">
            {activePlanSection === "protocol" ? <ProtocolSection plan={plan} /> : null}
            {activePlanSection === "literature" ? <LiteratureSection qc={qc} mock={mock} /> : null}
            {activePlanSection === "materials" ? <MaterialsSection plan={plan} /> : null}
            {activePlanSection === "budget" ? <BudgetSection plan={plan} totalCost={totalCost} /> : null}
            {activePlanSection === "timeline" ? <TimelineSection plan={plan} /> : null}
            {activePlanSection === "validation" ? <ValidationSection plan={plan} /> : null}
            {activePlanSection === "risks" ? <RisksSection plan={plan} /> : null}
            {activePlanSection === "sources" ? <SourcesSection plan={plan} /> : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
