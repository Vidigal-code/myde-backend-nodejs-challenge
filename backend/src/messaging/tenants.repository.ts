import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB, Database } from '@/db/drizzle.types';
import { tenants, Tenant } from '@/db/schema';

/** Resolução de tenant a partir do phone_number_id (multi-tenant). */
@Injectable()
export class TenantsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async findByPhoneNumberId(phoneNumberId: string): Promise<Tenant | null> {
    const [row] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.phoneNumberId, phoneNumberId))
      .limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<Tenant | null> {
    const [row] = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return row ?? null;
  }
}
