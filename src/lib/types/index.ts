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

export type UserRole = "super_admin" | "facility_admin" | "reader";

export interface Facility {
  facility_id: string;
  name: string;
  slug: string;
  prefix: string;
  password_hash: string;
  next_reader_number: number;
  recycled_numbers: number[];
  admins: string[];
  created_by: string;
  created_at: unknown; // serverTimestamp()
}

export interface ReaderProfile {
  email: string;
  uid: string;
  reader_id: string;
  reader_number: number;
  facility_id: string;
  facility_name: string;
  display_name: string;
  reader_level: ExperienceLevel | null;
  disabled: boolean;
  created_at: unknown; // serverTimestamp()
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

export interface Invite {
  invite_id: string;
  created_by: string;
  created_at: unknown; // serverTimestamp()
  expires_at: string | null;
  used: boolean;
  used_by: string | null;
  used_at: string | null;
  label: string;
}
