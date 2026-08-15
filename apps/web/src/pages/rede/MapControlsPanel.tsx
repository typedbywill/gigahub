import React from 'react';
import { Spinner } from '@heroui/react';
import {
  LuCable,
  LuGitMerge,
  LuRadioTower,
  LuSearch,
  LuUser,
  LuX,
} from 'react-icons/lu';

export type MapLayerVisibility = {
  fat: boolean;
  cables: boolean;
  ceo: boolean;
};

export type MapSearchHit = {
  id: string;
  kind: 'fat' | 'cable' | 'customer' | 'ceo';
  name: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
};

export function mapSearchHitKey(hit: MapSearchHit): string {
  return `${hit.kind}:${hit.id}`;
}

export type MapControlsPanelProps = {
  search: string;
  onSearchChange: (value: string) => void;
  layers: MapLayerVisibility;
  onLayerChange: (layer: keyof MapLayerVisibility, value: boolean) => void;
  hits: MapSearchHit[];
  onSelectHit: (hit: MapSearchHit) => void;
  selectedKey: string | null;
  loading: boolean;
  searching?: boolean;
  error: string | null;
  fatCount: number;
  cableCount: number;
  ceoCount: number;
};


function SearchHitsList({
  hits,
  selectedKey,
  onSelectHit,
  search,
  searching = false,
  error,
}: {
  hits: MapSearchHit[];
  selectedKey: string | null;
  onSelectHit: (hit: MapSearchHit) => void;
  search: string;
  searching?: boolean;
  error: string | null;
}) {
  const query = search.trim();

  if (!query) {
    return (
      <p className="px-2 py-3 text-xs text-muted">
        Digite ao menos 2 caracteres para buscar CTOs, cabos e clientes em todo
        o projeto.
      </p>
    );
  }

  if (query.length < 2) {
    return (
      <p className="px-2 py-3 text-xs text-muted">
        Digite ao menos 2 caracteres para buscar.
      </p>
    );
  }

  if (searching && hits.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted">
        <Spinner size="sm" aria-label="Buscando elementos" />
        Buscando elementos…
      </div>
    );
  }

  if (error && hits.length === 0) {
    return (
      <p role="alert" className="px-3 py-3 text-xs text-danger">
        {error}
      </p>
    );
  }

  if (hits.length === 0) {
    return (
      <p className="flex items-center gap-2 px-3 py-4 text-xs text-muted">
        <LuSearch aria-hidden className="size-3.5 shrink-0" />
        Nenhum elemento encontrado.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {hits.map((hit) => {
        const active = mapSearchHitKey(hit) === selectedKey;
        return (
          <li key={mapSearchHitKey(hit)}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              aria-label={
                hit.kind === 'customer'
                  ? `Cliente ${hit.name}`
                  : hit.kind === 'fat'
                    ? `CTO ${hit.name}`
                    : `Cabo ${hit.name}`
              }
              onClick={() => onSelectHit(hit)}
              className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active
                  ? 'bg-accent/15 text-foreground'
                  : 'text-foreground hover:bg-default/60'
              }`}
            >
              {hit.kind === 'fat' ? (
                <div
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  aria-hidden
                >
                  <LuRadioTower className="size-3.5" />
                </div>
              ) : hit.kind === 'customer' ? (
                <div
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                >
                  <LuUser className="size-3.5" />
                </div>
              ) : hit.kind === 'ceo' ? (
                <div
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400"
                  aria-hidden
                >
                  <LuGitMerge className="size-3.5" />
                </div>
              ) : (
                <div
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400"
                  aria-hidden
                >
                  <LuCable className="size-3.5" />
                </div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{hit.name}</span>
                <span className="block text-xs text-muted">
                  {hit.kind === 'fat'
                    ? 'CTO'
                    : hit.kind === 'customer'
                      ? 'Cliente'
                      : hit.kind === 'ceo'
                        ? 'CEO'
                        : 'Cabo'}
                  {hit.subtitle ? ` · ${hit.subtitle}` : ''}
                </span>
              </span>

            </button>
          </li>
        );
      })}
    </ul>
  );
}

export const MapControlsPanel: React.FC<MapControlsPanelProps> = ({
  search,
  onSearchChange,
  layers,
  onLayerChange,
  hits,
  onSelectHit,
  selectedKey,
  loading,
  searching = false,
  error,
  fatCount,
  cableCount,
  ceoCount,
}) => {

  return (
    <div className="pointer-events-none absolute top-3 left-3 right-3 z-30 sm:w-[410px] md:w-[430px]">
      {/* Searchbar Box */}
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-border/80 bg-surface/95 dark:bg-surface/90 px-3.5 py-2.5 shadow-lg backdrop-blur-md transition-all hover:shadow-xl focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent">
        <div className="flex size-5 shrink-0 items-center justify-center text-muted" aria-hidden>
          <LuSearch className="size-4.5" />
        </div>

        <div className="relative flex flex-1 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar CTO, cabo, cliente…"
            aria-label="Pesquisar elementos no mapa"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => onSearchChange('')}
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground"
            >
              <LuX className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center pl-1">
          {searching ? (
            <Spinner size="sm" aria-label="Buscando…" />
          ) : loading ? (
            <Spinner size="sm" aria-label="Carregando rede…" />
          ) : null}
        </div>
      </div>

      {/* Floating Search Results Dropdown */}
      {search.trim().length >= 2 ? (
        <div
          className="pointer-events-auto mt-2 max-h-[min(52vh,24rem)] overflow-y-auto rounded-2xl border border-border/80 bg-surface/95 dark:bg-surface/90 p-2 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2"
          role="listbox"
          aria-label="Resultados rápidos da busca"
        >
          <SearchHitsList
            hits={hits}
            selectedKey={selectedKey}
            onSelectHit={onSelectHit}
            search={search}
            searching={searching}
            error={error}
          />
        </div>
      ) : null}

      {/* Quick Toggles Row (CTOs & Cabos) */}
      <div className="pointer-events-auto mt-2 flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 no-scrollbar select-none">
        {/* CTOs Toggle Chip */}
        <button
          type="button"
          onClick={() => onLayerChange('fat', !layers.fat)}
          aria-pressed={layers.fat}
          aria-label={`Alternar camada CTO (${fatCount} carregadas)`}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border shadow-xs backdrop-blur-md transition-all active:scale-95 ${
            layers.fat
              ? 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300'
              : 'border-border/70 bg-surface/90 text-muted hover:bg-default/80 hover:text-foreground'
          }`}
        >
          <LuRadioTower className="size-3.5 shrink-0" aria-hidden />
          <span>CTOs</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
              layers.fat
                ? 'bg-amber-500/25 text-amber-800 dark:text-amber-200'
                : 'bg-default text-muted'
            }`}
          >
            {fatCount}
          </span>
        </button>

        {/* Cabos Toggle Chip */}
        <button
          type="button"
          onClick={() => onLayerChange('cables', !layers.cables)}
          aria-pressed={layers.cables}
          aria-label={`Alternar camada Cabos (${cableCount} carregados)`}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border shadow-xs backdrop-blur-md transition-all active:scale-95 ${
            layers.cables
              ? 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300'
              : 'border-border/70 bg-surface/90 text-muted hover:bg-default/80 hover:text-foreground'
          }`}
        >
          <LuCable className="size-3.5 shrink-0" aria-hidden />
          <span>Cabos</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
              layers.cables
                ? 'bg-sky-500/25 text-sky-800 dark:text-sky-200'
                : 'bg-default text-muted'
            }`}
          >
            {cableCount}
          </span>
        </button>

        {/* CEOs Toggle Chip */}
        <button
          type="button"
          onClick={() => onLayerChange('ceo', !layers.ceo)}
          aria-pressed={layers.ceo}
          aria-label={`Alternar camada CEO (${ceoCount} carregadas)`}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border shadow-xs backdrop-blur-md transition-all active:scale-95 ${
            layers.ceo
              ? 'border-purple-500/40 bg-purple-500/15 text-purple-700 dark:text-purple-300'
              : 'border-border/70 bg-surface/90 text-muted hover:bg-default/80 hover:text-foreground'
          }`}
        >
          <LuGitMerge className="size-3.5 shrink-0" aria-hidden />
          <span>CEOs</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
              layers.ceo
                ? 'bg-purple-500/25 text-purple-800 dark:text-purple-200'
                : 'bg-default text-muted'
            }`}
          >
            {ceoCount}
          </span>
        </button>
      </div>
    </div>
  );
};

