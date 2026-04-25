"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Input, SecondaryButton, Select, Textarea } from "@/components/ui";
import { getFeedback, regenerateWithFeedback, submitFeedback } from "@/lib/api";
import type { ExperimentPlan, FeedbackRecord, ScientistFeedback } from "@/lib/types";
import { MessageSquareText, RefreshCw, Send } from "lucide-react";

const sections = ["summary", "protocol", "materials", "budget", "timeline", "validation", "risks", "sources"];

export function ScientistReviewPanel({
  hypothesis,
  plan,
  onPlanUpdated,
}: {
  hypothesis: string;
  plan: ExperimentPlan | null;
  onPlanUpdated: (plan: ExperimentPlan) => void;
}) {
  const [section, setSection] = useState("validation");
  const [rating, setRating] = useState(4);
  const [correction, setCorrection] = useState("");
  const [tags, setTags] = useState("controls, feasibility");
  const [history, setHistory] = useState<FeedbackRecord[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getFeedback().then(setHistory).catch(() => setHistory([]));
  }, []);

  async function saveFeedback(event: FormEvent) {
    event.preventDefault();
    if (!hypothesis || !correction.trim()) return;
    setBusy(true);
    try {
      const saved = await submitFeedback(buildFeedback());
      setHistory((items) => [saved, ...items]);
      setCorrection("");
    } finally {
      setBusy(false);
    }
  }

  async function regenerate() {
    if (!plan || !correction.trim()) return;
    setBusy(true);
    try {
      const response = await regenerateWithFeedback(hypothesis, plan, buildFeedback());
      onPlanUpdated(response);
    } finally {
      setBusy(false);
    }
  }

  function buildFeedback(): ScientistFeedback {
    return {
      plan_id: plan ? `${plan.title}:${plan.hypothesis.slice(0, 32)}` : "draft-plan",
      section,
      rating,
      correction,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      hypothesis: hypothesis,
      parsed_domain: "",
      experiment_type: "",
    };
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquareText className="h-4 w-4" />
            Scientist Review
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Capture PI notes and regenerate the plan from structured feedback.</p>
        </div>
      </div>
      <form className="mt-4 space-y-3" onSubmit={saveFeedback}>
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <Select value={section} onChange={(event) => setSection(event.target.value)} aria-label="Section">
            {sections.map((name) => (
              <option key={name} value={name}>
                {name[0].toUpperCase() + name.slice(1)}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            min={1}
            max={5}
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            aria-label="Rating"
          />
        </div>
        <Input value={tags} onChange={(event) => setTags(event.target.value)} aria-label="Tags" placeholder="comma-separated tags" />
        <Textarea
          value={correction}
          onChange={(event) => setCorrection(event.target.value)}
          placeholder="Add correction, missing controls, risk flags, or regeneration guidance."
        />
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || !correction.trim() || !hypothesis} type="submit">
            <Send className="h-4 w-4" />
            Save feedback
          </Button>
          <SecondaryButton disabled={busy || !correction.trim() || !plan} type="button" onClick={regenerate}>
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </SecondaryButton>
        </div>
      </form>
      <div className="mt-5 space-y-3">
        {history.slice(0, 4).map((item) => (
          <div key={item.id} className="rounded-md border border-border bg-white p-3">
            <div className="flex justify-between gap-3 text-xs font-semibold text-muted-foreground">
              <span>{item.section} · {item.rating}/5</span>
              <span>{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            <p className="mt-2 text-sm">{item.correction}</p>
            <p className="mt-2 text-xs text-muted-foreground">{item.tags.join(", ")}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
