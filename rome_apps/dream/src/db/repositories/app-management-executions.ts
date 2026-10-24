import type { AppDbContext } from "@rome-os/app-runtime";
import { sql } from "drizzle-orm";

export interface AppManagementExecution {
  actionName: string;
  args: unknown;
  initiator: string | null;
  status: string;
}

interface AppManagementExecutionRow {
  action_name: string;
  args: unknown;
  initiator: string | null;
  status: string;
}

export class AppManagementExecutionsRepository {
  constructor(private readonly db: AppDbContext) {}

  duringCapture(startedAt: Date, endedAt: Date): AppManagementExecution[] {
    const rows = this.db.connection.all(sql`
      SELECT action_name, args, initiator, status
      FROM action_executions
      WHERE action_name IN ('app_management', 'system:app_management')
        AND started_at <= ${Math.floor(endedAt.getTime() / 1000)}
        AND (finished_at IS NULL OR finished_at >= ${Math.floor(startedAt.getTime() / 1000)})
        AND status != 'pending_approval'
    `) as AppManagementExecutionRow[];

    return rows.map((row) => ({
      actionName: row.action_name,
      args: row.args,
      initiator: row.initiator,
      status: row.status,
    }));
  }
}
