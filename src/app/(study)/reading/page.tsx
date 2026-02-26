"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DiagnosisGrid } from "@/components/reading/diagnosis-grid";
import { ConfidenceScale } from "@/components/reading/confidence-scale";
import { AIReferenceButtons } from "@/components/reading/ai-reference-buttons";
import { GradCAMHelpfulness } from "@/components/reading/gradcam-helpfulness";
import { BlockBreakScreen } from "@/components/reading/block-break-screen";
import { useTimer } from "@/lib/hooks/useTimer";
import { useSessionStore } from "@/lib/store/session-store";
import {
  saveReadingResult,
  incrementCompletedCases,
  updateSessionCompleted,
  getCaseBasename,
} from "@/lib/firebase/firestore";
import { TASK_TYPES } from "@/lib/constants/task-types";
import { cn } from "@/lib/utils";
import type { DiagnosisClass, AIReference, ReadingResult } from "@/lib/types";

const BLOCK_SIZE = 50;

export default function ReadingPage() {
  const router = useRouter();
  const { session, currentIndex, advanceCase, clearSession } = useSessionStore();
  const timer = useTimer();

  // Form state — reset per case
  const [diagnosis, setDiagnosis] = useState<DiagnosisClass | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [aiReference, setAIReference] = useState<AIReference | null>(null);
  const [gradcamHelpful, setGradcamHelpful] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [imageBasename, setImageBasename] = useState<string | null>(null);
  const [showBreak, setShowBreak] = useState(false);

  // Redirect if no session
  useEffect(() => {
    if (!session) {
      router.replace("/setup");
    }
  }, [session, router]);

  const currentCaseId = session?.case_order?.[currentIndex] ?? "";

  // Fetch image basename when case changes
  useEffect(() => {
    if (!currentCaseId) return;
    setImageBasename(null);
    getCaseBasename(currentCaseId).then(setImageBasename);
  }, [currentCaseId]);

  // Start timer when case loads (persist key enables resume across page reloads)
  const timerKey = session ? `${session.session_id}_${currentIndex}` : undefined;
  useEffect(() => {
    timer.start(timerKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const taskType = session?.task_type;
  const showAI = taskType === "ai_only" || taskType === "ai_gradcam";
  const showGradCAM = taskType === "ai_gradcam";

  const totalCases = session?.total_cases ?? 0;
  const progressPercent = totalCases > 0 ? (currentIndex / totalCases) * 100 : 0;

  const taskLabel = useMemo(
    () => TASK_TYPES.find((t) => t.id === taskType)?.en ?? "",
    [taskType]
  );

  // Validation
  const validate = useCallback((): string[] => {
    const errors: string[] = [];
    if (!diagnosis) errors.push("診断名が未選択です");
    if (confidence === null) errors.push("確信度が未選択です");
    if (showAI && !aiReference) errors.push("AI参考度が未選択です");
    if (showGradCAM && gradcamHelpful === null) errors.push("Grad-CAM有用性が未選択です");
    return errors;
  }, [diagnosis, confidence, aiReference, gradcamHelpful, showAI, showGradCAM]);

  const isFormValid = validate().length === 0;

  async function handleNext() {
    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    if (!session || saving) return;

    setSaving(true);
    setValidationErrors([]);

    const readingTimeMs = timer.stop();

    const result: ReadingResult = {
      session_id: session.session_id,
      reader_id: session.reader_id,
      facility: session.facility,
      reader_level: session.reader_level,
      task_type: session.task_type,
      case_id: currentCaseId,
      case_order: currentIndex + 1,
      diagnosis: diagnosis!,
      diagnosis_other: null,
      ai_diagnosis: null,
      confidence: confidence!,
      ai_reference: showAI ? aiReference : null,
      gradcam_helpful: showGradCAM ? gradcamHelpful : null,
      reading_time_ms: readingTimeMs,
      pause_count: timer.pauseCount,
      pause_total_ms: timer.totalPausedMs,
      timestamp: new Date().toISOString(),
    };

    try {
      await saveReadingResult(session.session_id, result);
      await incrementCompletedCases(session.session_id);

      const nextIndex = currentIndex + 1;

      if (nextIndex >= totalCases) {
        await updateSessionCompleted(session.session_id, new Date().toISOString());
        router.push("/complete");
      } else if (nextIndex % BLOCK_SIZE === 0) {
        // Block boundary reached — show break screen before advancing
        resetForm();
        advanceCase();
        setShowBreak(true);
      } else {
        resetForm();
        advanceCase();
      }
    } catch (err) {
      console.error("Failed to save result:", err);
      setValidationErrors(["保存に失敗しました。再度お試しください。"]);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setDiagnosis(null);
    setConfidence(null);
    setAIReference(null);
    setGradcamHelpful(null);
    setValidationErrors([]);
    timer.reset();
  }

  const totalBlocks = Math.ceil(totalCases / BLOCK_SIZE);
  const currentBlock = Math.floor(currentIndex / BLOCK_SIZE) + 1; // 1-based

  if (!session) return null;

  if (showBreak) {
    return (
      <BlockBreakScreen
        blockNumber={currentBlock - 1} // The block just completed
        totalBlocks={totalBlocks}
        completedCases={currentIndex}
        totalCases={totalCases}
        onContinue={() => {
          setShowBreak(false);
          timer.start(timerKey);
        }}
        onBackToDashboard={() => {
          clearSession();
          router.push("/setup");
        }}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Compact Header */}
      <header className="flex-none border-b bg-background/95 backdrop-blur px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">CorneAI</span>
            <Badge variant="outline" className="text-xs">{taskLabel}</Badge>
            <span className="text-xs text-muted-foreground">
              {currentCaseId}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              Block {currentBlock}/{totalBlocks}
            </span>
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1}/{totalCases}
            </span>
            <div
              className={cn(
                "font-mono text-base font-bold tabular-nums",
                timer.color === "warning" && "text-yellow-600",
                timer.color === "danger" && "text-red-600"
              )}
            >
              {timer.display}
            </div>
            {/* Pause button */}
            <button
              type="button"
              onClick={timer.pause}
              className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              II 一時停止
            </button>
          </div>
        </div>
        <Progress value={progressPercent} className="mt-1.5 h-1.5" />
      </header>

      {/* Two-Column Layout */}
      <main className="relative flex flex-1 min-h-0">
        {/* Left: Image */}
        <div className="flex w-1/2 items-center justify-center bg-black p-4">
          {imageBasename ? (
            <img
              src={`/cases/${imageBasename}`}
              alt={currentCaseId}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="text-white/50">Loading image...</div>
          )}
        </div>

        {/* Right: Input Panel */}
        <div className="flex w-1/2 flex-col overflow-y-auto p-4">
          <div className="space-y-4">
            {/* ① Diagnosis */}
            <DiagnosisGrid
              label="① 診断名 / Diagnosis"
              value={diagnosis}
              onChange={setDiagnosis}
            />

            {/* ② Confidence */}
            <ConfidenceScale value={confidence} onChange={setConfidence} />

            {/* ③ AI Reference (AI conditions only) */}
            {showAI && (
              <AIReferenceButtons value={aiReference} onChange={setAIReference} />
            )}

            {/* ④ Grad-CAM Helpfulness (Grad-CAM condition only) */}
            {showGradCAM && (
              <GradCAMHelpfulness value={gradcamHelpful} onChange={setGradcamHelpful} />
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="rounded border border-destructive/50 bg-destructive/5 p-2 space-y-0.5">
                {validationErrors.map((err) => (
                  <p key={err} className="text-xs text-destructive">⚠ {err}</p>
                ))}
              </div>
            )}
          </div>

          {/* Next Button */}
          <div className="pt-14">
            <Button
              className="w-full h-20 text-lg"
              size="lg"
              disabled={!isFormValid || saving}
              onClick={handleNext}
            >
              {saving
                ? "保存中..."
                : currentIndex + 1 >= totalCases
                  ? "完了 / Complete"
                  : "次の症例へ → / Next Case →"}
            </Button>
          </div>
        </div>

        {/* Pause Overlay */}
        {timer.paused && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="text-lg font-semibold text-muted-foreground">
                一時停止中 / Paused
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                タイマーは停止しています。準備ができたら再開してください。
              </p>
              <Button size="lg" onClick={timer.resume}>
                再開 / Resume
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
