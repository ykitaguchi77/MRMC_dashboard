"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, resetPassword } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/setup");
    } catch {
      setError("メールアドレスまたはパスワードが正しくありません");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email) {
      setError("メールアドレスを入力してください");
      return;
    }
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch {
      setError("パスワードリセットメールの送信に失敗しました");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">CorneAI Reader Study</CardTitle>
          <p className="text-sm text-muted-foreground">
            MRMC Reading Study Portal
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="password">パスワード / Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {resetSent && (
              <p className="text-sm text-green-600">
                パスワードリセットメールを送信しました
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "ログイン中..." : "ログイン / Login"}
            </Button>
          </form>

          <button
            type="button"
            onClick={handleReset}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:underline"
          >
            パスワードを忘れた場合 / Forgot password
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
