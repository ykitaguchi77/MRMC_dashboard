"use client";

import {
  DIAGNOSIS_CLASSES,
  UNCLEAR_OPTION,
} from "@/lib/constants/diagnosis-classes";
import { cn } from "@/lib/utils";
import type { DiagnosisClass } from "@/lib/types";

type AIValue = DiagnosisClass | "unclear";

interface AIDiagnosisGridProps {
  value: AIValue | null;
  onChange: (value: AIValue) => void;
}

export function AIDiagnosisGrid({ value, onChange }: AIDiagnosisGridProps) {
  const options = [
    ...DIAGNOSIS_CLASSES,
    UNCLEAR_OPTION,
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">
        AIの診断 / AI Diagnosis
      </h3>
      <p className="text-xs text-muted-foreground">
        スマホで見たAIの判定を選択してください / Select the AI diagnosis you saw on the phone
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id as AIValue)}
            className={cn(
              "rounded-lg border-2 px-3 py-3 text-center text-sm font-medium transition-colors",
              "hover:border-blue-400/50 hover:bg-blue-50",
              value === opt.id
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-border bg-background text-foreground",
              opt.id === "unclear" && "col-span-1"
            )}
          >
            <div className="font-medium">{opt.ja}</div>
            <div className="text-xs text-muted-foreground">{opt.en}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
