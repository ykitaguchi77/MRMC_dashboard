"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TASK_TYPES } from "@/lib/constants/task-types";
import { EXPERIENCE_LEVELS } from "@/lib/constants/experience-levels";
import { hashCode } from "@/lib/utils/hash";
import { seededShuffle } from "@/lib/utils/shuffle";
import {
  createSession,
  getCaseIds,
  getSessionsByReaderForTaskPanel,
} from "@/lib/firebase/firestore";
import { signOut } from "@/lib/firebase/auth";
import { useSessionStore } from "@/lib/store/session-store";
import type { ReaderProfile, Session, TaskType } from "@/lib/types";

const TASK_ORDER: TaskType[] = ["unaided", "ai_only", "ai_gradcam"];
const BLOCKS = [
  { label: "Block 1", range: "1-50", start: 0, end: 50 },
  { label: "Block 2", range: "51-100", start: 50, end: 100 },
  { label: "Block 3", range: "101-150", start: 100, end: 150 },
  { label: "Block 4", range: "151-200", start: 150, end: 200 },
];
const WASHOUT_DAYS = 14;

interface TaskPanelProps {
  profile: ReaderProfile;
  email: string;
  onEditProfile: () => void;
}

interface TaskRowData {
  taskType: TaskType;
  session: Session | null;
  completedCases: number;
  totalCases: number;
  completedAt: string | null;
  status: "not_started" | "in_progress" | "completed";
}

function getBlockStatus(
  completedCases: number,
  blockStart: number,
  blockEnd: number
): "completed" | "in_progress" | "not_started" {
  if (completedCases >= blockEnd) return "completed";
  if (completedCases > blockStart) return "in_progress";
  return "not_started";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function addDays(iso: string, days: number): Date {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d;
}

export function TaskPanel({ profile, email, onEditProfile }: TaskPanelProps) {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);

  const [rows, setRows] = useState<TaskRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<TaskType | null>(null);
  const [error, setError] = useState("");

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const sessionMap = await getSessionsByReaderForTaskPanel(profile.reader_id);
      const rowData: TaskRowData[] = TASK_ORDER.map((tt) => {
        const sessions = sessionMap.get(tt) ?? [];
        // Find the most relevant session: completed > in_progress > none
        const completed = sessions.find((s) => s.status === "completed");
        const inProgress = sessions.find((s) => s.status === "in_progress");
        const session = completed ?? inProgress ?? null;

        return {
          taskType: tt,
          session,
          completedCases: session?.completed_cases ?? 0,
          totalCases: session?.total_cases ?? 0,
          completedAt: session?.completed_at ?? null,
          status: completed
            ? "completed"
            : inProgress
              ? "in_progress"
              : "not_started",
        };
      });
      setRows(rowData);
    } catch (err) {
      console.error(err);
      setError("セッション情報の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [profile.reader_id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  function canStart(rowIndex: number): {
    allowed: boolean;
    reason?: string;
  } {
    if (rowIndex === 0) return { allowed: true };

    const prevRow = rows[rowIndex - 1];
    if (prevRow.status !== "completed") {
      const prevLabel =
        TASK_TYPES.find((t) => t.id === prevRow.taskType)?.ja ?? "";
      return {
        allowed: false,
        reason: `${prevLabel}完了待ち`,
      };
    }

    // Check washout period
    if (prevRow.completedAt) {
      const unlockDate = addDays(prevRow.completedAt, WASHOUT_DAYS);
      if (unlockDate > new Date()) {
        return {
          allowed: false,
          reason: `${unlockDate.getMonth() + 1}/${unlockDate.getDate()}以降開始可`,
        };
      }
    }

    return { allowed: true };
  }

  async function handleStartOrResume(row: TaskRowData) {
    setActionLoading(row.taskType);
    setError("");

    try {
      if (row.status === "in_progress" && row.session) {
        // Resume existing session
        setSession(row.session);
        router.push("/reading");
        return;
      }

      // Start new session
      const caseIds = await getCaseIds();
      if (caseIds.length === 0) {
        setError("症例データが登録されていません。管理者に連絡してください。");
        setActionLoading(null);
        return;
      }

      const seed = hashCode(profile.reader_id + "_" + row.taskType);
      const caseOrder = seededShuffle(caseIds, seed);

      const session: Session = {
        session_id: uuidv4(),
        reader_id: profile.reader_id,
        facility: profile.facility_name,
        reader_level: profile.reader_level!,
        task_type: row.taskType,
        shuffle_seed: seed,
        case_order: caseOrder,
        started_at: new Date().toISOString(),
        completed_at: null,
        is_practice: false,
        total_cases: caseOrder.length,
        completed_cases: 0,
        status: "in_progress",
      };

      await createSession(session);
      setSession(session);
      router.push("/reading");
    } catch (err) {
      console.error(err);
      setError("セッション作成に失敗しました。再度お試しください。");
    } finally {
      setActionLoading(null);
    }
  }

  const levelLabel =
    EXPERIENCE_LEVELS.find((l) => l.id === profile.reader_level)?.ja ??
    profile.reader_level;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">CorneAI Reader Study</CardTitle>
          {/* Profile banner */}
          <div className="mt-2 flex items-center justify-center gap-3 text-sm">
            <Badge variant="outline" className="text-sm px-3 py-1">
              {profile.reader_id}
            </Badge>
            <span className="text-muted-foreground">{profile.facility_name}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{levelLabel}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              読み込み中...
            </div>
          ) : (
            <>
              {/* Task grid */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 text-sm font-medium text-muted-foreground w-40">
                        タスク
                      </th>
                      {BLOCKS.map((b) => (
                        <th
                          key={b.label}
                          className="text-center p-2 text-sm font-medium text-muted-foreground"
                        >
                          <div>{b.label}</div>
                          <div className="text-xs font-normal">{b.range}</div>
                        </th>
                      ))}
                      <th className="text-center p-2 text-sm font-medium text-muted-foreground w-36">
                        アクション
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => {
                      const taskLabel =
                        TASK_TYPES.find((t) => t.id === row.taskType)?.ja ?? "";
                      const taskLabelEn =
                        TASK_TYPES.find((t) => t.id === row.taskType)?.en ?? "";
                      const startCheck = canStart(rowIndex);

                      return (
                        <tr
                          key={row.taskType}
                          className="border-t border-border"
                        >
                          {/* Task label */}
                          <td className="p-2">
                            <div className="text-sm font-medium">
                              <span className="text-muted-foreground mr-1">
                                {rowIndex + 1}.
                              </span>
                              {taskLabel}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {taskLabelEn}
                            </div>
                          </td>

                          {/* Block cells */}
                          {BLOCKS.map((block) => {
                            const bs = getBlockStatus(
                              row.completedCases,
                              block.start,
                              block.end
                            );
                            return (
                              <td
                                key={block.label}
                                className="p-2 text-center"
                              >
                                <BlockCell
                                  status={bs}
                                  completed={Math.min(
                                    Math.max(
                                      row.completedCases - block.start,
                                      0
                                    ),
                                    block.end - block.start
                                  )}
                                  total={block.end - block.start}
                                />
                              </td>
                            );
                          })}

                          {/* Action button */}
                          <td className="p-2 text-center">
                            <ActionButton
                              row={row}
                              startCheck={startCheck}
                              loading={actionLoading === row.taskType}
                              onAction={() => handleStartOrResume(row)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={onEditProfile}
              className="hover:underline"
            >
              プロフィール編集
            </button>
            <span>{email}</span>
            <button
              type="button"
              onClick={() => signOut()}
              className="hover:underline"
            >
              ログアウト
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Sub-components ---

function BlockCell({
  status,
  completed,
  total,
}: {
  status: "completed" | "in_progress" | "not_started";
  completed: number;
  total: number;
}) {
  if (status === "completed") {
    return (
      <div className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
        <span>&#10003;</span> 完了
      </div>
    );
  }
  if (status === "in_progress") {
    return (
      <div className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
        {completed}/{total}
      </div>
    );
  }
  return (
    <div className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
      ---
    </div>
  );
}

function ActionButton({
  row,
  startCheck,
  loading,
  onAction,
}: {
  row: TaskRowData;
  startCheck: { allowed: boolean; reason?: string };
  loading: boolean;
  onAction: () => void;
}) {
  // Completed
  if (row.status === "completed") {
    return (
      <div className="space-y-1">
        <Button size="sm" variant="ghost" disabled className="w-full">
          完了 &#10003;
        </Button>
        {row.completedAt && (
          <div className="text-xs text-muted-foreground">
            {formatDate(row.completedAt)}
          </div>
        )}
      </div>
    );
  }

  // Locked — prerequisite not met
  if (!startCheck.allowed) {
    return (
      <div className="space-y-1">
        <Button size="sm" variant="outline" disabled className="w-full">
          ロック
        </Button>
        <div className="text-xs text-muted-foreground">{startCheck.reason}</div>
      </div>
    );
  }

  // In progress — resume
  if (row.status === "in_progress") {
    return (
      <Button
        size="sm"
        variant="default"
        className="w-full"
        disabled={loading}
        onClick={onAction}
      >
        {loading ? "..." : "再開 →"}
      </Button>
    );
  }

  // Not started — start
  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full"
      disabled={loading}
      onClick={onAction}
    >
      {loading ? "..." : "開始 →"}
    </Button>
  );
}
