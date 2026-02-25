import type { ExperienceLevel } from "@/lib/types";

export interface ExperienceLevelOption {
  id: ExperienceLevel;
  en: string;
  ja: string;
}

export const EXPERIENCE_LEVELS: ExperienceLevelOption[] = [
  { id: "specialist", en: "Corneal Specialist", ja: "角膜専門医" },
  { id: "general", en: "General Ophthalmologist", ja: "一般眼科医" },
  { id: "resident", en: "Resident", ja: "後期研修医" },
];
