"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPERIENCE_LEVELS } from "@/lib/constants/experience-levels";
import {
  updateReaderLevel,
  updateReaderDisplayName,
} from "@/lib/firebase/firestore";
import type { ReaderProfile, ExperienceLevel } from "@/lib/types";

interface ProfileFormProps {
  email: string;
  initialProfile: ReaderProfile;
  onSaved: (profile: ReaderProfile) => void;
}

export function ProfileForm({
  email,
  initialProfile,
  onSaved,
}: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(
    initialProfile.display_name ?? ""
  );
  const [level, setLevel] = useState<string>(
    initialProfile.reader_level ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isValid = level !== "";

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    setError("");

    try {
      if (displayName.trim() !== initialProfile.display_name) {
        await updateReaderDisplayName(email, displayName.trim());
      }
      await updateReaderLevel(email, level as ExperienceLevel);

      onSaved({
        ...initialProfile,
        display_name: displayName.trim(),
        reader_level: level as ExperienceLevel,
      });
    } catch (err) {
      console.error(err);
      setError("保存に失敗しました。再度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">CorneAI Reader Study</CardTitle>
          <CardDescription>
            {initialProfile.reader_level
              ? "プロフィール編集"
              : "初回設定 — プロフィール登録"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Facility (read-only) */}
          <div className="space-y-2">
            <Label>施設名 / Facility</Label>
            <Input value={initialProfile.facility_name} disabled />
          </div>

          {/* Reader ID (read-only) */}
          <div className="space-y-2">
            <Label>Reader ID</Label>
            <Input
              value={initialProfile.reader_id}
              disabled
              className="font-mono"
            />
          </div>

          {/* Display Name (editable) */}
          <div className="space-y-2">
            <Label htmlFor="display-name">表示名 / Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Experience Level */}
          <div className="space-y-2">
            <Label>経験レベル / Experience Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="選択..." />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.ja} / {l.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full"
            size="lg"
            disabled={!isValid || saving}
            onClick={handleSave}
          >
            {saving
              ? "保存中..."
              : initialProfile.reader_level
                ? "更新 / Update"
                : "登録して次へ / Save & Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
