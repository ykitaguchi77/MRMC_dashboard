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
        setProfile(existing);
        setPhase("task_panel");
      } else {
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

  // Profile saved callback
  function handleProfileSaved(saved: ReaderProfile) {
    setProfile(saved);
    setEditMode(false);
    setPhase("task_panel");
  }

  if (!user?.email) return null;

  // Loading
  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  // Profile form (first login or edit mode)
  if (phase === "profile_needed" || editMode) {
    return (
      <ProfileForm
        email={user.email}
        initialProfile={profile}
        onSaved={handleProfileSaved}
      />
    );
  }

  // Task panel
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
