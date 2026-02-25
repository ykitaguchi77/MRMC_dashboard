import type { TaskType } from "@/lib/types";

export interface TaskTypeOption {
  id: TaskType;
  en: string;
  ja: string;
}

export const TASK_TYPES: TaskTypeOption[] = [
  { id: "unaided", en: "Unaided", ja: "AI支援なし" },
  { id: "ai_only", en: "AI only", ja: "AI分類結果のみ" },
  { id: "ai_gradcam", en: "AI + Grad-CAM", ja: "AI + Grad-CAM" },
];
