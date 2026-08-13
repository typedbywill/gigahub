import type { CatalogPermissionId } from './permission';

export interface RoleSeedDefinition {
  slug: string;
  name: string;
  permissionIds: CatalogPermissionId[];
}

/**
 * Default product roles for bootstrap/dev seed.
 * Persist via Role.create — composition remains mutable after seed.
 */
export const DEFAULT_ROLE_SEEDS: readonly RoleSeedDefinition[] = [
  {
    slug: 'tecnico',
    name: 'Técnico',
    permissionIds: ['work-order:read', 'work-order:execute'],
  },
  {
    slug: 'supervisor',
    name: 'Supervisor',
    permissionIds: [
      'work-order:read',
      'work-order:execute',
      'work-order:review',
      'care:inbox:read',
      'care:ticket:assign',
      'telemetry:location:read',
    ],
  },
  {
    slug: 'financeiro',
    name: 'Financeiro',
    permissionIds: ['finance:cashbox:inspect'],
  },
  {
    slug: 'admin-acesso',
    name: 'Administrador de acesso',
    permissionIds: [
      'access:manage',
      'work-order:read',
      'care:inbox:read',
      'telemetry:location:read',
    ],
  },
] as const;
