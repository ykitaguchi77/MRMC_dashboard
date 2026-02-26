"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  createInvite,
  getInvitesByFacility,
  getAllInvites,
  getAllFacilities,
  deleteInvite,
} from "@/lib/firebase/firestore";
import type { ReaderProfile, UserRole, Invite, Facility } from "@/lib/types";

interface ReaderManagerProps {
  role: UserRole;
  facilityIds?: string[];
  adminEmail: string;
  adminFacilities: Facility[];
}

interface ReaderRow extends ReaderProfile {
  sessionCount: number;
}

export function ReaderManager({
  role,
  facilityIds,
  adminEmail,
  adminFacilities,
}: ReaderManagerProps) {
  const [readers, setReaders] = useState<ReaderRow[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline invite form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newFacilityId, setNewFacilityId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);

  // Just-created invite highlight
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

  // Sender signature (persisted in localStorage)
  const [signature, setSignature] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("invite_signature") ?? "";
    }
    return "";
  });
  function handleSignatureChange(value: string) {
    setSignature(value);
    localStorage.setItem("invite_signature", value);
  }

  // All facilities (for super_admin)
  const [allFacilities, setAllFacilities] = useState<Facility[]>([]);

  // ── Facility password lookup ──
  // Build a map of facility_id -> password from Facility documents
  const facilityPasswordMap = useMemo(() => {
    const map: Record<string, string> = {};
    const facilities = role === "super_admin" ? allFacilities : adminFacilities;
    for (const f of facilities) {
      if (f.password) {
        map[f.facility_id] = f.password;
      }
    }
    return map;
  }, [role, allFacilities, adminFacilities]);

  // Resolve password for an invite: own value > facility lookup
  function getPasswordForInvite(inv: Invite): string {
    return inv.facility_password || facilityPasswordMap[inv.facility_id] || "";
  }

  // Resolve password for a facility (for new invite form)
  function getPasswordForFacility(facilityId: string): string {
    return facilityPasswordMap[facilityId] || "";
  }

  useEffect(() => {
    loadData();
  }, [role, facilityIds]);

  // Auto-select facility for single-facility admin
  useEffect(() => {
    if (role === "facility_admin" && adminFacilities.length === 1) {
      setNewFacilityId(adminFacilities[0].facility_id);
    }
  }, [role, adminFacilities]);

  // Auto-fill password when facility changes (for super_admin)
  useEffect(() => {
    if (newFacilityId) {
      const pw = getPasswordForFacility(newFacilityId);
      if (pw) setNewPassword(pw);
    }
  }, [newFacilityId, facilityPasswordMap]);

  async function loadData() {
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

      const rows: ReaderRow[] = await Promise.all(
        profiles.map(async (p) => {
          const sessions = await getSessionsByReader(p.reader_id);
          return { ...p, sessionCount: sessions.length };
        })
      );
      setReaders(rows);

      let inviteList: Invite[];
      if (role === "super_admin") {
        inviteList = await getAllInvites();
      } else {
        const allInv: Invite[] = [];
        for (const fid of facilityIds ?? []) {
          const fInvites = await getInvitesByFacility(fid);
          allInv.push(...fInvites);
        }
        inviteList = allInv;
      }
      setInvites(inviteList);

      if (role === "super_admin") {
        const facilities = await getAllFacilities();
        setAllFacilities(facilities);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(email: string) {
    try {
      await softDeleteReader(email);
      await loadData();
    } catch (err) {
      console.error("Failed to delete reader:", err);
    }
  }

  async function handleDeleteInvite(inviteId: string) {
    try {
      await deleteInvite(inviteId);
      await loadData();
    } catch (err) {
      console.error("Failed to delete invite:", err);
    }
  }

  function getAvailableFacilities(): Facility[] {
    if (role === "super_admin") return allFacilities;
    return adminFacilities;
  }

  function getFacilitySlug(facilityId: string): string {
    const all = [...allFacilities, ...adminFacilities];
    return all.find((f) => f.facility_id === facilityId)?.slug ?? "";
  }

  // ── mailto builders ──

  function buildSignatureBlock(): string {
    return signature ? `\n${signature}` : "";
  }

  function openInviteMailto(name: string, email: string, facilityId: string) {
    const slug = getFacilitySlug(facilityId);
    const registerUrl = `${window.location.origin}/register/${slug}?email=${encodeURIComponent(email)}`;
    const sig = buildSignatureBlock();
    const subject = encodeURIComponent("角膜読影研究への参加のお願い");
    const body = encodeURIComponent(
      `${name} 様\n\n角膜読影研究への参加をお願いいたします。\n\n以下のURLから読影者アカウントを作成してください：\n${registerUrl}\n\n施設パスワードは別途お送りします。\n\nよろしくお願いいたします。${sig}`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  }

  function openPasswordMailto(name: string, email: string, password: string) {
    const sig = buildSignatureBlock();
    const subject = encodeURIComponent("施設パスワードのお知らせ");
    const body = encodeURIComponent(
      `${name} 様\n\n施設パスワードをお送りします。\n\n施設パスワード: ${password}\n\nアカウント登録時にご使用ください。\n\nよろしくお願いいたします。${sig}`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  }

  // ── Invite actions ──

  async function handleInlineInvite() {
    if (!newName.trim() || !newEmail.trim() || !newFacilityId) return;

    // Resolve password: form input > facility lookup
    const password = newPassword || getPasswordForFacility(newFacilityId);

    setInviteSaving(true);
    try {
      const facility = getAvailableFacilities().find(
        (f) => f.facility_id === newFacilityId
      );
      if (!facility) return;

      const inviteId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await createInvite({
        invite_id: inviteId,
        facility_id: facility.facility_id,
        facility_name: facility.name,
        invitee_name: newName.trim(),
        invitee_email: newEmail.trim().toLowerCase(),
        facility_password: password,
        created_by: adminEmail,
        status: "pending",
        registered_at: null,
      });

      setJustCreatedId(inviteId);

      // Reset form (keep facility for facility_admin)
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      if (role === "super_admin" || adminFacilities.length > 1) {
        setNewFacilityId("");
      }
      await loadData();
    } catch (err) {
      console.error("Failed to create invite:", err);
      alert("招待の作成に失敗しました");
    } finally {
      setInviteSaving(false);
    }
  }

  const pendingInvites = invites.filter((inv) => inv.status === "pending");
  const showFacilityColumn = role === "super_admin" || adminFacilities.length > 1;
  // Show PW column only for super_admin (facility_admin's PW is auto-resolved)
  const showPasswordColumn = role === "super_admin";

  return (
    <div className="space-y-4">
      {/* Registered readers */}
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

      {/* Invite section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base shrink-0">
            招待 / Invites ({pendingInvites.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">署名:</span>
            <Input
              value={signature}
              onChange={(e) => handleSignatureChange(e.target.value)}
              placeholder="例: 山田太郎 / 大阪大学眼科"
              className="h-8 text-sm w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2">名前</th>
                  <th className="px-3 py-2">メール</th>
                  {showFacilityColumn && (
                    <th className="px-3 py-2">施設</th>
                  )}
                  {showPasswordColumn && (
                    <th className="px-3 py-2">施設PW</th>
                  )}
                  <th className="px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {/* Inline new invite row */}
                <tr className="border-b bg-muted/30">
                  <td className="px-3 py-2">
                    <Input
                      placeholder="名前"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </td>
                  {showFacilityColumn && (
                    <td className="px-3 py-2">
                      <Select
                        value={newFacilityId}
                        onValueChange={setNewFacilityId}
                      >
                        <SelectTrigger className="h-8 text-sm w-full">
                          <SelectValue placeholder="施設..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableFacilities().map((f) => (
                            <SelectItem key={f.facility_id} value={f.facility_id}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  )}
                  {showPasswordColumn && (
                    <td className="px-3 py-2">
                      <Input
                        placeholder="パスワード"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={
                        inviteSaving ||
                        !newName.trim() ||
                        !newEmail.trim() ||
                        !newFacilityId
                      }
                      onClick={handleInlineInvite}
                    >
                      {inviteSaving ? "保存中..." : "招待"}
                    </Button>
                  </td>
                </tr>

                {/* Pending invites */}
                {pendingInvites.map((inv) => {
                  const isJustCreated = inv.invite_id === justCreatedId;
                  const pw = getPasswordForInvite(inv);

                  return (
                    <tr
                      key={inv.invite_id}
                      className={
                        isJustCreated
                          ? "border-b bg-blue-50 dark:bg-blue-950/30"
                          : "border-b"
                      }
                    >
                      <td className="px-3 py-2">{inv.invitee_name}</td>
                      <td className="px-3 py-2 text-xs">{inv.invitee_email}</td>
                      {showFacilityColumn && (
                        <td className="px-3 py-2">{inv.facility_name}</td>
                      )}
                      {showPasswordColumn && (
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {pw ? "設定済み" : "未設定"}
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() =>
                              openInviteMailto(
                                inv.invitee_name,
                                inv.invitee_email,
                                inv.facility_id
                              )
                            }
                          >
                            招待メール
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={!pw}
                            onClick={() =>
                              openPasswordMailto(
                                inv.invitee_name,
                                inv.invitee_email,
                                pw
                              )
                            }
                          >
                            PW送信
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-destructive"
                            onClick={() => handleDeleteInvite(inv.invite_id)}
                          >
                            削除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {pendingInvites.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        2 +
                        (showFacilityColumn ? 1 : 0) +
                        (showPasswordColumn ? 1 : 0) +
                        1
                      }
                      className="px-3 py-4 text-center text-muted-foreground"
                    >
                      未登録の招待はありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
