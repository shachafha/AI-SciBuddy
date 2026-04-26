"use client";

import { useEffect, useState } from "react";
import { getFeedback } from "@/lib/api";
import type { FeedbackRecord } from "@/lib/types";
import { ClipboardList, Star, History, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReviewLogViewer() {
  const [historyItems, setHistoryItems] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeedback()
      .then((items) => setHistoryItems(items))
      .catch(() => setHistoryItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[600px] flex-col items-center justify-center p-8 opacity-60">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
        <p className="mt-4 text-sm font-medium text-slate-500 uppercase tracking-wider">Loading history...</p>
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="flex h-[600px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-slate-50/50 p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 shadow-inner">
          <History className="h-8 w-8" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-700">No Review Log Yet</h3>
        <p className="max-w-sm text-sm text-slate-500 leading-relaxed">
          Active reviews and feedback notes will appear here. Use the Agent Panel on the right to submit manual reviews on plan sections or lab nodes.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 border-b border-border/40 pb-6">
        <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-800">
          <ClipboardList className="h-7 w-7 text-primary" />
          Review Log
        </h2>
        <p className="mt-2 text-sm text-slate-500">Historical log of all manual feedback and expert review corrections applied to the workspace.</p>
      </div>

      <div className="relative border-l-2 border-slate-200/60 pl-6 ml-4 space-y-10">
        {historyItems.map((item) => (
          <div key={item.id} className="relative">
            {/* Timeline marker */}
            <div className="absolute -left-[35px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-primary ring-4 ring-white" />
            
            <div className="group rounded-xl border border-border/60 bg-white p-5 shadow-sm transition-shadow hover:shadow-md hover:border-border">
              {/* Header */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {item.section}
                  </span>
                  <div className="flex items-center text-sm font-semibold text-slate-700">
                    <Calendar className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                    {new Date(item.created_at).toLocaleString(undefined, {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 rounded-md bg-amber-50 px-2 py-1 text-sm font-bold text-amber-600 border border-amber-100">
                  <Star className="mr-1 h-3.5 w-3.5 fill-current" />
                  {item.rating} <span className="text-amber-400/50 ml-0.5 text-xs font-normal">/ 5</span>
                </div>
              </div>

              {/* Body */}
              <div className="prose prose-sm prose-slate max-w-none text-slate-700 mb-4 whitespace-pre-wrap leading-relaxed">
                {item.correction}
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="rounded-md bg-accent/5 border border-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
