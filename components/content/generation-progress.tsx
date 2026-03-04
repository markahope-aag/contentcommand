"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { label: "Preparing brief data", duration: 2000 },
  { label: "Analyzing SERP competitors", duration: 8000 },
  { label: "Extracting semantic keywords", duration: 6000 },
  { label: "Building content prompt", duration: 2000 },
  { label: "Writing article with AI", duration: 40000 },
  { label: "Saving generated content", duration: 3000 },
];

interface GenerationProgressProps {
  isActive: boolean;
}

export function GenerationProgress({ isActive }: GenerationProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      setElapsed(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const totalElapsed = now - startTime;
      setElapsed(totalElapsed);

      // Advance step based on cumulative time
      let cumulative = 0;
      for (let i = 0; i < STEPS.length; i++) {
        cumulative += STEPS[i].duration;
        if (totalElapsed < cumulative) {
          setCurrentStep(i);
          return;
        }
      }
      // Stay on last step if we've exceeded all durations
      setCurrentStep(STEPS.length - 1);
    }, 500);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        {STEPS.map((step, i) => {
          const isDone = i < currentStep;
          const isCurrent = i === currentStep;

          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {isDone ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-muted" />
                )}
              </div>
              <span
                className={`text-sm ${
                  isDone
                    ? "text-muted-foreground line-through"
                    : isCurrent
                      ? "text-foreground font-medium"
                      : "text-muted-foreground/50"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Elapsed: {timeStr} — This typically takes 30–90 seconds
      </p>
    </div>
  );
}
