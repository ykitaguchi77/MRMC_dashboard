"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRole } from "@/lib/hooks/useRole";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || roleLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (role === "super_admin" || role === "facility_admin") {
      router.replace("/admin");
    } else {
      router.replace("/setup");
    }
  }, [user, authLoading, role, roleLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}
