import { routes } from '../../shared/routes';

export type UsersListStatusFilter = 'all' | 'active' | 'blocked';

export interface UsersListSearchState {
  q: string;
  status: UsersListStatusFilter;
  erpLinked?: boolean;
  page: number;
}

function parseStatus(value: string | null): UsersListStatusFilter {
  if (value === 'active' || value === 'blocked') {
    return value;
  }
  return 'all';
}

export function parseUsersListSearch(
  params: URLSearchParams,
): UsersListSearchState {
  const erp = params.get('erp');
  const pageRaw = Number(params.get('page') ?? '1');
  return {
    q: params.get('q')?.trim() ?? '',
    status: parseStatus(params.get('status')),
    erpLinked: erp === '1' ? true : erp === '0' ? false : undefined,
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
  };
}

export function toUsersListSearchParams(
  state: UsersListSearchState,
): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) {
    params.set('q', state.q);
  }
  if (state.status !== 'all') {
    params.set('status', state.status);
  }
  if (state.erpLinked === true) {
    params.set('erp', '1');
  } else if (state.erpLinked === false) {
    params.set('erp', '0');
  }
  if (state.page > 1) {
    params.set('page', String(state.page));
  }
  return params;
}

export function usersListHref(state: UsersListSearchState): string {
  const params = toUsersListSearchParams(state);
  const query = params.toString();
  return query ? `${routes.usuarios}?${query}` : routes.usuarios;
}
