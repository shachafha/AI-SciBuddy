"use client";

import { FormEvent, useState } from "react";
import { Button, Card, Input, SecondaryButton, Textarea } from "@/components/ui";
import { ExperimentPlanViewer } from "@/components/experiment-plan-viewer";
import { LiteratureQCPanel } from "@/components/literature-qc-panel";
import { ScientistReviewPanel } from "@/components/scientist-review-panel";
import { generatePlan, runLiteratureQC } from "@/lib/api";
import { demoExperimentPlan, demoLiteratureQC, sampleHypotheses } from "@/lib/demo-data";
import type { ExperimentPlan, LiteratureQC } from "@/lib/types";
import { ArrowRight, FlaskConical, Loader2, Search, Sparkles } from "lucide-react";

export default function Home() {
  const [hypothesis, setHypothesis] = useState("A low-dose senolytic pretreatment improves mitochondrial recovery after oxidative stress in aged fibroblasts.");
  const [domain, setDomain] = useState("cell biology");
  const [constraints, setConstraints] = useState("Use safe, high-level protocol detail only.");
  const [qc, setQc] = useState<LiteratureQC | null>(null);
  const [plan, setPlan] = useState<ExperimentPlan | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [busy, setBusy] = useState<"qc" | "plan" | "both" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = { hypothesis, domain: domain || undefined, constraints: constraints || undefined };

  async function runQc(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    setPlan(null);
    setBusy("qc");
    try {
      const response = await runLiteratureQC(input);
      setQc(response);
      setDemoMode(false);
    } catch (err) {
      setQc(demoLiteratureQC(hypothesis));
      setDemoMode(true);
      setError(null);
    } finally {
      setBusy(null);
    }
  }

  async function runPlanOnly() {
    setError(null);
    setBusy("plan");
    try {
      const response = await generatePlan(input, qc);
      setPlan(response);
      setDemoMode(false);
    } catch (err) {
      setPlan(demoExperimentPlan(hypothesis, qc));
      setDemoMode(true);
      setError(null);
    } finally {
      setBusy(null);
    }
  }

  const isBusy = busy !== null;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <FlaskConical className="h-5 w-5" />
              AI SciBuddy
            </div>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-normal sm:text-5xl">
              Scientific planning, grounded in prior work.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Search papers and protocols, flag novelty risk, then draft a PI-review-ready experiment plan with safety notes and source trace.
            </p>
          </div>
          <div className="rounded-md border border-border bg-white px-4 py-3 text-sm text-muted-foreground shadow-soft">
            FastAPI · Next.js · Tavily · Ollama/Gemma
            {demoMode ? <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Demo data</span> : null}
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="space-y-6">
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-white/90 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Hypothesis Intake
                </div>
              </div>
              <form onSubmit={runQc} className="space-y-4 p-5">
                <div>
                  <label className="text-sm font-semibold" htmlFor="sample">
                    Sample hypotheses
                  </label>
                  <select
                    id="sample"
                    className="mt-2 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 transition focus:ring-4"
                    defaultValue=""
                    onChange={(event) => {
                      const sample = sampleHypotheses.find((item) => item.label === event.target.value);
                      if (!sample) return;
                      setHypothesis(sample.hypothesis);
                      setDomain(sample.domain);
                      setConstraints(sample.constraints);
                      setQc(null);
                      setPlan(null);
                      setDemoMode(false);
                    }}
                  >
                    <option value="" disabled>
                      Choose a demo hypothesis...
                    </option>
                    {sampleHypotheses.map((sample) => (
                      <option key={sample.label} value={sample.label}>
                        {sample.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold" htmlFor="hypothesis">
                    Scientific hypothesis
                  </label>
                  <Textarea
                    id="hypothesis"
                    value={hypothesis}
                    onChange={(event) => setHypothesis(event.target.value)}
                    placeholder="Enter a falsifiable scientific hypothesis..."
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold" htmlFor="domain">
                    Field or domain
                  </label>
                  <Input id="domain" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="immunology, materials science..." />
                </div>
                <div>
                  <label className="text-sm font-semibold" htmlFor="constraints">
                    Constraints
                  </label>
                  <Input id="constraints" value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder="budget, assay limits, safety constraints..." />
                </div>
                {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
                <div className="flex flex-wrap gap-2">
                  <Button disabled={isBusy || hypothesis.length < 8} type="submit" className="min-w-44">
                    {busy === "qc" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Run Literature QC
                  </Button>
                  <SecondaryButton disabled={isBusy || !qc || hypothesis.length < 8} type="button" onClick={runPlanOnly} className="min-w-52">
                    {busy === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Generate experiment plan
                  </SecondaryButton>
                </div>
              </form>
            </Card>

            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-muted-foreground">
              <div className="rounded-md border border-border bg-white px-3 py-2 text-primary">1. Hypothesis</div>
              <div className={qc ? "rounded-md border border-border bg-white px-3 py-2 text-primary" : "rounded-md border border-border bg-white/60 px-3 py-2"}>2. Literature QC</div>
              <div className={plan ? "rounded-md border border-border bg-white px-3 py-2 text-primary" : "rounded-md border border-border bg-white/60 px-3 py-2"}>3. Plan Review</div>
            </div>

            <LiteratureQCPanel qc={qc} loading={busy === "qc"} demo={demoMode} />
            <ScientistReviewPanel
              hypothesis={hypothesis}
              plan={plan}
              onPlanUpdated={(updated) => {
                setPlan(updated);
                setDemoMode(updated.confidence_notes.toLowerCase().includes("demo"));
              }}
            />
          </section>

          <section>
            <ExperimentPlanViewer
              plan={plan}
              loading={busy === "plan"}
              mock={demoMode || plan?.confidence_notes.toLowerCase().includes("demo")}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
