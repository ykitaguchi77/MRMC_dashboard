"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TimerColor = "default" | "warning" | "danger";

const LS_KEY = "corneal_timer";

interface PersistedTimer {
  /** Accumulated elapsed ms from previous browsing sessions */
  accumulatedMs: number;
  /** Timestamp when the current browsing session started */
  resumedAt: number;
  /** Accumulated pause ms */
  pausedMs: number;
  /** Number of pauses */
  pauseCount: number;
}

function saveTimerState(key: string, state: PersistedTimer) {
  try {
    localStorage.setItem(`${LS_KEY}_${key}`, JSON.stringify(state));
  } catch { /* localStorage unavailable */ }
}

function loadTimerState(key: string): PersistedTimer | null {
  try {
    const v = localStorage.getItem(`${LS_KEY}_${key}`);
    if (!v) return null;
    return JSON.parse(v) as PersistedTimer;
  } catch {
    return null;
  }
}

function clearTimerState(key: string) {
  try {
    localStorage.removeItem(`${LS_KEY}_${key}`);
    // Also clean up old format key if present
    localStorage.removeItem(`corneal_timer_start_${key}`);
  } catch { /* */ }
}

export function useTimer() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const runningRef = useRef(false);
  const persistKeyRef = useRef<string | null>(null);

  // Accumulated time from previous browsing sessions (survives re-login)
  const accumulatedMsRef = useRef(0);

  // Pause tracking
  const [paused, setPaused] = useState(false);
  const pauseStartRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef(0);
  const pauseCountRef = useRef(0);

  const tick = useCallback(() => {
    if (!runningRef.current || startTimeRef.current === null) return;
    const currentSessionMs = Date.now() - startTimeRef.current - totalPausedMsRef.current;
    setElapsedMs(accumulatedMsRef.current + currentSessionMs);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  /** Persist current state to localStorage */
  const persistState = useCallback(() => {
    if (!persistKeyRef.current || startTimeRef.current === null) return;
    const currentSessionMs = Date.now() - startTimeRef.current - totalPausedMsRef.current;
    saveTimerState(persistKeyRef.current, {
      accumulatedMs: accumulatedMsRef.current + currentSessionMs,
      resumedAt: Date.now(),
      pausedMs: totalPausedMsRef.current,
      pauseCount: pauseCountRef.current,
    });
  }, []);

  /** Start a new timer. If persistKey is provided, saves/restores state from localStorage. */
  const start = useCallback((persistKey?: string) => {
    if (persistKey) {
      persistKeyRef.current = persistKey;
      const saved = loadTimerState(persistKey);
      if (saved) {
        // Restore: carry forward accumulated time, start a fresh counting session
        accumulatedMsRef.current = saved.accumulatedMs;
        totalPausedMsRef.current = 0; // pause tracking resets per browsing session
        pauseCountRef.current = saved.pauseCount;
        startTimeRef.current = Date.now();
        setElapsedMs(saved.accumulatedMs);
      } else {
        accumulatedMsRef.current = 0;
        startTimeRef.current = Date.now();
        setElapsedMs(0);
      }
      // Save immediately so we capture the new resumedAt
      saveTimerState(persistKey, {
        accumulatedMs: accumulatedMsRef.current,
        resumedAt: Date.now(),
        pausedMs: 0,
        pauseCount: pauseCountRef.current,
      });
    } else {
      accumulatedMsRef.current = 0;
      startTimeRef.current = Date.now();
      setElapsedMs(0);
    }
    runningRef.current = true;
    setPaused(false);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback((): number => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (startTimeRef.current === null) return accumulatedMsRef.current;
    const currentSessionMs = Date.now() - startTimeRef.current - totalPausedMsRef.current;
    const total = accumulatedMsRef.current + currentSessionMs;
    if (persistKeyRef.current) {
      clearTimerState(persistKeyRef.current);
      persistKeyRef.current = null;
    }
    return total;
  }, []);

  const reset = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    startTimeRef.current = null;
    accumulatedMsRef.current = 0;
    setElapsedMs(0);
    setPaused(false);
    pauseStartRef.current = null;
    totalPausedMsRef.current = 0;
    pauseCountRef.current = 0;
    if (persistKeyRef.current) {
      clearTimerState(persistKeyRef.current);
      persistKeyRef.current = null;
    }
  }, []);

  /** Pause the timer — stops counting elapsed time. */
  const pause = useCallback(() => {
    if (!runningRef.current || paused) return;
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    pauseStartRef.current = Date.now();
    pauseCountRef.current += 1;
    setPaused(true);
    persistState();
  }, [paused, persistState]);

  /** Resume from pause — adds paused duration to offset. */
  const resume = useCallback(() => {
    if (!paused || pauseStartRef.current === null) return;
    totalPausedMsRef.current += Date.now() - pauseStartRef.current;
    pauseStartRef.current = null;
    runningRef.current = true;
    setPaused(false);
    rafRef.current = requestAnimationFrame(tick);
  }, [paused, tick]);

  // Persist state before page unload (tab close / navigation)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (runningRef.current) {
        persistState();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [persistState]);

  const seconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  let color: TimerColor = "default";
  if (seconds >= 60) color = "danger";
  else if (seconds >= 30) color = "warning";

  return {
    elapsedMs,
    display,
    color,
    paused,
    pauseCount: pauseCountRef.current,
    totalPausedMs: totalPausedMsRef.current,
    start,
    stop,
    reset,
    pause,
    resume,
  };
}
