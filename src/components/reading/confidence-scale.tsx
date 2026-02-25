"use client";

import { cn } from "@/lib/utils";

const LEVELS = [
  { value: 1, ja: "非常に低い", en: "Very Low" },
  { value: 2, ja: "低い", en: "Low" },
  { value: 3, ja: "中程度", en: "Moderate" },
  { value: 4, ja: "高い", en: "High" },
  { value: 5, ja: "非常に高い", en: "Very High" },
];

interface ConfidenceScaleProps {
  value: number | null;
  onChange: (value: number) => void;
}

export function ConfidenceScale({ value, onChange }: ConfidenceScaleProps) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold">確信度 / Confidence</h3>
      <div className="flex gap-1">
        {LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            className={cn(
              "flex-1 rounded border-2 px-1 py-1.5 text-center transition-colors",
              "hover:border-amber-400/50 hover:bg-amber-50",
              value === level.value
                ? "border-amber-500 bg-amber-50 text-amber-700 font-semibold"
                : "border-border bg-background text-foreground"
            )}
          >
            <div className="text-sm font-bold">{level.value}</div>
            <div className="text-[10px] leading-tight">{level.ja}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
