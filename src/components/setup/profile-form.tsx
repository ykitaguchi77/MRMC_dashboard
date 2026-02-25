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
import { FACILITIES } from "@/lib/constants/facilities";
import { EXPERIENCE_LEVELS } from "@/lib/constants/experience-levels";
import { saveReaderProfile } from "@/lib/firebase/firestore";
import type { ReaderProfile, ExperienceLevel } from "@/lib/types";

interface ProfileFormProps {
  email: string;
  initialProfile?: ReaderProfile | null;
  onSaved: (profile: ReaderProfile) => void;
}

export function ProfileForm({ email, initialProfile, onSaved }: ProfileFormProps) {
  const [facility, setFacility] = useState(initialProfile?.facility ?? "");
  const [readerId, setReaderId] = useState(initialProfile?.reader_id ?? "");
  const [level, setLevel] = useState(initialProfile?.reader_level ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isValid = facility && readerId.trim() && level;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    setError("");

    try {
      const profile: ReaderProfile = {
        email,
        reader_id: readerId.trim(),
        facility,
        reader_level: level as ExperienceLevel,
      };
      await saveReaderProfile(profile);
      onSaved(profile);
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
            {initialProfile ? "プロフィール編集" : "初回設定 — プロフィール登録"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Facility */}
          <div className="space-y-2">
            <Label>施設名 / Facility</Label>
            <Select value={facility} onValueChange={setFacility}>
              <SelectTrigger>
                <SelectValue placeholder="施設を選択..." />
              </SelectTrigger>
              <SelectContent>
                {FACILITIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reader ID */}
          <div className="space-y-2">
            <Label htmlFor="reader-id">Reader ID</Label>
            <Input
              id="reader-id"
              placeholder="例: OSK-01"
              value={readerId}
              onChange={(e) => setReaderId(e.target.value)}
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
            {saving ? "保存中..." : initialProfile ? "更新 / Update" : "登録して次へ / Save & Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
