"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TimerColor = "default" | "warning" | "danger";

const LS_KEY = "corneal_timer_start";

function saveStartTime(key: string, timestamp: number) {
  try {
    localStorage.setItem(`${LS_KEY}_${key}`, String(timestamp));
  } catch { /* localStorage unavailable */ }
}

function loadStartTime(key: string): number | null {
  try {
    const v = localStorage.getItem(`${LS_KEY}_${key}`);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function clearStartTime(key: string) {
  try {
    localStorage.removeItem(`${LS_KEY}_${key}`);
  } catch { /* */ }
}

export function useTimer() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const runningRef = useRef(false);
  const persistKeyRef = useRef<string | null>(null);

  // Pause tracking
  const [paused, setPaused] = useState(false);
  const pauseStartRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef(0);
  const pauseCountRef = useRef(0);

  const tick = useCallback(() => {
    if (!runningRef.current || startTimeRef.current === null) return;
    setElapsedMs(Date.now() - startTimeRef.current - totalPausedMsRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  /** Start a new timer. If persistKey is provided, saves start time to localStorage. */
  const start = useCallback((persistKey?: string) => {
    if (persistKey) {
      persistKeyRef.current = persistKey;
      const saved = loadStartTime(persistKey);
      if (saved) {
        startTimeRef.current = saved;
        setElapsedMs(Date.now() - saved - totalPausedMsRef.current);
      } else {
        startTimeRef.current = Date.now();
        setElapsedMs(0);
        saveStartTime(persistKey, startTimeRef.current);
      }
    } else {
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
    if (startTimeRef.current === null) return 0;
    // Net reading time = total elapsed - total paused
    const elapsed = Date.now() - startTimeRef.current - totalPausedMsRef.current;
    if (persistKeyRef.current) {
      clearStartTime(persistKeyRef.current);
      persistKeyRef.current = null;
    }
    return elapsed;
  }, []);

  const reset = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    startTimeRef.current = null;
    setElapsedMs(0);
    setPaused(false);
    pauseStartRef.current = null;
    totalPausedMsRef.current = 0;
    pauseCountRef.current = 0;
    if (persistKeyRef.current) {
      clearStartTime(persistKeyRef.current);
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
  }, [paused]);

  /** Resume from pause — adds paused duration to offset. */
  const resume = useCallback(() => {
    if (!paused || pauseStartRef.current === null) return;
    totalPausedMsRef.current += Date.now() - pauseStartRef.current;
    pauseStartRef.current = null;
    runningRef.current = true;
    setPaused(false);
    rafRef.current = requestAnimationFrame(tick);
  }, [paused, tick]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

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
