"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const qcSteps = [
  "Decomposing hypothesis...",
  "Searching prior work...",
  "Analyzing novelty signals...",
];

const planSteps = [
  "Checking protocol repositories...",
  "Estimating materials and budget...",
  "Building validation plan...",
  "Drafting final experiment plan...",
];

export function ScientificLoader({ type }: { type: "qc" | "plan" }) {
  const steps = type === "qc" ? qcSteps : planSteps;
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <div className="text-sm font-semibold text-primary">{steps[currentStep]}</div>
      <div className="mt-4 w-48 h-1.5 overflow-hidden rounded-full bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-1000 ease-in-out" 
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} 
        />
      </div>
    </div>
  );
}
