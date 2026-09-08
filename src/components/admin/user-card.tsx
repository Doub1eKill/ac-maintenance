"use client";

import Image from "next/image";
import { Building2, Wrench } from "lucide-react";
import type { PendingUser } from "@/components/admin/types";

const STATUS_LABELS: Record<string, string> = {
  active: "ใช้งานอยู่",
  pending: "รออนุมัติ",
  suspended: "ถูกระงับ",
};

function statusClasses(status: string) {
  if (status === "active") return "bg-success/20 text-success-foreground border-success/30";
  if (status === "pending") return "bg-warning/20 text-warning-foreground border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "US";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface UserCardProps {
  user: PendingUser;
  /** Makes the whole card a button. Omitted where there is nothing to open. */
  onOpen?: () => void;
  /** An extra line under the chips — the approvals queue puts the request date here. */
  meta?: React.ReactNode;
  /**
   * The buttons along the bottom. Supplied by the page, because the two that
   * use this card ask opposite questions: one manages an account that exists,
   * the other decides whether it should.
   */
  actions: React.ReactNode;
}

/**
 * One person, as a card.
 *
 * Shared by the team directory and the approvals queue so the two pages that
 * show the same people cannot drift into showing them differently — the photo
 * treatment in particular, which is the part that took a decision.
 */
export function UserCard({ user, onOpen, meta, actions }: UserCardProps) {
  const RoleIcon = user.role === "technician" ? Wrench : Building2;

  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (!onOpen) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className={`overflow-hidden rounded-2xl border bg-card text-left transition-colors ${
        user.status === "pending" ? "border-warning/40" : "border-border"
      } ${onOpen ? "cursor-pointer hover:border-muted-foreground" : ""}`}
    >
      {/* 4:3 rather than portrait: it still leads with the photo, but three rows
          fit on a screen instead of two, which matters at forty people. */}
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-primary text-primary-foreground">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            // The name is directly below, so describing the picture would only
            // make a screen reader say it twice.
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <>
            {/* Every seeded account predates the registration change that made a
                photo mandatory, so the fallback is the common case here rather
                than the exception, and is worth looking deliberate. */}
            <RoleIcon className="absolute h-24 w-24 opacity-10" />
            <span className="relative text-3xl font-bold">{initialsOf(user.name)}</span>
          </>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{user.name}</p>
          {/* The login identity, and what the header search matches on — without
              it a search that hits nothing visible looks broken. */}
          <p className="truncate font-mono text-[11px] text-muted-foreground">{user.email}</p>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-foreground">
            <RoleIcon className="h-3 w-3" />
            {user.role === "technician" ? "ช่างเทคนิค" : "ผู้ดูแลระบบ"}
          </span>
          <span className={`rounded-md border px-2 py-0.5 ${statusClasses(user.status)}`}>
            {STATUS_LABELS[user.status] ?? user.status}
          </span>
        </div>

        {meta}

        {/* Every button inside stops the click: the card itself may open a panel,
            and without that, acting on someone would pop it open behind the
            confirmation dialog. */}
        <div
          className="flex gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      </div>
    </div>
  );
}
