"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, SecondaryButton } from "@/components/ui";
import { ExecutionWorkspace } from "@/components/execution-workspace";
import { ScientificLoader } from "@/components/scientific-loader";
import { getExecutionPlan } from "@/lib/api";
import { demoExecutionPlan } from "@/lib/demo-data";
import type { ExecutionPlan } from "@/lib/types";
import { FlaskConical, RefreshCcw } from "lucide-react";

export default function PlanExecutionPage() {
  const params = useParams<{ planId: string }>();
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPlan() {
      setLoading(true);
      setError(null);
      setFallbackMode(false);
      try {
        const response = await getExecutionPlan(params.planId);
        if (!cancelled) {
          setPlan(response);
        }
      } catch (err) {
        if (!cancelled) {
          setPlan(demoExecutionPlan(params.planId));
          setFallbackMode(true);
          setError(err instanceof Error ? err.message : "Execution plan not found");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPlan();
    return () => {
      cancelled = true;
    };
  }, [params.planId]);

  if (plan) {
    return (
      <>
        {fallbackMode ? (
          <div className="sticky top-0 z-20 border-b border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 backdrop-blur">
            <div className="mx-auto max-w-7xl">
              Demo fallback is active. Backend execution data was unavailable, so this workspace is showing polished sample data for the hackathon demo.
            </div>
          </div>
        ) : null}
        <ExecutionWorkspace initialPlan={plan} />
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-xl bg-white/80 p-6 text-center">
        {loading ? (
          <ScientificLoader type="plan" />
        ) : (
          <>
            <FlaskConical className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <h1 className="text-xl font-black tracking-tight text-slate-950">Execution workspace unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {error ?? "This execution workspace could not be loaded right now."}
            </p>
            <div className="mt-5 flex justify-center">
              <SecondaryButton type="button" onClick={() => window.location.reload()}>
                <RefreshCcw className="h-4 w-4" />
                Retry
              </SecondaryButton>
            </div>
          </>
        )}
      </Card>
    </main>
  );
}
