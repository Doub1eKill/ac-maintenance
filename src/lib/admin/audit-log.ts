import { prisma } from "@/lib/prisma";
import { verifyOrgAdmin } from "@/lib/auth-guards";

// Reading back the audit trail.
const AUDIT_LOG_PAGE_SIZE = 50;

/**
 * Reads back the audit trail that logAudit has been writing all along and
 * which nothing has ever displayed. Paged rather than capped, so a filtered
 * search can reach beyond the newest page.
 */
export async function getAuditLogs(params?: { page?: number; action?: string }) {
  await verifyOrgAdmin();

  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const where = params?.action ? { action: params.action } : {};

  try {
    const [rows, total, actions] = await Promise.all([
      prisma.systemAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * AUDIT_LOG_PAGE_SIZE,
        take: AUDIT_LOG_PAGE_SIZE,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          oldValues: true,
          newValues: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
      prisma.systemAuditLog.count({ where }),
      // Drives the filter dropdown from what has actually been recorded,
      // rather than a hardcoded list that drifts as actions are added.
      prisma.systemAuditLog.findMany({
        distinct: ["action"],
        select: { action: true },
        orderBy: { action: "asc" },
      }),
    ]);

    return {
      logs: rows.map((row) => ({
        id: row.id.toString(),
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId.toString(),
        oldValues: row.oldValues,
        newValues: row.newValues,
        createdAt: row.createdAt.toISOString(),
        userName: row.user.name,
      })),
      page: {
        current: page,
        pageSize: AUDIT_LOG_PAGE_SIZE,
        total,
        hasMore: page * AUDIT_LOG_PAGE_SIZE < total,
      },
      availableActions: actions.map((a) => a.action),
    };
  } catch (error) {
    console.error("Failed to load audit logs:", error);
    return {
      logs: [],
      page: { current: 1, pageSize: AUDIT_LOG_PAGE_SIZE, total: 0, hasMore: false },
      availableActions: [],
      error: "ไม่สามารถโหลดประวัติการใช้งานระบบได้",
    };
  }
}
