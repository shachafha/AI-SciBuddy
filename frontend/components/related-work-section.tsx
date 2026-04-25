import * as React from "react";
import type { LiteratureQC } from "@/lib/types";
import { LiteratureQCPanel } from "@/components/literature-qc-panel";
import { Button } from "@/components/ui";
import { Loader2, FileText } from "lucide-react";

interface RelatedWorkSectionProps {
  qc: LiteratureQC | null;
  loadingQC: boolean;
  demo: boolean;
  onGeneratePlan: () => void;
  generatingPlan: boolean;
}

export function RelatedWorkSection({ qc, loadingQC, demo, onGeneratePlan, generatingPlan }: RelatedWorkSectionProps) {
  return (
    <div className="mt-8 flex flex-col gap-4">
      <div className="border-b border-border/50 pb-2 mb-2">
        <h3 className="text-lg font-semibold text-slate-800">Related work and novelty review</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Scroll through the search results, overlap scores, and source trace. Ask the chat above to explain or refine anything.
        </p>
      </div>

      <LiteratureQCPanel qc={qc} loading={loadingQC} demo={demo} />

      {qc && !loadingQC && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={onGeneratePlan}
            disabled={generatingPlan}
            className="w-full sm:w-auto font-medium shadow-md shadow-primary/10"
          >
            {generatingPlan ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Draft...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Experiment Plan
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
