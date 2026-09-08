"use client";

import { UserApprovalsPanel } from "@/components/admin/user-approvals-panel";
import { useDashboardSearch } from "@/components/layout/dashboard-search";
import { useUserStatus } from "@/components/admin/use-admin-actions";
import type { PendingUserWithContact } from "@/components/admin/types";

export function ApprovalsClient({
  pendingUsers,
  universityName,
}: {
  pendingUsers: PendingUserWithContact[];
  universityName: string;
}) {
  const search = useDashboardSearch();
  const { isPending, setUserStatus } = useUserStatus();

  return (
    <UserApprovalsPanel
      pendingUsers={pendingUsers}
      globalSearch={search}
      universityName={universityName}
      isPending={isPending}
      onUserStatus={setUserStatus}
    />
  );
}
