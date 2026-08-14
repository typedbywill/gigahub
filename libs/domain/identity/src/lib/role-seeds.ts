import type { CatalogPermissionId } from './permission';

export interface RoleSeedDefinition {
  slug: string;
  name: string;
  permissionIds: CatalogPermissionId[];
}

/**
 * Default product roles for bootstrap (idempotent on API startup).
 * Includes admin-acesso so a manually granted first admin can manage access.
 * Persist via Role.create — composition remains mutable after seed.
 */
export const DEFAULT_ROLE_SEEDS: readonly RoleSeedDefinition[] = [
  {
    slug: 'tecnico',
    name: 'Técnico',
    permissionIds: [
      'work-order:read',
      'work-order:execute',
      'customer:read',
      'demand:read',
      'demand:open',
      'demand:claim',
      'demand:reply',
    ],
  },
  {
    slug: 'supervisor',
    name: 'Supervisor',
    permissionIds: [
      'work-order:read',
      'work-order:execute',
      'work-order:review',
      'demand:read',
      'demand:read:all',
      'demand:open',
      'demand:claim',
      'demand:assign',
      'demand:reply',
      'demand:close',
      'demand:subject:manage',
      'telemetry:location:read',
      'users:read',
      'customer:read',
    ],
  },
  {
    slug: 'financeiro',
    name: 'Financeiro',
    permissionIds: ['finance:cashbox:inspect', 'demand:read', 'demand:open', 'demand:claim', 'demand:reply'],
  },
  {
    slug: 'admin-acesso',
    name: 'Administrador de acesso',
    permissionIds: [
      'access:manage',
      'users:read',
      'users:update',
      'users:inactivate',
      'work-order:read',
      'demand:read',
      'demand:read:all',
      'demand:subject:manage',
      'telemetry:location:read',
      'customer:read',
    ],
  },
] as const;
