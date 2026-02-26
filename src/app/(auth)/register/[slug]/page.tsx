"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createAccount, sendVerificationEmail } from "@/lib/firebase/auth";
import {
  getFacilityBySlug,
  generateReaderId,
  saveReaderProfile,
} from "@/lib/firebase/firestore";
import { verifyPassword } from "@/lib/utils/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { Facility } from "@/lib/types";
import { serverTimestamp } from "firebase/firestore";

type Step = "loading" | "not_found" | "password" | "register" | "complete";

export default function FacilityRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [step, setStep] = useState<Step>("loading");
  const [facility, setFacility] = useState<Facility | null>(null);

  // Step 1: facility password
  const [facilityPassword, setFacilityPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Step 2: account creation
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Step 3: completion
  const [assignedReaderId, setAssignedReaderId] = useState("");

  useEffect(() => {
    async function load() {
      const fac = await getFacilityBySlug(slug);
      if (!fac) {
        setStep("not_found");
        return;
      }
      setFacility(fac);
      setStep("password");
    }
    load();
  }, [slug]);

  async function handlePasswordCheck(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwLoading(true);
    try {
      const valid = await verifyPassword(
        facilityPassword,
        facility!.password_hash
      );
      if (!valid) {
        setPwError("パスワードが正しくありません");
        return;
      }
      setStep("register");
    } catch {
      setPwError("検証に失敗しました");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");

    if (password !== confirmPassword) {
      setRegError("パスワードが一致しません");
      return;
    }
    if (password.length < 6) {
      setRegError("パスワードは6文字以上で入力してください");
      return;
    }
    if (!displayName.trim()) {
      setRegError("表示名を入力してください");
      return;
    }

    setRegLoading(true);
    try {
      // Create Firebase Auth account
      const credential = await createAccount(email, password);
      const uid = credential.user.uid;
      const userEmail = credential.user.email!;

      // Generate Reader ID (transactional)
      const { readerId, readerNumber } = await generateReaderId(
        facility!.facility_id
      );

      // Save reader profile
      await saveReaderProfile({
        email: userEmail,
        uid,
        reader_id: readerId,
        reader_number: readerNumber,
        facility_id: facility!.facility_id,
        facility_name: facility!.name,
        display_name: displayName.trim(),
        reader_level: null,
        disabled: false,
        created_at: serverTimestamp(),
      });

      // Send verification email with login URL
      const loginUrl = `${window.location.origin}/login`;
      try {
        await sendVerificationEmail(credential.user, loginUrl);
      } catch {
        // Non-critical: continue even if email fails
        console.warn("Verification email failed to send");
      }

      setAssignedReaderId(readerId);
      setStep("complete");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        setRegError(
          "このメールアドレスは既に登録されています。ログインページからログインしてください。"
        );
      } else if (code === "auth/invalid-email") {
        setRegError("メールアドレスの形式が正しくありません");
      } else if (code === "auth/weak-password") {
        setRegError("パスワードが脆弱です。より強力なパスワードを設定してください");
      } else {
        setRegError("アカウント作成に失敗しました");
      }
    } finally {
      setRegLoading(false);
    }
  }

  // --- Loading ---
  if (step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center text-muted-foreground">
            読み込み中...
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Not found ---
  if (step === "not_found") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-destructive">
              施設が見つかりません
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              このURLは無効です。施設管理者に正しいURLを確認してください。
            </p>
            <Button variant="outline" onClick={() => router.push("/login")}>
              ログインページへ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Complete ---
  if (step === "complete") {
    const loginUrl = `${window.location.origin}/login`;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-green-700">
              登録完了
            </CardTitle>
            <CardDescription>
              {facility!.name} への登録が完了しました
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reader ID</span>
                <span className="font-mono font-medium">{assignedReaderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">メール</span>
                <span className="text-xs">{email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ログインURL</span>
                <span className="font-mono text-xs">{loginUrl}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              確認メールを送信しました。メール内のリンクからログインページにアクセスできます。
            </p>
            <Button
              className="w-full"
              onClick={() => router.replace("/setup")}
            >
              読影を開始する / Start Reading
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Step 1: Facility password ---
  if (step === "password") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{facility!.name}</CardTitle>
            <CardDescription>Reader Study 登録</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordCheck} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="facility-pw">
                  施設パスワード / Facility Password
                </Label>
                <Input
                  id="facility-pw"
                  type="password"
                  value={facilityPassword}
                  onChange={(e) => setFacilityPassword(e.target.value)}
                  placeholder="施設管理者から提供されたパスワード"
                  required
                />
              </div>
              {pwError && <p className="text-sm text-destructive">{pwError}</p>}
              <Button type="submit" className="w-full" disabled={pwLoading}>
                {pwLoading ? "確認中..." : "確認 / Verify"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-sm text-muted-foreground hover:underline"
              >
                既にアカウントをお持ちの方 / Already have an account?
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Step 2: Account creation ---
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {facility!.name} — アカウント登録
          </CardTitle>
          <CardDescription>
            Reader IDは自動で付与されます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス / Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reader@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">
                表示名 / Display Name
              </Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例: 田中太郎"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード / Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                パスワード確認 / Confirm Password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="パスワードを再入力"
                required
              />
            </div>

            {regError && (
              <p className="text-sm text-destructive">{regError}</p>
            )}

            <Button type="submit" className="w-full" disabled={regLoading}>
              {regLoading ? "作成中..." : "アカウント作成 / Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-sm text-muted-foreground hover:underline"
            >
              既にアカウントをお持ちの方 / Already have an account?
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
