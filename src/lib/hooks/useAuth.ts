"use client";

import { useEffect, useState } from "react";
import { type User } from "firebase/auth";
import { onAuthStateChanged, signOut } from "@/lib/firebase/auth";
import { getReaderProfileIncludingDisabled } from "@/lib/firebase/firestore";

interface AuthState {
  user: User | null;
  loading: boolean;
  disabled: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (u) => {
      const firebaseUser = u as User | null;
      if (firebaseUser?.email) {
        const profile = await getReaderProfileIncludingDisabled(
          firebaseUser.email
        );
        if (profile?.disabled) {
          setDisabled(true);
          await signOut();
          setUser(null);
          setLoading(false);
          return;
        }
      }
      setDisabled(false);
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading, disabled };
}
