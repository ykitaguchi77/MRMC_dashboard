"use client";

import { DIAGNOSIS_CLASSES } from "@/lib/constants/diagnosis-classes";
import { cn } from "@/lib/utils";
import type { DiagnosisClass } from "@/lib/types";

interface DiagnosisGridProps {
  label: string;
  value: DiagnosisClass | null;
  onChange: (value: DiagnosisClass) => void;
}

export function DiagnosisGrid({
  label,
  value,
  onChange,
}: DiagnosisGridProps) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold">{label}</h3>
      <div className="grid grid-cols-5 gap-1">
        {DIAGNOSIS_CLASSES.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded border-2 px-1 py-1.5 text-center transition-colors",
              "hover:border-primary/50 hover:bg-primary/5",
              value === opt.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground"
            )}
          >
            <div className="text-xs font-medium leading-tight">{opt.ja}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{opt.en}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
