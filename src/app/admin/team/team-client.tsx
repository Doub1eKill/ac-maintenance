"use client";

import { useState } from "react";
import { TeamPanel } from "@/components/admin/team-panel";
import { TechnicianDetailModal } from "@/components/admin/technician-detail-modal";
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
  // Held here rather than inside the panel so the modal is not re-created when
  // the grid re-renders after a status change.
  const [detailUser, setDetailUser] = useState<PendingUser | null>(null);

  return (
    <>
      <TeamPanel
        allUsers={allUsers}
        globalSearch={search}
        isPending={isPending}
        onUserStatus={setUserStatus}
        currentUserId={currentUserId}
        onOpenDetail={setDetailUser}
      />

      {detailUser && (
        <TechnicianDetailModal
          user={detailUser}
          currentUserId={currentUserId}
          isPending={isPending}
          onUserStatus={setUserStatus}
          onClose={() => setDetailUser(null)}
        />
      )}
    </>
  );
}
