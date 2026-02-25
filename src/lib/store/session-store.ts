"use client";

import { create } from "zustand";
import type { Session, TaskType, ExperienceLevel } from "@/lib/types";

interface SessionState {
  session: Session | null;
  currentIndex: number;
  setSession: (session: Session) => void;
  advanceCase: () => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  currentIndex: 0,
  setSession: (session) => set({ session, currentIndex: session.completed_cases }),
  advanceCase: () =>
    set((state) => ({
      currentIndex: state.currentIndex + 1,
      session: state.session
        ? { ...state.session, completed_cases: state.session.completed_cases + 1 }
        : null,
    })),
  clearSession: () => set({ session: null, currentIndex: 0 }),
}));
