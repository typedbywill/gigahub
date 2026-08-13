import { User } from '@gigahub/domain/identity';
import {
  type ErpCollaborator,
  type ErpUserDirectory,
  type IdGenerator,
  type UserRepository,
} from './ports';

export interface SyncUsersFromErpResult {
  created: number;
  updated: number;
  blocked: number;
  failed: number;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Syncs professional profile from IXC. Does not touch passwords (auth is live against ERP). */
export class SyncUsersFromErpUseCase {
  constructor(
    private readonly directory: ErpUserDirectory,
    private readonly users: UserRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(): Promise<SyncUsersFromErpResult> {
    const collaborators = await this.directory.listCollaborators();
    const seenErpIds = new Set<string>();
    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const row of collaborators) {
      try {
        const handled = await this.upsertCollaborator(row);
        if (handled === 'created') created += 1;
        if (handled === 'updated') updated += 1;
        if (handled !== 'skipped') {
          seenErpIds.add(row.idErp);
        }
      } catch {
        failed += 1;
      }
    }

    const blocked = await this.blockOrphans(seenErpIds);
    return { created, updated, blocked, failed };
  }

  private async upsertCollaborator(
    row: ErpCollaborator,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const email = row.email?.trim().toLowerCase() ?? '';
    if (!email || !isValidEmail(email)) {
      return 'skipped';
    }
    if (!row.idErp?.trim() || !row.idErpEmployee?.trim()) {
      return 'skipped';
    }

    const existing = await this.users.findByIdErp(row.idErp);
    if (existing) {
      existing.syncProfessionalProfile({
        name: row.name,
        jobTitle: row.jobTitle,
        cashboxId: row.cashboxId,
        warehouseId: row.warehouseId,
        planningId: row.planningId,
      });
      existing.applyErpActive(row.active);
      if (existing.email !== email) {
        const conflict = await this.users.findByEmail(email);
        if (!conflict || conflict.id === existing.id) {
          existing.changeEmail(email);
        }
      }
      await this.users.save(existing);
      return 'updated';
    }

    const byEmail = await this.users.findByEmail(email);
    if (byEmail) {
      if (!byEmail.hasErpLink()) {
        byEmail.linkErp({
          idErp: row.idErp,
          idErpEmployee: row.idErpEmployee,
        });
        byEmail.syncProfessionalProfile({
          name: row.name,
          jobTitle: row.jobTitle,
          cashboxId: row.cashboxId,
          warehouseId: row.warehouseId,
          planningId: row.planningId,
        });
        byEmail.applyErpActive(row.active);
        await this.users.save(byEmail);
        return 'updated';
      }
      throw new Error(`Email already linked to another ERP user: ${email}`);
    }

    const user = User.create({
      id: this.ids.generate(),
      email,
      name: row.name,
      status: row.active ? 'active' : 'blocked',
      idErp: row.idErp,
      idErpEmployee: row.idErpEmployee,
      jobTitle: row.jobTitle,
      cashboxId: row.cashboxId,
      warehouseId: row.warehouseId,
      planningId: row.planningId,
    });
    await this.users.save(user);
    return 'created';
  }

  private async blockOrphans(seenErpIds: Set<string>): Promise<number> {
    const linked = await this.users.findAllWithErpLink();
    let blocked = 0;
    for (const user of linked) {
      if (!user.idErp || seenErpIds.has(user.idErp)) {
        continue;
      }
      if (user.isActive()) {
        user.applyErpActive(false);
        await this.users.save(user);
        blocked += 1;
      }
    }
    return blocked;
  }
}
