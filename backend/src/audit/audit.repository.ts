import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB, Database, DbExecutor } from '@/db/drizzle.types';
import { auditLogs, NewAuditLog } from '@/db/schema';

/** Persistência da trilha de auditoria. */
@Injectable()
export class AuditRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async insert(entry: NewAuditLog, exec: DbExecutor = this.db): Promise<void> {
    await exec.insert(auditLogs).values(entry);
  }
}
