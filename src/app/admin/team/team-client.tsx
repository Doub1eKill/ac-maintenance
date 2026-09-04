"use client";

import { TeamPanel } from "@/components/admin/team-panel";
import { useDashboardSearch } from "@/components/layout/dashboard-search";
import { useUserStatus } from "@/components/admin/use-admin-actions";
import type { PendingUser } from "@/components/admin/types";

export function TeamClient({
  allUsers,
  currentUserId,
}: {
  allUsers: PendingUser[];
  currentUserId?: string | null;
}) {
  const search = useDashboardSearch();
  const { isPending, setUserStatus } = useUserStatus();

  return (
    <TeamPanel
      allUsers={allUsers}
      globalSearch={search}
      isPending={isPending}
      onUserStatus={setUserStatus}
      currentUserId={currentUserId}
    />
  );
}
