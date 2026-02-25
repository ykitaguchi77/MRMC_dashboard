/**
 * Seed Firestore `cases` collection from MRMC_study_200cases.csv.
 *
 * Usage:
 *   npx tsx scripts/seed-cases.ts
 *
 * Requires:
 *   - .env.local with Firebase config
 *   - MRMC_study_200cases.csv in the parent directory
 */

import { readFileSync } from "fs";
import { join } from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import * as dotenv from "dotenv";

// Load env
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const csvPath = join(__dirname, "..", "..", "MRMC_study_200cases.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");

  // Header: Basename,GroundTruth,Predict,Likelihood,IsCorrect
  const rows = lines.slice(1);
  console.log(`Found ${rows.length} cases`);

  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    const parts = rows[i].split(",");
    const basename = parts[0];
    const groundTruth = parts[1];
    const predict = parts[2] || "";
    const likelihood = parseFloat(parts[3]) || 0;
    const isCorrect = parts[4]?.trim() === "correct";

    const hasPrediction = predict.trim().length > 0;
    const caseId = `CASE-${String(i + 1).padStart(4, "0")}`;

    const caseData = {
      case_id: caseId,
      basename,
      ground_truth: groundTruth,
      ai_prediction: predict,
      ai_confidence: likelihood,
      ai_correct: isCorrect,
      has_prediction: hasPrediction,
    };

    await setDoc(doc(db, "cases", caseId), caseData);
    count++;

    if (count % 50 === 0) {
      console.log(`  Seeded ${count}/${rows.length}`);
    }
  }

  console.log(`Done! Seeded ${count} cases.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
