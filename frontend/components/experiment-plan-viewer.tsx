import { useState } from "react";
import type { ElementType } from "react";
import { Badge, Card } from "@/components/ui";
import type { ExperimentPlan, LiteratureQC } from "@/lib/types";
import {
  BadgeDollarSign,
  Beaker,
  ClipboardList,
  Clock3,
  FlaskConical,
  Link2,
  ShieldAlert,
  TestTube2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Radar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroundedSection } from "@/lib/types";

import { LiteratureQCPanel } from "./literature-qc-panel";

type PlanTab = "protocol" | "materials" | "budget" | "timeline" | "validation" | "risks" | "sources" | "literature";

const tabs: { id: PlanTab; label: string; icon: ElementType }[] = [
  { id: "protocol", label: "Protocol", icon: FlaskConical },
  { id: "literature", label: "Literature", icon: Radar },
  { id: "materials", label: "Materials", icon: Beaker },
  { id: "budget", label: "Budget", icon: BadgeDollarSign },
  { id: "timeline", label: "Timeline", icon: Clock3 },
  { id: "validation", label: "Validation", icon: TestTube2 },
  { id: "risks", label: "Risks", icon: ShieldAlert },
  { id: "sources", label: "Sources", icon: Link2 },
];

function SectionMeta({ section, className }: { section: GroundedSection<unknown>, className?: string }) {
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

export function ExperimentPlanViewer({ plan, loading, mock, qc }: { plan: ExperimentPlan | null; loading?: boolean; mock?: boolean; qc?: LiteratureQC | null }) {
  const [activeTab, setActiveTab] = useState<PlanTab>("protocol");

  if (loading || !plan) {
    return null; // Handled by page.tsx
  }

  // Calculate budget total
  const totalCost = plan.budget.content.reduce((acc, item) => acc + item.estimated_cost, 0);

  return (
    <Card className="overflow-hidden flex flex-col shadow-soft">
      {/* Top Section: Executive Summary & Badges */}
      <div className="border-b border-border/60 bg-white/90 p-5 xl:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-2">
              <ClipboardList className="h-4 w-4" />
              Experiment Plan
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">{plan.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {mock ? <Badge className="border-amber-200 bg-amber-50 text-amber-900 font-mono">MOCK_DATA</Badge> : null}
            <Badge className="bg-emerald-50 text-emerald-900 border-emerald-200 font-mono">QC PASSED</Badge>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm h-full">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">Executive Summary</h3>
              <p className="text-sm leading-relaxed text-slate-700">{plan.executive_summary.content}</p>
              <div className="mt-4 rounded-md border border-primary/10 bg-primary/5 p-4 text-sm leading-relaxed font-medium text-primary-foreground/90 text-slate-800 border-l-4 border-l-primary">
                <span className="font-bold block mb-1 text-xs uppercase tracking-wider text-primary">Target Hypothesis</span> 
                {plan.hypothesis}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm h-full flex flex-col">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">Confidence & Notes</h3>
              <p className="text-sm leading-relaxed text-slate-700 flex-1">{plan.confidence_notes.content}</p>
              <div className="mt-4 pt-4 border-t border-border/40">
                <Badge className="font-mono bg-accent/10 text-accent border-accent/20">CONFIDENCE: {Math.round(plan.confidence_notes.confidence * 100)}%</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row flex-1">
        {/* Sidebar Rail */}
        <div className="border-b xl:border-b-0 xl:border-r border-border/60 bg-white/40 xl:w-56 shrink-0 flex flex-row xl:flex-col overflow-x-auto xl:overflow-visible p-2 gap-1">
          {tabs.map((tab) => {
            if (!qc && tab.id === "literature") return null;
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isUpdated = plan.updated_sections?.includes(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold transition-all text-left uppercase tracking-wider",
                  isActive
                    ? "bg-white text-primary shadow-sm border border-border/60"
                    : isUpdated
                    ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    : "text-muted-foreground hover:bg-white/60 hover:text-foreground border border-transparent",
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground/70")} />
                {tab.label}
                {isUpdated && (
                  <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 bg-slate-50/50 p-5 xl:p-8 min-w-0">
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            {activeTab === "protocol" ? (
              <div className="space-y-4">
                <h3 className="text-lg font-black tracking-tight mb-4">Experimental Protocol</h3>
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
              </div>
            ) : null}

            {activeTab === "literature" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black tracking-tight">Literature Review</h3>
                </div>
                <div className="rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 px-4 py-3 text-sm font-medium flex items-center gap-2 mb-6">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  This literature review was used to ground the generated experiment plan.
                </div>
                <LiteratureQCPanel qc={qc || null} demo={mock} compact={true} />
              </div>
            ) : null}

            {activeTab === "materials" ? (
              <div>
                <h3 className="text-lg font-black tracking-tight mb-4">Required Materials</h3>
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
                        <div className="text-muted-foreground"><span className="font-bold text-slate-700 block mb-1">SUPPLIER</span> {material.supplier_hint}</div>
                        <div className="text-muted-foreground"><span className="font-bold text-slate-700 block mb-1">CATALOG</span> {material.catalog_number}</div>
                      </div>
                    </a>
                  ))}
                </div>
                <SectionMeta section={plan.materials} />
              </div>
            ) : null}

            {activeTab === "budget" ? (
              <div>
                <div className="flex items-end justify-between mb-4">
                  <h3 className="text-lg font-black tracking-tight">Estimated Budget</h3>
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
              </div>
            ) : null}

            {activeTab === "timeline" ? (
              <div>
                <h3 className="text-lg font-black tracking-tight mb-6">Execution Timeline</h3>
                
                <div className="space-y-6">
                  {plan.timeline.content.map((item, i) => (
                    <div key={i} className="flex flex-col sm:flex-row gap-4 relative">
                      {/* Connector Line */}
                      {i !== plan.timeline.content.length - 1 && (
                        <div className="hidden sm:block absolute left-[8.5rem] top-8 bottom-[-1.5rem] w-0.5 bg-border/60 -z-10"></div>
                      )}
                      
                      {/* Duration Bubble */}
                      <div className="sm:w-36 shrink-0 pt-1 z-10">
                        <div className="bg-accent text-white text-center rounded-md py-1.5 px-3 font-mono text-xs font-bold shadow-sm">
                          {item.duration}
                        </div>
                      </div>
                      
                      {/* Content Card */}
                      <div className="flex-1 rounded-xl border border-border/60 bg-white p-5 shadow-sm">
                        <h4 className="font-bold text-base mb-2 text-slate-900">{item.phase}</h4>
                        <p className="leading-relaxed text-slate-600 text-sm mb-4">{item.deliverable}</p>
                        
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 px-2 py-1 rounded">Dependencies</span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.dependencies.length > 0 ? (
                              item.dependencies.map(dep => (
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
              </div>
            ) : null}

            {activeTab === "validation" ? (
              <div>
                <h3 className="text-lg font-black tracking-tight mb-4">Validation Checklist</h3>
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
              </div>
            ) : null}

            {activeTab === "risks" ? (
              <div>
                <h3 className="text-lg font-black tracking-tight mb-4">Risk Assessment</h3>
                <div className="grid gap-6 lg:grid-cols-2">
                  <section>
                    <div className="flex items-center gap-2 mb-4 text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Risks & Assumptions</h3>
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
                      <h3 className="text-sm font-bold uppercase tracking-wider">Safety & Ethics</h3>
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
              </div>
            ) : null}

            {activeTab === "sources" ? (
              <div>
                <h3 className="text-lg font-black tracking-tight mb-4">Reference Sources</h3>
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
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
