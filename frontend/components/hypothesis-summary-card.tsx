import * as React from "react";
import { Card, Badge, Button } from "@/components/ui";
import type { ParsedHypothesis } from "@/lib/types";
import { AlertCircle, CheckCircle2, ChevronRight, X, AlertTriangle } from "lucide-react";

interface HypothesisSummaryCardProps {
  hypothesis: string;
  domain?: string | null;
  constraints?: string | null;
  parsedHypothesis?: ParsedHypothesis | null;
  suggestedHypothesis?: string | null;
  hasPlan?: boolean;
  onApplySuggested: () => void;
  onDismissSuggested: () => void;
}

export function HypothesisSummaryCard({
  hypothesis,
  domain,
  constraints,
  parsedHypothesis,
  suggestedHypothesis,
  hasPlan,
  onApplySuggested,
  onDismissSuggested,
}: HypothesisSummaryCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-4 bg-white/80 backdrop-blur-sm border-border shadow-sm sticky top-4 z-10">
      <div className="space-y-1.5">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Current Hypothesis
        </h4>
        <p className="text-sm font-medium text-slate-800 leading-relaxed">
          {hypothesis || "No hypothesis defined yet. Type one below."}
        </p>
      </div>

      {suggestedHypothesis && (
        <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 shadow-sm transition-all">
          <div className="flex items-center gap-2 text-indigo-700 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Suggested Revision</span>
          </div>
          <p className="text-sm text-indigo-900 leading-relaxed bg-white/60 p-2 rounded border border-indigo-100 italic">
            {suggestedHypothesis}
          </p>
          {hasPlan && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Applying a new hypothesis will discard your current experiment plan.
            </div>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button
              onClick={onDismissSuggested}
              className="h-8 text-xs px-3 bg-white hover:bg-slate-50 border-indigo-200 text-indigo-700 shadow-sm"
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Dismiss
            </Button>
            <Button
              onClick={onApplySuggested}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-8 text-xs px-3"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Apply Revision
            </Button>
          </div>
        </div>
      )}

      {parsedHypothesis && (
        <div className="mt-2 pt-3 border-t border-border/40">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(parsedHypothesis)
              .filter(([_, value]) => Boolean(value))
              .map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs"
                  title={value as string}
                >
                  <span className="font-mono text-[9px] uppercase text-muted-foreground font-bold">
                    {key.replace("_", " ")}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-300" />
                  <span className="text-slate-700 truncate max-w-[120px]">
                    {value}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}
