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
    <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 mb-3">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rubric match analysis</div>
        <Badge className="bg-white text-foreground shadow-sm font-mono">{score.total}/10 SCORE</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        {parts.map(([label, value]) => (
          <div key={label as string} className="rounded-md border border-border/60 bg-white p-2 shadow-sm flex flex-col justify-between">
            <div className="font-mono font-bold text-foreground mb-1">{value}/2</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground bg-white/50 p-2 rounded border border-border/40">{score.rationale}</p>
    </div>
  );
}

export function LiteratureQCPanel({ qc, loading, demo, compact }: { qc: LiteratureQC | null; loading?: boolean; demo?: boolean; compact?: boolean }) {
  if (loading) {
    return (
      <Card className="overflow-hidden p-6 shadow-soft border-primary/20 bg-gradient-to-br from-white to-primary/5">
        <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching prior work & protocols...
        </div>
        <div className="mt-6 space-y-4">
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-primary/20" />
          <div className="h-20 animate-pulse rounded-xl bg-white/60 border border-primary/10" />
          <div className="h-20 animate-pulse rounded-xl bg-white/60 border border-primary/10" />
        </div>
      </Card>
    );
  }

  if (!qc) {
    return (
      <Card className="p-6 shadow-soft bg-white/80 border-dashed border-border/80">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <Radar className="h-4 w-4" />
          Literature QC Pipeline
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Run literature QC to compare the hypothesis against papers and protocol sources. This acts as an automated PI review step.</p>
      </Card>
    );
  }

  return (
    <Card className={`shadow-soft border-border/60 bg-white/90 ${compact ? "p-0 border-0 shadow-none bg-transparent" : "p-6"}`}>
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-border/60 ${compact ? "pb-3 mb-3" : "pb-4 mb-4"}`}>
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
          <Radar className="h-4 w-4" />
          Literature QC Results
        </div>
        <div className="flex items-center gap-2">
          {demo ? <Badge className="border-amber-200 bg-amber-50 text-amber-900 font-mono text-xs">MOCK_DATA</Badge> : null}
          <Badge className={`${signalStyles[qc.novelty_signal]} font-mono uppercase tracking-wider`}>{signalLabels[qc.novelty_signal]}</Badge>
        </div>
      </div>
      
      <div className="mb-5">
        <div className="flex justify-between text-xs font-mono font-semibold mb-2">
          <span className="text-muted-foreground">QC CONFIDENCE SCORE</span>
          <span className="text-accent">{Math.round(qc.confidence * 100)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted/60 border border-border/40">
          <div className="h-full bg-accent transition-all duration-1000 ease-in-out" style={{ width: `${Math.round(qc.confidence * 100)}%` }} />
        </div>
      </div>
      
      <p className="mt-4 text-sm leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-xl border border-border/40">{qc.summary}</p>
      
      {qc.parsed_hypothesis ? (
        <div className="mt-6 rounded-xl border border-primary/10 bg-primary/5 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Hypothesis Decomposition Matrix</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(qc.parsed_hypothesis)
              .filter(([, value]) => Boolean(value))
              .map(([key, value]) => (
                <div key={key} className="bg-white border border-primary/10 rounded-md px-3 py-2 text-sm shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{key.replaceAll("_", " ")}</span>
                  <span className="font-medium text-slate-800">{value}</span>
                </div>
              ))}
          </div>
          {qc.search_results?.length ? (
            <p className="mt-4 text-xs font-mono text-muted-foreground flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Generated targeted searches & collected {qc.search_results.length} normalized vectors.
            </p>
          ) : null}
        </div>
      ) : null}
      
      <div className="mt-6 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Source Trace Analysis</h4>
        {qc.references.map((reference) => (
          <a
            key={reference.url}
            href={reference.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-border/60 bg-white p-5 transition-all hover:border-primary/40 hover:shadow-md group"
          >
            <div className="flex items-start justify-between gap-3 text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">
              <span className="leading-tight">{reference.title}</span>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-mono text-[10px] uppercase tracking-wider">{reference.source}</Badge>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 font-mono text-[10px] uppercase tracking-wider border-primary/20">{reference.evidence_type}</Badge>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground border-l-2 border-primary/20 pl-3 italic">{reference.relevance_reason}</p>
            <RubricMini score={qc.reference_scores?.find((score) => score.url === reference.url)} />
          </a>
        ))}
      </div>
    </Card>
  );
}
