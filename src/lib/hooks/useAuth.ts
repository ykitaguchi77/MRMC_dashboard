"use client";

import { useEffect, useState } from "react";
import { type User } from "firebase/auth";
import { onAuthStateChanged } from "@/lib/firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((u) => {
      setUser(u as User | null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading };
}
