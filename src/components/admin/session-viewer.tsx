"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAllSessions,
  getSessionsByFacility,
} from "@/lib/firebase/firestore";
import type { Session, UserRole } from "@/lib/types";

interface SessionViewerProps {
  role: UserRole;
  facilityIds?: string[];
}

export function SessionViewer({ role, facilityIds }: SessionViewerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, [role, facilityIds]);

  async function loadSessions() {
    setLoading(true);
    try {
      if (role === "super_admin") {
        setSessions(await getAllSessions());
      } else {
        const all: Session[] = [];
        for (const fid of facilityIds ?? []) {
          const fSessions = await getSessionsByFacility(fid);
          all.push(...fSessions);
        }
        // Sort by started_at desc
        all.sort(
          (a, b) =>
            new Date(b.started_at).getTime() -
            new Date(a.started_at).getTime()
        );
        setSessions(all);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          セッション一覧 / Sessions ({sessions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-4">
            読み込み中...
          </p>
        ) : sessions.length === 0 ? (
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
  );
}
