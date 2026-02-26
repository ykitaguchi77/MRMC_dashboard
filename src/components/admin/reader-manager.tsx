"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getAllReaders,
  getReadersByFacility,
  softDeleteReader,
  getSessionsByReader,
} from "@/lib/firebase/firestore";
import type { ReaderProfile, UserRole } from "@/lib/types";

interface ReaderManagerProps {
  role: UserRole;
  facilityIds?: string[];
}

interface ReaderRow extends ReaderProfile {
  sessionCount: number;
}

export function ReaderManager({ role, facilityIds }: ReaderManagerProps) {
  const [readers, setReaders] = useState<ReaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReaders();
  }, [role, facilityIds]);

  async function loadReaders() {
    setLoading(true);
    try {
      let profiles: ReaderProfile[];
      if (role === "super_admin") {
        profiles = await getAllReaders();
      } else {
        const all: ReaderProfile[] = [];
        for (const fid of facilityIds ?? []) {
          const fReaders = await getReadersByFacility(fid);
          all.push(...fReaders);
        }
        profiles = all;
      }

      // Fetch session counts
      const rows: ReaderRow[] = await Promise.all(
        profiles.map(async (p) => {
          const sessions = await getSessionsByReader(p.reader_id);
          return { ...p, sessionCount: sessions.length };
        })
      );

      setReaders(rows);
    } catch (err) {
      console.error("Failed to load readers:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(email: string) {
    try {
      await softDeleteReader(email);
      await loadReaders();
    } catch (err) {
      console.error("Failed to delete reader:", err);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>読影者管理 / Readers ({readers.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-4">
            読み込み中...
          </p>
        ) : readers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            読影者がいません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2">Reader ID</th>
                  <th className="px-3 py-2">名前</th>
                  <th className="px-3 py-2">メール</th>
                  <th className="px-3 py-2">施設</th>
                  <th className="px-3 py-2">経験レベル</th>
                  <th className="px-3 py-2">セッション</th>
                  <th className="px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {readers.map((r) => (
                  <tr key={r.email} className="border-b">
                    <td className="px-3 py-2 font-mono">{r.reader_id}</td>
                    <td className="px-3 py-2">{r.display_name}</td>
                    <td className="px-3 py-2 text-xs">{r.email}</td>
                    <td className="px-3 py-2">{r.facility_name}</td>
                    <td className="px-3 py-2">
                      {r.reader_level ? (
                        <Badge variant="secondary">{r.reader_level}</Badge>
                      ) : (
                        <span className="text-muted-foreground">未設定</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.sessionCount}
                    </td>
                    <td className="px-3 py-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                          >
                            削除
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-destructive">
                              読影者を削除しますか？
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <span className="block">
                                <strong>{r.display_name}</strong> ({r.reader_id})
                                を削除します。
                              </span>
                              <span className="block font-medium text-destructive">
                                この操作は取り消せません。読影データもすべて削除されます。
                              </span>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(r.email)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              削除する
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
