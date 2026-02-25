"use client";

import { cn } from "@/lib/utils";
import type { AIReference } from "@/lib/types";

const OPTIONS: { value: AIReference; ja: string; en: string }[] = [
  { value: "followed", ja: "AIに従った", en: "Followed AI" },
  { value: "changed", ja: "AIに従わなかった", en: "Disagreed AI" },
  { value: "independent", ja: "自分で判断", en: "Independent" },
];

interface AIReferenceButtonsProps {
  value: AIReference | null;
  onChange: (value: AIReference) => void;
}

export function AIReferenceButtons({ value, onChange }: AIReferenceButtonsProps) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold">AI参考度 / AI Reference</h3>
      <div className="flex gap-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded border-2 px-2 py-1.5 text-center transition-colors",
              "hover:border-violet-400/50 hover:bg-violet-50",
              value === opt.value
                ? "border-violet-500 bg-violet-50 text-violet-700 font-semibold"
                : "border-border bg-background text-foreground"
            )}
          >
            <div className="text-xs font-medium">{opt.ja}</div>
            <div className="text-[10px] text-muted-foreground">{opt.en}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
