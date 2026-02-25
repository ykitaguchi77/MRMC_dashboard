import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "./config";
import type { Session, ReadingResult, Case, ReaderProfile, TaskType } from "@/lib/types";

function db() {
  return getFirebaseDb();
}

// --- Sessions ---

export async function createSession(session: Session): Promise<void> {
  await setDoc(doc(db(), "sessions", session.session_id), {
    ...session,
    created_at: serverTimestamp(),
  });
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const snap = await getDoc(doc(db(), "sessions", sessionId));
  return snap.exists() ? (snap.data() as Session) : null;
}

export async function updateSessionCompleted(sessionId: string, completedAt: string): Promise<void> {
  await updateDoc(doc(db(), "sessions", sessionId), {
    status: "completed",
    completed_at: completedAt,
  });
}

export async function incrementCompletedCases(sessionId: string): Promise<void> {
  await updateDoc(doc(db(), "sessions", sessionId), {
    completed_cases: increment(1),
  });
}

export async function getAllSessions(): Promise<Session[]> {
  const snap = await getDocs(
    query(collection(db(), "sessions"), orderBy("started_at", "desc"))
  );
  return snap.docs.map((d) => d.data() as Session);
}

// --- Reading Results (subcollection under sessions) ---

export async function saveReadingResult(
  sessionId: string,
  result: ReadingResult
): Promise<void> {
  // Use case_id as doc ID for idempotent writes (prevents duplicates)
  await setDoc(
    doc(db(), "sessions", sessionId, "results", result.case_id),
    result
  );
}

export async function getSessionResults(sessionId: string): Promise<ReadingResult[]> {
  const snap = await getDocs(
    collection(db(), "sessions", sessionId, "results")
  );
  return snap.docs.map((d) => d.data() as ReadingResult);
}

// --- Cases ---

export async function getAllCases(): Promise<Case[]> {
  const snap = await getDocs(
    query(collection(db(), "cases"), orderBy("case_id"))
  );
  return snap.docs.map((d) => d.data() as Case);
}

export async function getCaseIds(): Promise<string[]> {
  const cases = await getAllCases();
  return cases.map((c) => c.case_id);
}

export async function getCaseBasename(caseId: string): Promise<string | null> {
  const snap = await getDoc(doc(db(), "cases", caseId));
  if (!snap.exists()) return null;
  return (snap.data() as Case).basename;
}

export async function seedCase(caseData: Case): Promise<void> {
  await setDoc(doc(db(), "cases", caseData.case_id), caseData);
}

// --- Reader Profile ---

export async function getReaderProfile(email: string): Promise<ReaderProfile | null> {
  const snap = await getDoc(doc(db(), "readers", email));
  return snap.exists() ? (snap.data() as ReaderProfile) : null;
}

export async function saveReaderProfile(profile: ReaderProfile): Promise<void> {
  await setDoc(doc(db(), "readers", profile.email), profile);
}

// --- Sessions by reader for task panel ---

export async function getSessionsByReaderForTaskPanel(
  readerId: string
): Promise<Map<TaskType, Session[]>> {
  const snap = await getDocs(
    query(collection(db(), "sessions"), where("reader_id", "==", readerId))
  );
  const map = new Map<TaskType, Session[]>();
  for (const d of snap.docs) {
    const session = d.data() as Session;
    const existing = map.get(session.task_type) ?? [];
    existing.push(session);
    map.set(session.task_type, existing);
  }
  return map;
}

// --- Session resume ---

export async function findInProgressSession(
  readerId: string,
  taskType: string
): Promise<Session | null> {
  const snap = await getDocs(
    query(
      collection(db(), "sessions"),
      where("reader_id", "==", readerId),
      where("task_type", "==", taskType),
      where("status", "==", "in_progress")
    )
  );
  if (snap.empty) return null;
  return snap.docs[0].data() as Session;
}

// --- Queries for admin ---

export async function getSessionsByReader(readerId: string): Promise<Session[]> {
  const snap = await getDocs(
    query(collection(db(), "sessions"), where("reader_id", "==", readerId))
  );
  return snap.docs.map((d) => d.data() as Session);
}
