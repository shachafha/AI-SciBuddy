"use client";

import { useState } from "react";
import type { ElementType } from "react";
import { Badge, Card } from "@/components/ui";
import type { ExperimentPlan } from "@/lib/types";
import {
  BadgeDollarSign,
  Beaker,
  ClipboardList,
  Clock3,
  FileText,
  FlaskConical,
  Link2,
  ShieldAlert,
  TestTube2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroundedSection } from "@/lib/types";

type PlanTab = "summary" | "protocol" | "materials" | "budget" | "timeline" | "validation" | "risks" | "sources";

const tabs: { id: PlanTab; label: string; icon: ElementType }[] = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "protocol", label: "Protocol", icon: FlaskConical },
  { id: "materials", label: "Materials", icon: Beaker },
  { id: "budget", label: "Budget", icon: BadgeDollarSign },
  { id: "timeline", label: "Timeline", icon: Clock3 },
  { id: "validation", label: "Validation", icon: TestTube2 },
  { id: "risks", label: "Risks", icon: ShieldAlert },
  { id: "sources", label: "Sources", icon: Link2 },
];

function SectionMeta({ section }: { section: GroundedSection<unknown> }) {
  return (
    <div className="mt-4 rounded-md border border-border bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-white text-foreground">Confidence {Math.round(section.confidence * 100)}%</Badge>
        {section.supporting_sources.slice(0, 3).map((url) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">
            Source
          </a>
        ))}
      </div>
      {section.assumptions.length ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Assumptions: {section.assumptions.join(" ")}</p>
      ) : null}
    </div>
  );
}

function ListBlock({ section }: { section: GroundedSection<string[]> }) {
  return (
    <div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {section.content.map((item) => (
          <li key={item} className="rounded-md border border-border bg-white px-3 py-2 leading-6">
            {item}
          </li>
        ))}
      </ul>
      <SectionMeta section={section} />
    </div>
  );
}

export function ExperimentPlanViewer({ plan, loading, mock }: { plan: ExperimentPlan | null; loading?: boolean; mock?: boolean }) {
  const [activeTab, setActiveTab] = useState<PlanTab>("summary");

  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList className="h-4 w-4" />
          Generating experiment plan...
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList className="h-4 w-4" />
          Experiment Plan
        </div>
        <div className="mt-8 rounded-lg border border-dashed border-border bg-white/70 p-8 text-center">
          <p className="text-lg font-semibold">Plan workspace ready</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Run literature QC first, then generate a PI-review-ready plan with source trace, safety notes, and budget/timeline estimates.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-white/90 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ClipboardList className="h-4 w-4" />
              Experiment Plan
            </div>
            <h2 className="mt-2 text-2xl font-bold">{plan.title}</h2>
          </div>
          {mock ? <Badge className="border-amber-200 bg-amber-50 text-amber-900">Mock plan</Badge> : null}
        </div>
      </div>

      <div className="border-b border-border bg-muted/45 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isUpdated = plan.updated_sections?.includes(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition",
                  activeTab === tab.id
                    ? "border-primary bg-white text-primary shadow-sm"
                    : isUpdated
                    ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    : "border-transparent text-muted-foreground hover:bg-white",
                )}
              >
                <Icon className="h-4 w-4" />
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
      </div>

      <div className="p-5">
        {activeTab === "summary" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <section className="rounded-md border border-border bg-white p-4">
              <h3 className="text-sm font-semibold">Executive Summary</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.executive_summary.content}</p>
              <div className="mt-4 rounded-md bg-muted p-3 text-sm leading-6">{plan.hypothesis}</div>
              <SectionMeta section={plan.executive_summary} />
            </section>
            <section className="rounded-md border border-border bg-white p-4">
              <h3 className="text-sm font-semibold">Confidence Notes</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.confidence_notes.content}</p>
              <SectionMeta section={plan.confidence_notes} />
            </section>
          </div>
        ) : null}

        {activeTab === "protocol" ? <ListBlock section={plan.protocol_summary} /> : null}

        {activeTab === "materials" ? (
          <div>
            <div className="grid gap-3 md:grid-cols-2">
              {plan.materials.content.map((material) => (
                <a
                  key={`${material.item}-${material.evidence_url}`}
                  href={material.evidence_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-border bg-white p-4 text-sm transition hover:border-primary/60"
                >
                  <div className="font-semibold">{material.item}</div>
                  <p className="mt-2 leading-6 text-muted-foreground">{material.purpose}</p>
                  <div className="mt-3 text-xs text-muted-foreground">{material.supplier_hint}</div>
                  <div className="mt-2 text-xs text-muted-foreground">Catalog: {material.catalog_number}</div>
                  <Badge className="mt-3 bg-teal-50 text-teal-900">${material.estimated_cost.toLocaleString()}</Badge>
                </a>
              ))}
            </div>
            <SectionMeta section={plan.materials} />
          </div>
        ) : null}

        {activeTab === "budget" ? (
          <div>
            <div className="space-y-3">
              {plan.budget.content.map((item) => (
                <div key={`${item.category}-${item.item}`} className="rounded-md border border-border bg-white p-4 text-sm">
                  <div className="flex flex-wrap justify-between gap-3 font-semibold">
                    <span>{item.category}: {item.item}</span>
                    <span>${item.estimated_cost.toLocaleString()}</span>
                  </div>
                  <p className="mt-2 leading-6 text-muted-foreground">{item.notes}</p>
                </div>
              ))}
            </div>
            <SectionMeta section={plan.budget} />
          </div>
        ) : null}

        {activeTab === "timeline" ? (
          <div>
            <div className="space-y-3">
              {plan.timeline.content.map((item) => (
                <div key={`${item.phase}-${item.duration}`} className="rounded-md border border-border bg-white p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-semibold">{item.phase}</div>
                    <Badge>{item.duration}</Badge>
                  </div>
                  <p className="mt-2 leading-6 text-muted-foreground">{item.deliverable}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Dependencies: {item.dependencies.join(", ")}</p>
                </div>
              ))}
            </div>
            <SectionMeta section={plan.timeline} />
          </div>
        ) : null}

        {activeTab === "validation" ? (
          <div>
            <div className="grid gap-3 md:grid-cols-2">
              {plan.validation.content.map((item) => (
                <div key={item.metric} className="rounded-md border border-border bg-white p-4 text-sm">
                  <div className="font-semibold">{item.metric}</div>
                  <p className="mt-2 leading-6 text-muted-foreground">{item.success_threshold}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.measurement_method}</p>
                </div>
              ))}
            </div>
            <SectionMeta section={plan.validation} />
          </div>
        ) : null}

        {activeTab === "risks" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <section>
              <h3 className="mb-2 text-sm font-semibold">Risks and Assumptions</h3>
              <ListBlock section={plan.risks_and_assumptions} />
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold">Safety and Ethics</h3>
              <ListBlock section={plan.safety_and_ethics_notes} />
            </section>
          </div>
        ) : null}

        {activeTab === "sources" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {plan.source_trace.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border bg-white p-4 text-sm transition hover:border-primary/60"
              >
                <div className="font-semibold">{source.title}</div>
                <p className="mt-2 text-xs text-muted-foreground">{source.source}</p>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
