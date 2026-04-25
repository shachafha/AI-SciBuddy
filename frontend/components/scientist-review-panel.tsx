"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Input, SecondaryButton, Select, Textarea } from "@/components/ui";
import { getFeedback, regenerateWithFeedback, submitFeedback } from "@/lib/api";
import type { ExperimentPlan, FeedbackRecord, ScientistFeedback } from "@/lib/types";
import { MessageSquareText, RefreshCw, Send, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const sections = ["summary", "protocol", "materials", "budget", "timeline", "validation", "risks", "sources", "lab_workflow"];

const quickTags = [
  "unrealistic timeline",
  "missing control",
  "wrong assay",
  "bad reagent",
  "cost too low",
  "safety issue",
  "unclear validation",
];

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [history, setHistory] = useState<FeedbackRecord[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getFeedback().then(setHistory).catch(() => setHistory([]));

    const handleFlagNode = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.node) {
        setSection("lab_workflow");
        setCorrection((prev) => prev ? `${prev}\n\nFlagged node [${detail.node.label}]: ` : `Flagged node [${detail.node.label}]: `);
        document.getElementById("scientist-review-panel")?.scrollIntoView({ behavior: "smooth" });
      }
    };
    window.addEventListener("flag-node", handleFlagNode);
    return () => window.removeEventListener("flag-node", handleFlagNode);
  }, []);

  async function saveFeedback(event: FormEvent) {
    event.preventDefault();
    if (!hypothesis || !correction.trim()) return;
    setBusy(true);
    try {
      const saved = await submitFeedback(buildFeedback());
      setHistory((items) => [saved, ...items]);
      setCorrection("");
      setSelectedTags([]);
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
      tags: selectedTags,
    };
  }

  return (
    <Card id="scientist-review-panel" className="mt-6 border-accent/20 bg-gradient-to-br from-white to-accent/5 overflow-hidden shadow-soft">
      <div className="border-b border-border/60 bg-white/80 p-5 xl:p-8">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-accent">
          <MessageSquareText className="h-4 w-4" />
          Expert Scientific Review
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Capture PI notes and regenerate the plan from structured feedback.</p>
      </div>
      
      <div className="p-5 xl:p-8">
        <form className="space-y-6" onSubmit={saveFeedback}>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Target Section</label>
              <Select value={section} onChange={(event) => setSection(event.target.value)} aria-label="Section" className="font-medium bg-white">
                {sections.map((name) => (
                  <option key={name} value={name}>
                    {name[0].toUpperCase() + name.slice(1)} Target
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Rating</label>
              <div className="flex items-center gap-1 bg-white border border-border/60 rounded-md p-1.5 shadow-sm">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={cn(
                      "p-1.5 rounded hover:bg-slate-50 transition-colors",
                      star <= rating ? "text-amber-500" : "text-slate-200"
                    )}
                  >
                    <Star className="h-5 w-5 fill-current" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Quick Tags</label>
            <div className="flex flex-wrap gap-2">
              {quickTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTags(selectedTags.filter(t => t !== tag));
                      } else {
                        setSelectedTags([...selectedTags, tag]);
                      }
                    }}
                    className={cn(
                      "text-[10px] font-mono uppercase px-2.5 py-1.5 rounded-md transition-colors font-bold",
                      isSelected 
                        ? "bg-accent/10 text-accent border border-accent/20 shadow-sm" 
                        : "bg-white text-slate-500 border border-border/60 hover:border-border hover:bg-slate-50"
                    )}
                  >
                    {isSelected ? "✓ " : "+ "}{tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Feedback Notes</label>
            <Textarea
              value={correction}
              onChange={(event) => setCorrection(event.target.value)}
              placeholder="Add correction, missing controls, risk flags, or regeneration guidance."
              className="border-accent/20 focus:ring-accent/20 focus:border-accent/40 bg-white min-h-[100px] text-sm leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-border/40">
            <Button disabled={busy || !correction.trim() || !hypothesis} type="submit" className="bg-slate-800 hover:bg-slate-900 text-white flex-1 sm:flex-none">
              <Send className="h-4 w-4 mr-2" />
              Save feedback
            </Button>
            <Button disabled={busy || !correction.trim() || !plan} type="button" onClick={regenerate} className="bg-accent hover:bg-accent/90 text-white shadow-md shadow-accent/20 flex-1 sm:flex-none">
              <RefreshCw className={cn("mr-2", busy ? "h-4 w-4 animate-spin" : "h-4 w-4")} />
              Regenerate with expert feedback
            </Button>
          </div>
        </form>
        
        {history.length > 0 && (
          <div className="mt-10 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">Feedback History</div>
            <div className="space-y-3">
              {history.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-xl border border-border/60 bg-white p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-accent/20"></div>
                  <div className="flex justify-between items-start gap-3 text-xs font-mono font-semibold text-muted-foreground mb-3 pl-2">
                    <span className="bg-muted/30 px-2 py-1 rounded text-primary border border-border/40">TARGET: {item.section.toUpperCase()}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-amber-500"><Star className="h-3 w-3 fill-current" /> {item.rating}/5</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-800 pl-2">{item.correction}</p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 pl-2">
                      {item.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-mono uppercase bg-accent/5 text-accent border border-accent/10 px-2 py-0.5 rounded">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
