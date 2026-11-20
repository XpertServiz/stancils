import { db, type Tx } from "./db";
import { plain } from "./money";

export async function audit(
  actorId: string | null | undefined,
  action: string,
  entity: string,
  entityId?: string | null,
  before?: unknown,
  after?: unknown,
  tx: Tx = db,
) {
  await tx.auditLog.create({
    data: {
      actorId: actorId ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      before: before === undefined ? undefined : (plain(before) as object),
      after: after === undefined ? undefined : (plain(after) as object),
    },
  });
}
