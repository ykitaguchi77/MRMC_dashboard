import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  type User,
  type NextOrObserver,
} from "firebase/auth";
import { getFirebaseAuth } from "./config";

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function signOut() {
  return firebaseSignOut(getFirebaseAuth());
}

export function onAuthStateChanged(callback: NextOrObserver<User>) {
  return firebaseOnAuthStateChanged(getFirebaseAuth(), callback);
}

export async function createAccount(email: string, password: string) {
  return createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function sendVerificationEmail(user: User, loginUrl: string) {
  return sendEmailVerification(user, {
    url: loginUrl,
    handleCodeInApp: false,
  });
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}
