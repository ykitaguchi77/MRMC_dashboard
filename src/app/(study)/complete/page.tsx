"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionStore } from "@/lib/store/session-store";
import { getSessionResults } from "@/lib/firebase/firestore";
import type { ReadingResult } from "@/lib/types";

export default function CompletePage() {
  const router = useRouter();
  const { session, clearSession } = useSessionStore();
  const [stats, setStats] = useState<{
    totalCases: number;
    avgTimeMs: number;
    totalTimeMs: number;
  } | null>(null);

  useEffect(() => {
    if (!session) {
      router.replace("/setup");
      return;
    }
    // Fetch results to compute stats
    getSessionResults(session.session_id).then((results) => {
      if (results.length === 0) return;
      const totalTimeMs = results.reduce((sum, r) => sum + r.reading_time_ms, 0);
      setStats({
        totalCases: results.length,
        avgTimeMs: Math.round(totalTimeMs / results.length),
        totalTimeMs,
      });
    });
  }, [session, router]);

  function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
  }

  function handleReturn() {
    clearSession();
    router.push("/setup");
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">
            セッション完了
          </CardTitle>
          <p className="text-muted-foreground">
            Session Complete — Thank you for your participation!
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg">
            ご協力ありがとうございます
          </p>

          {stats && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{stats.totalCases}</div>
                <div className="text-xs text-muted-foreground">
                  読影症例数
                  <br />
                  Cases Read
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatTime(stats.avgTimeMs)}
                </div>
                <div className="text-xs text-muted-foreground">
                  平均読影時間
                  <br />
                  Avg. Time
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatTime(stats.totalTimeMs)}
                </div>
                <div className="text-xs text-muted-foreground">
                  合計読影時間
                  <br />
                  Total Time
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleReturn} className="w-full" size="lg">
            タイトル画面に戻る / Return to Setup
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
