"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getReaderProfile } from "@/lib/firebase/firestore";
import { ProfileForm } from "@/components/setup/profile-form";
import { TaskPanel } from "@/components/setup/task-panel";
import type { ReaderProfile } from "@/lib/types";

type Phase = "loading" | "profile_needed" | "task_panel";

export default function SetupPage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [profile, setProfile] = useState<ReaderProfile | null>(null);
  const [editMode, setEditMode] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user?.email) return;
    try {
      const existing = await getReaderProfile(user.email);
      if (existing) {
        // Reader exists — check if initial setup needed (reader_level null)
        if (!existing.reader_level) {
          setProfile(existing);
          setPhase("profile_needed");
        } else {
          setProfile(existing);
          setPhase("task_panel");
        }
      } else {
        // No profile — this shouldn't happen with facility-based registration
        // but handle gracefully
        setPhase("profile_needed");
      }
    } catch (err) {
      console.error(err);
      setPhase("profile_needed");
    }
  }, [user?.email]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function handleProfileSaved(saved: ReaderProfile) {
    setProfile(saved);
    setEditMode(false);
    setPhase("task_panel");
  }

  if (!user?.email) return null;

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if ((phase === "profile_needed" || editMode) && profile) {
    return (
      <ProfileForm
        email={user.email}
        initialProfile={profile}
        onSaved={handleProfileSaved}
      />
    );
  }

  // No profile at all (edge case — shouldn't happen with facility registration)
  if (phase === "profile_needed" && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <p>プロフィールが見つかりません。</p>
          <p className="text-sm">施設の登録URLからアカウントを作成してください。</p>
        </div>
      </div>
    );
  }

  if (phase === "task_panel" && profile) {
    return (
      <TaskPanel
        profile={profile}
        email={user.email}
        onEditProfile={() => setEditMode(true)}
      />
    );
  }

  return null;
}
