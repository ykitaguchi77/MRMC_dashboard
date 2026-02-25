"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { isAdminEmail } from "@/lib/firebase/auth";
import {
  getAllSessions,
  getSessionResults,
  getAllCases,
} from "@/lib/firebase/firestore";
import type { Session, ReadingResult, Case } from "@/lib/types";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdminEmail(user.email)) {
      router.replace("/setup");
      return;
    }
    loadSessions();
  }, [user, authLoading, router]);

  async function loadSessions() {
    setLoading(true);
    try {
      const data = await getAllSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCSV() {
    setExporting(true);
    try {
      // Fetch all data
      const [allSessions, allCases] = await Promise.all([
        getAllSessions(),
        getAllCases(),
      ]);

      const casesMap = new Map<string, Case>();
      allCases.forEach((c) => casesMap.set(c.case_id, c));

      // Fetch all results for all sessions
      const allResults: (ReadingResult & {
        ground_truth: string;
        ai_prediction: string;
        ai_confidence: number;
        ai_correct: boolean;
      })[] = [];

      for (const session of allSessions) {
        const results = await getSessionResults(session.session_id);
        for (const r of results) {
          const caseData = casesMap.get(r.case_id);
          allResults.push({
            ...r,
            ground_truth: caseData?.ground_truth ?? "",
            ai_prediction: caseData?.ai_prediction ?? "",
            ai_confidence: caseData?.ai_confidence ?? 0,
            ai_correct: caseData?.ai_correct ?? false,
          });
        }
      }

      // Generate CSV
      const headers = [
        "session_id",
        "reader_id",
        "facility",
        "reader_level",
        "task_type",
        "case_id",
        "case_order",
        "diagnosis",
        "diagnosis_other",
        "ai_diagnosis",
        "confidence",
        "ai_reference",
        "gradcam_helpful",
        "reading_time_ms",
        "timestamp",
        "ground_truth",
        "ai_prediction",
        "ai_confidence",
        "ai_correct",
      ];

      const csvRows = [headers.join(",")];
      for (const r of allResults) {
        const row = headers.map((h) => {
          const val = (r as unknown as Record<string, unknown>)[h];
          if (val === null || val === undefined) return "";
          const str = String(val);
          // Escape CSV values with commas or quotes
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csvRows.push(row.join(","));
      }

      const csv = csvRows.join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `corneal-reader-study-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed:", err);
      alert("CSVエクスポートに失敗しました");
    } finally {
      setExporting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">管理画面 / Admin</h1>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExportCSV}
              disabled={exporting}
              variant="outline"
            >
              {exporting ? "エクスポート中..." : "CSVエクスポート"}
            </Button>
            <Button variant="ghost" onClick={() => router.push("/setup")}>
              戻る
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>
              セッション一覧 / Sessions ({sessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                セッションがありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-3 py-2">Reader ID</th>
                      <th className="px-3 py-2">施設</th>
                      <th className="px-3 py-2">レベル</th>
                      <th className="px-3 py-2">タスク</th>
                      <th className="px-3 py-2">進捗</th>
                      <th className="px-3 py-2">ステータス</th>
                      <th className="px-3 py-2">開始日時</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.session_id} className="border-b">
                        <td className="px-3 py-2 font-mono">{s.reader_id}</td>
                        <td className="px-3 py-2">{s.facility}</td>
                        <td className="px-3 py-2">{s.reader_level}</td>
                        <td className="px-3 py-2">{s.task_type}</td>
                        <td className="px-3 py-2">
                          {s.completed_cases}/{s.total_cases}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              s.status === "completed" ? "default" : "secondary"
                            }
                          >
                            {s.status === "completed" ? "完了" : "進行中"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {s.started_at
                            ? new Date(s.started_at).toLocaleString("ja-JP")
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
