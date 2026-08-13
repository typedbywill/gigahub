import {
  type Brand,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
} from '@gigahub/shared/kernel';

export interface PermissionDefinition {
  id: string;
  title: string;
  description?: string;
  group: string;
}

export const PERMISSION_CATALOG = [
  {
    id: 'work-order:read',
    title: 'Ler ordens de serviço',
    description: 'Mostrar informações das ordens de serviço',
    group: 'work-order',
  },
  {
    id: 'work-order:execute',
    title: 'Executar ordens de serviço',
    description: 'Iniciar e concluir execução em campo',
    group: 'work-order',
  },
  {
    id: 'work-order:review',
    title: 'Revisar ordens de serviço',
    group: 'work-order',
  },
  {
    id: 'care:inbox:read',
    title: 'Ler caixas de atendimento',
    group: 'care',
  },
  {
    id: 'care:ticket:assign',
    title: 'Atribuir tickets de atendimento',
    group: 'care',
  },
  {
    id: 'finance:cashbox:inspect',
    title: 'Inspecionar caixa',
    group: 'finance',
  },
  {
    id: 'telemetry:location:read',
    title: 'Ler localização de colaboradores',
    group: 'telemetry',
  },
  {
    id: 'gamification:adjust',
    title: 'Ajustar pontuação',
    group: 'gamification',
  },
  {
    id: 'users:read',
    title: 'Ler usuários',
    description: 'Listar e visualizar colaboradores',
    group: 'users',
  },
  {
    id: 'users:update',
    title: 'Atualizar usuários',
    description: 'Alterar perfil e avatar de colaboradores',
    group: 'users',
  },
  {
    id: 'users:inactivate',
    title: 'Inativar usuários',
    description: 'Bloquear colaboradores e revogar sessões',
    group: 'users',
  },
  {
    id: 'access:manage',
    title: 'Gerenciar acesso',
    description:
      'Administrar roles, grants, permissões de roles e atribuição de acesso a usuários',
    group: 'access',
  },
] as const satisfies readonly PermissionDefinition[];

export type CatalogPermissionId = (typeof PERMISSION_CATALOG)[number]['id'];

export type PermissionId = Brand<CatalogPermissionId, 'PermissionId'>;

const CATALOG_BY_ID = new Map<string, PermissionDefinition>(
  PERMISSION_CATALOG.map((entry) => [entry.id, entry]),
);

export const PERMISSION_GROUPS = [
  ...new Set(PERMISSION_CATALOG.map((entry) => entry.group)),
] as const;

export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

export function permissionId(value: string): PermissionId {
  const normalized = assertNonEmpty(value, 'permissionId');
  const definition = CATALOG_BY_ID.get(normalized);
  if (!definition) {
    throw new DomainError(
      DomainErrorCodes.UnknownPermission,
      `Unknown permission: ${normalized}`,
      { permissionId: normalized },
    );
  }
  return definition.id as PermissionId;
}

export function getPermission(id: PermissionId | string): PermissionDefinition {
  const resolved = typeof id === 'string' ? permissionId(id) : id;
  const definition = CATALOG_BY_ID.get(resolved);
  if (!definition) {
    throw new DomainError(
      DomainErrorCodes.UnknownPermission,
      `Unknown permission: ${resolved}`,
      { permissionId: resolved },
    );
  }
  return { ...definition };
}

export function listPermissions(): PermissionDefinition[] {
  return PERMISSION_CATALOG.map((entry) => ({ ...entry }));
}

export function listPermissionsByGroup(
  group: string,
): PermissionDefinition[] {
  const normalized = assertNonEmpty(group, 'group');
  return PERMISSION_CATALOG.filter((entry) => entry.group === normalized).map(
    (entry) => ({ ...entry }),
  );
}

export function isKnownPermissionId(value: string): value is CatalogPermissionId {
  return CATALOG_BY_ID.has(value);
}
