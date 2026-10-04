import { db } from "@/lib/db";

interface Actor {
  userId: string;
  orgId: string;
  name?: string;
}

/** Records one entry in the org's audit log. Never throws: a logging
 * failure must not block the action being logged. */
export async function recordAudit(
  actor: Actor,
  action: string,
  entityType: string,
  summary: string,
  entityId?: string,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        orgId: actor.orgId,
        actorUserId: actor.userId,
        actorName: actor.name ?? "Unknown",
        action,
        entityType,
        entityId,
        summary,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log entry", err);
  }
}
