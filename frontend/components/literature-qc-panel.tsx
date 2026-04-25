import { Badge, Card } from "@/components/ui";
import type { LiteratureQC, ReferenceRubricScore } from "@/lib/types";
import { ExternalLink, Loader2, Radar } from "lucide-react";

const signalStyles = {
  not_found: "border-emerald-200 bg-emerald-50 text-emerald-900",
  similar_work_exists: "border-amber-200 bg-amber-50 text-amber-900",
  exact_match_found: "border-purple-200 bg-purple-50 text-purple-900",
};

const signalLabels = {
  not_found: "Not found",
  similar_work_exists: "Similar work exists",
  exact_match_found: "Exact match found",
};

function RubricMini({ score }: { score?: ReferenceRubricScore }) {
  if (!score) return null;
  const parts = [
    ["Intervention", score.intervention_match],
    ["System", score.system_match],
    ["Outcome", score.outcome_match],
    ["Method", score.method_protocol_match],
    ["Threshold/control", score.threshold_control_match],
  ];

  return (
    <div className="mt-3 rounded-md border border-border bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold uppercase text-muted-foreground">Rubric score</div>
        <Badge className="bg-white text-foreground">{score.total}/10</Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        {parts.map(([label, value]) => (
          <div key={label} className="rounded border border-border bg-white px-2 py-1">
            <div className="font-semibold">{value}/2</div>
            <div className="text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{score.rationale}</p>
    </div>
  );
}

export function LiteratureQCPanel({ qc, loading, demo }: { qc: LiteratureQC | null; loading?: boolean; demo?: boolean }) {
  if (loading) {
    return (
      <Card className="overflow-hidden p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Searching prior work and protocols...
        </div>
        <div className="mt-5 space-y-3">
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
          <div className="h-16 animate-pulse rounded-md bg-muted" />
          <div className="h-16 animate-pulse rounded-md bg-muted" />
        </div>
      </Card>
    );
  }

  if (!qc) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Radar className="h-4 w-4" />
          Literature QC
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Run literature QC to compare the hypothesis against papers and protocol sources.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Radar className="h-4 w-4" />
          Literature QC
        </div>
        <Badge className={signalStyles[qc.novelty_signal]}>{signalLabels[qc.novelty_signal]}</Badge>
      </div>
      {demo ? <Badge className="mt-3 border-amber-200 bg-amber-50 text-amber-900">Demo data</Badge> : null}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-accent" style={{ width: `${Math.round(qc.confidence * 100)}%` }} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{qc.summary}</p>
      {qc.parsed_hypothesis ? (
        <div className="mt-5 rounded-md border border-border bg-white p-3">
          <div className="text-xs font-bold uppercase text-muted-foreground">Hypothesis decomposition</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(qc.parsed_hypothesis)
              .filter(([, value]) => Boolean(value))
              .map(([key, value]) => (
                <Badge key={key} className="bg-slate-50 text-slate-700">
                  {key.replaceAll("_", " ")}: {value}
                </Badge>
              ))}
          </div>
          {qc.search_results?.length ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Generated 6 targeted searches and collected {qc.search_results.length} normalized results.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-5 space-y-3">
        {qc.references.map((reference) => (
          <a
            key={reference.url}
            href={reference.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-md border border-border bg-white p-3 transition hover:border-primary/60"
          >
            <div className="flex items-start justify-between gap-3 text-sm font-semibold">
              <span>{reference.title}</span>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{reference.source}</Badge>
              <Badge>{reference.evidence_type}</Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{reference.relevance_reason}</p>
            <RubricMini score={qc.reference_scores?.find((score) => score.url === reference.url)} />
          </a>
        ))}
      </div>
    </Card>
  );
}
