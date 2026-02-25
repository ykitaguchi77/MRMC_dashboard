"use client";

import { cn } from "@/lib/utils";

const LEVELS = [
  { value: 1, ja: "邪魔", en: "Distracting" },
  { value: 2, ja: "無用", en: "Not helpful" },
  { value: 3, ja: "中立", en: "Neutral" },
  { value: 4, ja: "有用", en: "Helpful" },
  { value: 5, ja: "非常に有用", en: "Very helpful" },
];

interface GradCAMHelpfulnessProps {
  value: number | null;
  onChange: (value: number) => void;
}

export function GradCAMHelpfulness({ value, onChange }: GradCAMHelpfulnessProps) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold">Grad-CAM有用性 / Grad-CAM Helpfulness</h3>
      <div className="flex gap-1">
        {LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            className={cn(
              "flex-1 rounded border-2 px-1 py-1.5 text-center transition-colors",
              "hover:border-emerald-400/50 hover:bg-emerald-50",
              value === level.value
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold"
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
