"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  createFacility,
  getAllFacilities,
  updateFacility,
  deleteFacility,
  addFacilityAdmin,
  removeFacilityAdmin,
} from "@/lib/firebase/firestore";
import { hashPassword } from "@/lib/utils/password";
import type { Facility } from "@/lib/types";

export function FacilityManager({ adminEmail }: { adminEmail: string }) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [prefix, setPrefix] = useState("");
  const [facilityPw, setFacilityPw] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState("");

  // Admin management
  const [adminDialogFacility, setAdminDialogFacility] = useState<Facility | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState("");

  useEffect(() => {
    loadFacilities();
  }, []);

  async function loadFacilities() {
    setLoading(true);
    try {
      setFacilities(await getAllFacilities());
    } catch (err) {
      console.error("Failed to load facilities:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name || !slug || !prefix || !facilityPw) return;
    setCreating(true);
    try {
      const facilityId = uuidv4();
      const passwordHash = await hashPassword(facilityPw);
      await createFacility({
        facility_id: facilityId,
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        prefix: prefix.toUpperCase(),
        password_hash: passwordHash,
        next_reader_number: 1,
        recycled_numbers: [],
        admins: [],
        created_by: adminEmail,
      });
      setCreatedUrl(
        `${window.location.origin}/register/${slug.toLowerCase().replace(/[^a-z0-9-]/g, "")}`
      );
      await loadFacilities();
    } catch (err) {
      console.error("Failed to create facility:", err);
    } finally {
      setCreating(false);
    }
  }

  function handleCreateClose() {
    setCreateOpen(false);
    setName("");
    setSlug("");
    setPrefix("");
    setFacilityPw("");
    setCreatedUrl("");
  }

  async function handleDeleteFacility(facilityId: string) {
    try {
      await deleteFacility(facilityId);
      await loadFacilities();
    } catch (err) {
      console.error("Failed to delete facility:", err);
    }
  }

  async function handleAddAdmin() {
    if (!adminDialogFacility || !newAdminEmail) return;
    try {
      await addFacilityAdmin(adminDialogFacility.facility_id, newAdminEmail);
      setNewAdminEmail("");
      await loadFacilities();
      // Update local state for dialog
      const updated = await getAllFacilities();
      setAdminDialogFacility(
        updated.find((f) => f.facility_id === adminDialogFacility.facility_id) ??
          null
      );
    } catch (err) {
      console.error("Failed to add admin:", err);
    }
  }

  async function handleRemoveAdmin(facilityId: string, email: string) {
    try {
      await removeFacilityAdmin(facilityId, email);
      await loadFacilities();
      const updated = await getAllFacilities();
      setAdminDialogFacility(
        updated.find((f) => f.facility_id === facilityId) ?? null
      );
    } catch (err) {
      console.error("Failed to remove admin:", err);
    }
  }

  async function handleChangePassword(facilityId: string) {
    const newPw = prompt("新しい施設パスワードを入力してください:");
    if (!newPw) return;
    try {
      const hash = await hashPassword(newPw);
      await updateFacility(facilityId, { password_hash: hash });
      alert("パスワードを変更しました");
    } catch (err) {
      console.error("Failed to change password:", err);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>施設管理 / Facilities ({facilities.length})</CardTitle>
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            if (!open) handleCreateClose();
            else setCreateOpen(true);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">施設を追加</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>施設を作成</DialogTitle>
              <DialogDescription>
                施設名、URL用スラッグ、Reader IDプレフィックス、施設パスワードを設定します。
              </DialogDescription>
            </DialogHeader>
            {!createdUrl ? (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>施設名</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="例: 大阪大学"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>スラッグ (URL用)</Label>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="例: osaka-u"
                    />
                    <p className="text-xs text-muted-foreground">
                      /register/{slug || "xxx"} が登録URLになります
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Reader IDプレフィックス</Label>
                    <Input
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      placeholder="例: OSK"
                      maxLength={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Reader IDは {prefix || "XXX"}_001 の形式になります
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>施設パスワード</Label>
                    <Input
                      type="password"
                      value={facilityPw}
                      onChange={(e) => setFacilityPw(e.target.value)}
                      placeholder="読影者登録時に使用するパスワード"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !name || !slug || !prefix || !facilityPw}
                  >
                    {creating ? "作成中..." : "作成"}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="space-y-3">
                <Label>施設登録URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={createdUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => navigator.clipboard.writeText(createdUrl)}
                  >
                    コピー
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  このURLと施設パスワードを施設管理者に共有してください。
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCreateClose}>
                    閉じる
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-4">
            読み込み中...
          </p>
        ) : facilities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            施設がありません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2">施設名</th>
                  <th className="px-3 py-2">スラッグ</th>
                  <th className="px-3 py-2">プレフィックス</th>
                  <th className="px-3 py-2">管理者</th>
                  <th className="px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((f) => (
                  <tr key={f.facility_id} className="border-b">
                    <td className="px-3 py-2 font-medium">{f.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      /register/{f.slug}
                    </td>
                    <td className="px-3 py-2 font-mono">{f.prefix}</td>
                    <td className="px-3 py-2 text-xs">
                      {f.admins.length > 0
                        ? f.admins.join(", ")
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAdminDialogFacility(f)}
                        >
                          管理者
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleChangePassword(f.facility_id)
                          }
                        >
                          PW変更
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              削除
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                施設を削除しますか？
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                「{f.name}」を削除します。この操作は取り消せません。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteFacility(f.facility_id)
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                削除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Admin management dialog */}
        <Dialog
          open={!!adminDialogFacility}
          onOpenChange={(open) => {
            if (!open) {
              setAdminDialogFacility(null);
              setNewAdminEmail("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {adminDialogFacility?.name} — 施設管理者
              </DialogTitle>
              <DialogDescription>
                施設管理者のメールアドレスを管理します。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {adminDialogFacility?.admins.map((a) => (
                <div
                  key={a}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <span className="text-sm font-mono">{a}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      handleRemoveAdmin(
                        adminDialogFacility!.facility_id,
                        a
                      )
                    }
                  >
                    削除
                  </Button>
                </div>
              ))}
              {adminDialogFacility?.admins.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  施設管理者が未登録です
                </p>
              )}
              <div className="flex gap-2">
                <Input
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  type="email"
                />
                <Button
                  size="sm"
                  onClick={handleAddAdmin}
                  disabled={!newAdminEmail}
                >
                  追加
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
