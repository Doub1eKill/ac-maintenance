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
