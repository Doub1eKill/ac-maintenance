"use client";

import { useState } from "react";
import { TeamPanel } from "@/components/admin/team-panel";
import { TechnicianDetailModal } from "@/components/admin/technician-detail-modal";
import { useDashboardSearch } from "@/components/layout/dashboard-search";
import { useUserStatus } from "@/components/admin/use-admin-actions";
import { useLivePresence } from "@/components/admin/use-live-presence";
import type { PendingUser } from "@/components/admin/types";

export function TeamClient({
  allUsers,
  currentUserId,
}: {
  allUsers: PendingUser[];
  currentUserId?: string | null;
}) {
  const search = useDashboardSearch();
  const { isPending, setUserStatus, deleteUser } = useUserStatus();
  const users = useLivePresence(allUsers);
  // Held here rather than inside the panel so the modal is not re-created when
  // the grid re-renders after a status change. Kept as an id and looked up, so
  // the open panel follows the same live Online flag as the grid.
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const detailUser = detailUserId ? users.find((u) => u.id === detailUserId) ?? null : null;

  return (
    <>
      <TeamPanel
        allUsers={users}
        globalSearch={search}
        isPending={isPending}
        onUserStatus={setUserStatus}
        onDeleteUser={deleteUser}
        currentUserId={currentUserId}
        onOpenDetail={(user: PendingUser) => setDetailUserId(user.id)}
      />

      {detailUser && (
        <TechnicianDetailModal
          user={detailUser}
          currentUserId={currentUserId}
          isPending={isPending}
          onUserStatus={setUserStatus}
          onDeleteUser={deleteUser}
          onClose={() => setDetailUserId(null)}
        />
      )}
    </>
  );
}
