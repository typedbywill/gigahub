import { routes } from '../../shared/routes';

export type DemandViewMode = 'mine' | 'queue' | 'claimed' | 'all';

export interface DemandListSearchState {
  view: DemandViewMode;
  status?: string;
  subjectId?: string;
  queueId?: string;
  q: string;
  page: number;
}

export function parseDemandListSearch(
  view: DemandViewMode,
  params: URLSearchParams,
): DemandListSearchState {
  const pageRaw = Number(params.get('page') ?? '1');
  return {
    view,
    status: params.get('status') || undefined,
    subjectId: params.get('subjectId') || undefined,
    queueId: params.get('queueId') || undefined,
    q: params.get('q')?.trim() ?? '',
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
  };
}

export function toDemandListSearchParams(
  state: DemandListSearchState,
): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) {
    params.set('q', state.q);
  }
  if (state.status) {
    params.set('status', state.status);
  }
  if (state.subjectId) {
    params.set('subjectId', state.subjectId);
  }
  if (state.queueId) {
    params.set('queueId', state.queueId);
  }
  if (state.page > 1) {
    params.set('page', String(state.page));
  }
  return params;
}

export function demandListViewHref(
  view: DemandViewMode,
  state?: Partial<DemandListSearchState>,
): string {
  const basePath =
    view === 'mine'
      ? routes.demandasCaixa
      : view === 'queue'
        ? routes.demandasPendentes
        : view === 'claimed'
          ? routes.demandasAssumidas
          : routes.demandasTodas;

  if (!state) {
    return basePath;
  }

  const searchState: DemandListSearchState = {
    view,
    q: state.q ?? '',
    status: state.status,
    subjectId: state.subjectId,
    queueId: state.queueId,
    page: state.page ?? 1,
  };

  const params = toDemandListSearchParams(searchState);
  const qStr = params.toString();
  return qStr ? `${basePath}?${qStr}` : basePath;
}
