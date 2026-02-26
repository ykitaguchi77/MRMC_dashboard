"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { isSuperAdminEmail } from "@/lib/firebase/auth";
import { getFacilitiesForAdmin } from "@/lib/firebase/firestore";
import type { UserRole, Facility } from "@/lib/types";

interface RoleState {
  role: UserRole | null;
  adminFacilities: Facility[];
  loading: boolean;
}

export function useRole(): RoleState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<RoleState>({
    role: null,
    adminFacilities: [],
    loading: true,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user?.email) {
      setState({ role: null, adminFacilities: [], loading: false });
      return;
    }

    async function determine() {
      const email = user!.email!;

      if (isSuperAdminEmail(email)) {
        setState({ role: "super_admin", adminFacilities: [], loading: false });
        return;
      }

      // Check if user is a facility admin
      const facilities = await getFacilitiesForAdmin(email);
      if (facilities.length > 0) {
        setState({
          role: "facility_admin",
          adminFacilities: facilities,
          loading: false,
        });
        return;
      }

      setState({ role: "reader", adminFacilities: [], loading: false });
    }

    determine();
  }, [user, authLoading]);

  return state;
}
