import { prisma } from "./prisma";

interface AuditLogParams {
  universityId: bigint;
  userId: bigint;
  action: string;
  entityType: string;
  entityId: bigint;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldValues?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValues?: any;
  ipAddress?: string;
}

export async function logAudit(params: AuditLogParams) {
  return await prisma.systemAuditLog.create({
    data: {
      universityId: params.universityId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValues: params.oldValues ?? undefined,
      newValues: params.newValues ?? undefined,
      ipAddress: params.ipAddress,
    }
  });
}

// Batch variant: one INSERT for the whole set instead of one round trip per
// entity. Use when a single user action touches many rows (e.g. bulk claim).
export async function logAuditMany(entries: AuditLogParams[]) {
  if (entries.length === 0) return;

  return await prisma.systemAuditLog.createMany({
    data: entries.map((params) => ({
      universityId: params.universityId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValues: params.oldValues ?? undefined,
      newValues: params.newValues ?? undefined,
      ipAddress: params.ipAddress,
    })),
  });
}
