"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRole } from "@/lib/hooks/useRole";
import {
  getAllSessions,
  getSessionResults,
  getAllCases,
  getSessionsByFacility,
} from "@/lib/firebase/firestore";
import type { Session, ReadingResult, Case } from "@/lib/types";
import { FacilityManager } from "@/components/admin/facility-manager";
import { ReaderManager } from "@/components/admin/reader-manager";
import { SessionViewer } from "@/components/admin/session-viewer";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { role, adminFacilities, loading: roleLoading } = useRole();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  const loading = authLoading || roleLoading;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || (role !== "super_admin" && role !== "facility_admin")) {
    router.replace("/setup");
    return null;
  }

  const facilityIds = adminFacilities.map((f) => f.facility_id);

  async function handleExportCSV() {
    setExporting(true);
    try {
      let allSessions: Session[];
      if (role === "super_admin") {
        allSessions = await getAllSessions();
      } else {
        const all: Session[] = [];
        for (const fid of facilityIds) {
          const fSessions = await getSessionsByFacility(fid);
          all.push(...fSessions);
        }
        allSessions = all;
      }

      const allCases = await getAllCases();
      const casesMap = new Map<string, Case>();
      allCases.forEach((c) => casesMap.set(c.case_id, c));

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
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csvRows.push(row.join(","));
      }

      const csv = csvRows.join("\n");
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold">管理画面 / Admin</h1>
            <p className="text-xs text-muted-foreground">
              {role === "super_admin"
                ? "総管理者 / Super Admin"
                : `施設管理者 / Facility Admin (${adminFacilities.map((f) => f.name).join(", ")})`}
            </p>
          </div>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const { signOut } = await import("@/lib/firebase/auth");
                await signOut();
                router.replace("/login");
              }}
            >
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Tabs defaultValue={role === "super_admin" ? "facilities" : "readers"}>
          <TabsList>
            {role === "super_admin" && (
              <TabsTrigger value="facilities">施設管理</TabsTrigger>
            )}
            <TabsTrigger value="readers">読影者管理</TabsTrigger>
            <TabsTrigger value="sessions">セッション</TabsTrigger>
          </TabsList>

          {role === "super_admin" && (
            <TabsContent value="facilities" className="mt-4">
              <FacilityManager adminEmail={user.email!} />
            </TabsContent>
          )}

          <TabsContent value="readers" className="mt-4">
            <ReaderManager
              role={role!}
              facilityIds={
                role === "super_admin" ? undefined : facilityIds
              }
            />
          </TabsContent>

          <TabsContent value="sessions" className="mt-4">
            <SessionViewer
              role={role!}
              facilityIds={
                role === "super_admin" ? undefined : facilityIds
              }
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
