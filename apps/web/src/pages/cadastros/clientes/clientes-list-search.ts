export interface ClientesListSearchState {
  q: string;
  status: 'all' | 'active' | 'inactive' | 'blocked' | 'cancelled';
  limit: number;
}

export const DEFAULT_CLIENTES_SEARCH: ClientesListSearchState = {
  q: '',
  status: 'all',
  limit: 20,
};

export function parseClientesListSearch(searchParams: URLSearchParams): ClientesListSearchState {
  const q = searchParams.get('q')?.trim() ?? '';
  const statusParam = searchParams.get('status');
  const status: ClientesListSearchState['status'] =
    statusParam === 'active' ||
    statusParam === 'inactive' ||
    statusParam === 'blocked' ||
    statusParam === 'cancelled'
      ? statusParam
      : 'all';

  const limitParam = Number(searchParams.get('limit'));
  const limit = Number.isInteger(limitParam) && limitParam > 0 && limitParam <= 100 ? limitParam : 20;

  return {
    q,
    status,
    limit,
  };
}

export function toClientesListSearchParams(state: ClientesListSearchState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q.trim()) {
    params.set('q', state.q.trim());
  }
  if (state.status !== 'all') {
    params.set('status', state.status);
  }
  if (state.limit !== 20) {
    params.set('limit', String(state.limit));
  }
  return params;
}

export function clientesListHref(state: ClientesListSearchState): string {
  const params = toClientesListSearchParams(state);
  const qs = params.toString();
  return `/cadastros/clientes${qs ? `?${qs}` : ''}`;
}
