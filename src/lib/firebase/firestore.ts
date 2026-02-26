import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  increment,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  arrayRemove,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "./config";
import type {
  Session,
  ReadingResult,
  Case,
  ReaderProfile,
  TaskType,
  Facility,
} from "@/lib/types";

function db() {
  return getFirebaseDb();
}

// ============================================================
// Sessions
// ============================================================

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

export async function updateSessionCompleted(
  sessionId: string,
  completedAt: string
): Promise<void> {
  await updateDoc(doc(db(), "sessions", sessionId), {
    status: "completed",
    completed_at: completedAt,
  });
}

export async function incrementCompletedCases(
  sessionId: string
): Promise<void> {
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

export async function getSessionsByFacility(
  facilityId: string
): Promise<Session[]> {
  const readers = await getReadersByFacility(facilityId);
  const readerIds = readers.map((r) => r.reader_id);
  if (readerIds.length === 0) return [];

  // Firestore `in` query supports up to 30 items
  const allSessions: Session[] = [];
  for (let i = 0; i < readerIds.length; i += 30) {
    const chunk = readerIds.slice(i, i + 30);
    const snap = await getDocs(
      query(
        collection(db(), "sessions"),
        where("reader_id", "in", chunk),
        orderBy("started_at", "desc")
      )
    );
    allSessions.push(...snap.docs.map((d) => d.data() as Session));
  }
  return allSessions;
}

// ============================================================
// Reading Results (subcollection under sessions)
// ============================================================

export async function saveReadingResult(
  sessionId: string,
  result: ReadingResult
): Promise<void> {
  await setDoc(
    doc(db(), "sessions", sessionId, "results", result.case_id),
    result
  );
}

export async function getSessionResults(
  sessionId: string
): Promise<ReadingResult[]> {
  const snap = await getDocs(
    collection(db(), "sessions", sessionId, "results")
  );
  return snap.docs.map((d) => d.data() as ReadingResult);
}

// ============================================================
// Cases
// ============================================================

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

export async function getCaseBasename(
  caseId: string
): Promise<string | null> {
  const snap = await getDoc(doc(db(), "cases", caseId));
  if (!snap.exists()) return null;
  return (snap.data() as Case).basename;
}

export async function seedCase(caseData: Case): Promise<void> {
  await setDoc(doc(db(), "cases", caseData.case_id), caseData);
}

// ============================================================
// Reader Profile
// ============================================================

export async function getReaderProfile(
  email: string
): Promise<ReaderProfile | null> {
  const snap = await getDoc(doc(db(), "readers", email));
  if (!snap.exists()) return null;
  const data = snap.data() as ReaderProfile;
  if (data.disabled) return null;
  return data;
}

export async function getReaderProfileIncludingDisabled(
  email: string
): Promise<ReaderProfile | null> {
  const snap = await getDoc(doc(db(), "readers", email));
  return snap.exists() ? (snap.data() as ReaderProfile) : null;
}

export async function saveReaderProfile(
  profile: ReaderProfile
): Promise<void> {
  await setDoc(doc(db(), "readers", profile.email), profile);
}

export async function updateReaderLevel(
  email: string,
  readerLevel: ReaderProfile["reader_level"]
): Promise<void> {
  await updateDoc(doc(db(), "readers", email), {
    reader_level: readerLevel,
  });
}

export async function updateReaderDisplayName(
  email: string,
  displayName: string
): Promise<void> {
  await updateDoc(doc(db(), "readers", email), {
    display_name: displayName,
  });
}

export async function getAllReaders(): Promise<ReaderProfile[]> {
  const snap = await getDocs(
    query(collection(db(), "readers"), where("disabled", "==", false))
  );
  return snap.docs.map((d) => d.data() as ReaderProfile);
}

export async function getReadersByFacility(
  facilityId: string
): Promise<ReaderProfile[]> {
  const snap = await getDocs(
    query(
      collection(db(), "readers"),
      where("facility_id", "==", facilityId),
      where("disabled", "==", false)
    )
  );
  return snap.docs.map((d) => d.data() as ReaderProfile);
}

// ============================================================
// Reader soft-delete + data purge
// ============================================================

export async function softDeleteReader(email: string): Promise<void> {
  const readerSnap = await getDoc(doc(db(), "readers", email));
  if (!readerSnap.exists()) return;
  const reader = readerSnap.data() as ReaderProfile;

  // Mark reader as disabled
  await updateDoc(doc(db(), "readers", email), { disabled: true });

  // Recycle the reader number
  const facilityRef = doc(db(), "facilities", reader.facility_id);
  await updateDoc(facilityRef, {
    recycled_numbers: arrayUnion(reader.reader_number),
  });

  // Delete all sessions and their results subcollections
  const sessionsSnap = await getDocs(
    query(
      collection(db(), "sessions"),
      where("reader_id", "==", reader.reader_id)
    )
  );

  const batch = writeBatch(db());
  for (const sessionDoc of sessionsSnap.docs) {
    // Delete results subcollection
    const resultsSnap = await getDocs(
      collection(db(), "sessions", sessionDoc.id, "results")
    );
    for (const resultDoc of resultsSnap.docs) {
      batch.delete(resultDoc.ref);
    }
    batch.delete(sessionDoc.ref);
  }
  await batch.commit();
}

// ============================================================
// Sessions by reader (for task panel)
// ============================================================

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

// ============================================================
// Session resume
// ============================================================

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

// ============================================================
// Queries for admin
// ============================================================

export async function getSessionsByReader(
  readerId: string
): Promise<Session[]> {
  const snap = await getDocs(
    query(collection(db(), "sessions"), where("reader_id", "==", readerId))
  );
  return snap.docs.map((d) => d.data() as Session);
}

// ============================================================
// Facilities
// ============================================================

export async function createFacility(
  facility: Omit<Facility, "created_at">
): Promise<void> {
  await setDoc(doc(db(), "facilities", facility.facility_id), {
    ...facility,
    created_at: serverTimestamp(),
  });
}

export async function getFacility(
  facilityId: string
): Promise<Facility | null> {
  const snap = await getDoc(doc(db(), "facilities", facilityId));
  return snap.exists() ? (snap.data() as Facility) : null;
}

export async function getFacilityBySlug(
  slug: string
): Promise<Facility | null> {
  const snap = await getDocs(
    query(collection(db(), "facilities"), where("slug", "==", slug))
  );
  if (snap.empty) return null;
  return snap.docs[0].data() as Facility;
}

export async function getAllFacilities(): Promise<Facility[]> {
  const snap = await getDocs(
    query(collection(db(), "facilities"), orderBy("name"))
  );
  return snap.docs.map((d) => d.data() as Facility);
}

export async function updateFacility(
  facilityId: string,
  data: Partial<Pick<Facility, "name" | "slug" | "prefix" | "password_hash">>
): Promise<void> {
  await updateDoc(doc(db(), "facilities", facilityId), data);
}

export async function addFacilityAdmin(
  facilityId: string,
  email: string
): Promise<void> {
  await updateDoc(doc(db(), "facilities", facilityId), {
    admins: arrayUnion(email.toLowerCase()),
  });
}

export async function removeFacilityAdmin(
  facilityId: string,
  email: string
): Promise<void> {
  await updateDoc(doc(db(), "facilities", facilityId), {
    admins: arrayRemove(email.toLowerCase()),
  });
}

export async function deleteFacility(facilityId: string): Promise<void> {
  await deleteDoc(doc(db(), "facilities", facilityId));
}

export async function getFacilitiesForAdmin(
  email: string
): Promise<Facility[]> {
  const snap = await getDocs(
    query(
      collection(db(), "facilities"),
      where("admins", "array-contains", email.toLowerCase())
    )
  );
  return snap.docs.map((d) => d.data() as Facility);
}

// ============================================================
// Reader ID generation (transactional)
// ============================================================

export async function generateReaderId(
  facilityId: string
): Promise<{ readerId: string; readerNumber: number }> {
  const facilityRef = doc(db(), "facilities", facilityId);

  return runTransaction(db(), async (transaction) => {
    const facilitySnap = await transaction.get(facilityRef);
    if (!facilitySnap.exists()) {
      throw new Error("Facility not found");
    }

    const facility = facilitySnap.data() as Facility;
    let readerNumber: number;

    if (facility.recycled_numbers.length > 0) {
      // Use smallest recycled number
      const sorted = [...facility.recycled_numbers].sort((a, b) => a - b);
      readerNumber = sorted[0];
      transaction.update(facilityRef, {
        recycled_numbers: arrayRemove(readerNumber),
      });
    } else {
      // Use next sequential number
      readerNumber = facility.next_reader_number;
      transaction.update(facilityRef, {
        next_reader_number: readerNumber + 1,
      });
    }

    const readerId = `${facility.prefix}_${String(readerNumber).padStart(3, "0")}`;
    return { readerId, readerNumber };
  });
}
