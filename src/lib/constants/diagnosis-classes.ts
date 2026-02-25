import type { DiagnosisClass } from "@/lib/types";

export interface DiagnosisOption {
  id: DiagnosisClass;
  en: string;
  ja: string;
}

export const DIAGNOSIS_CLASSES: DiagnosisOption[] = [
  { id: "normal", en: "Normal", ja: "正常" },
  { id: "infection", en: "Infection", ja: "感染" },
  { id: "non-infection", en: "Non-infection", ja: "非感染" },
  { id: "scar", en: "Scar", ja: "瘢痕" },
  { id: "tumor", en: "Tumor", ja: "腫瘍" },
  { id: "deposit", en: "Deposit", ja: "沈着物" },
  { id: "APAC", en: "APAC", ja: "急性緑内障発作" },
  { id: "lens opacity", en: "Lens Opacity", ja: "水晶体混濁" },
  { id: "bullous", en: "Bullous", ja: "水疱性" },
];

export const UNCLEAR_OPTION = {
  id: "unclear" as const,
  en: "Unclear",
  ja: "わからない",
};
