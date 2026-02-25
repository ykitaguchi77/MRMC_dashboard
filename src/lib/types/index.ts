export type TaskType = "unaided" | "ai_only" | "ai_gradcam";

export type ExperienceLevel = "specialist" | "general" | "resident";

export type DiagnosisClass =
  | "infection"
  | "normal"
  | "non-infection"
  | "scar"
  | "tumor"
  | "deposit"
  | "APAC"
  | "lens opacity"
  | "bullous";

export type AIReference = "followed" | "changed" | "independent";

export interface Session {
  session_id: string;
  reader_id: string;
  facility: string;
  reader_level: ExperienceLevel;
  task_type: TaskType;
  shuffle_seed: number;
  case_order: string[];
  started_at: string;
  completed_at: string | null;
  is_practice: boolean;
  total_cases: number;
  completed_cases: number;
  status: "in_progress" | "completed";
}

export interface ReadingResult {
  session_id: string;
  reader_id: string;
  facility: string;
  reader_level: ExperienceLevel;
  task_type: TaskType;
  case_id: string;
  case_order: number;
  diagnosis: DiagnosisClass;
  diagnosis_other: string | null;
  ai_diagnosis: DiagnosisClass | "unclear" | null;
  confidence: number; // 1-5
  ai_reference: AIReference | null;
  gradcam_helpful: number | null; // 1-5
  reading_time_ms: number;
  pause_count: number;
  pause_total_ms: number;
  timestamp: string;
}

export interface ReaderProfile {
  email: string;
  reader_id: string;
  facility: string;
  reader_level: ExperienceLevel;
}

export interface Case {
  case_id: string;
  basename: string;
  ground_truth: string;
  ai_prediction: string;
  ai_confidence: number;
  ai_correct: boolean;
  has_prediction: boolean;
}
