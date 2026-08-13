import React, { useState } from 'react';
import { Button, SearchField, Spinner, Switch, Tabs } from '@heroui/react';
import {
  LuCable,
  LuChevronRight,
  LuMapPin,
  LuPalette,
  LuPanelLeftClose,
  LuRadioTower,
  LuSearch,
  LuSettings,
  LuShapes,
  LuTag,
  LuX,
} from 'react-icons/lu';
import { MAP_BASE_STYLES, type MapBaseStyleId } from './map-styles';

export type MapLayerVisibility = {
  fat: boolean;
  cables: boolean;
  ceo: boolean;
};

export type MapSearchHit = {
  id: string;
  kind: 'fat' | 'cable';
  name: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
};

export type MapPanelTab =
  | 'buscar'
  | 'elementos'
  | 'aparencia'
  | 'configuracoes';

const PANEL_TABS: {
  id: MapPanelTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: 'buscar', label: 'Buscar', icon: <LuSearch className="size-3.5" /> },
  {
    id: 'elementos',
    label: 'Elementos',
    icon: <LuShapes className="size-3.5" />,
  },
  {
    id: 'aparencia',
    label: 'Aparência',
    icon: <LuPalette className="size-3.5" />,
  },
  {
    id: 'configuracoes',
    label: 'Config',
    icon: <LuSettings className="size-3.5" />,
  },
];

export type MapControlsPanelProps = {
  search: string;
  onSearchChange: (value: string) => void;
  layers: MapLayerVisibility;
  onLayerChange: (layer: keyof MapLayerVisibility, value: boolean) => void;
  mapStyle: MapBaseStyleId;
  onMapStyleChange: (style: MapBaseStyleId) => void;
  showFatLabels: boolean;
  onShowFatLabelsChange: (value: boolean) => void;
  hits: MapSearchHit[];
  onSelectHit: (hit: MapSearchHit) => void;
  selectedId: string | null;
  loading: boolean;
  searching?: boolean;
  error: string | null;
  fatCount: number;
  cableCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export const MapControlsPanel: React.FC<MapControlsPanelProps> = ({
  search,
  onSearchChange,
  layers,
  onLayerChange,
  mapStyle,
  onMapStyleChange,
  showFatLabels,
  onShowFatLabelsChange,
  hits,
  onSelectHit,
  selectedId,
  loading,
  searching = false,
  error,
  fatCount,
  cableCount,
  collapsed,
  onToggleCollapse,
  isMobile,
  mobileOpen,
  onCloseMobile,
}) => {
  const [tab, setTab] = useState<MapPanelTab>('buscar');

  const openTab = (next: MapPanelTab) => {
    setTab(next);
    if (!isMobile && collapsed) {
      onToggleCollapse();
    }
  };

  if (isMobile && !mobileOpen) {
    return (
      <Button
        isIconOnly
        size="md"
        variant="secondary"
        aria-label="Abrir painel do mapa"
        className="pointer-events-auto absolute top-3 left-3 z-20 shadow-lg"
        onPress={onToggleCollapse}
      >
        <LuSearch className="size-4" />
      </Button>
    );
  }

  const widthClass = isMobile
    ? 'w-[min(100%,20rem)]'
    : collapsed
      ? 'w-14'
      : 'w-80';

  return (
    <aside
      aria-label="Controles do mapa"
      className={`pointer-events-auto absolute inset-y-0 left-0 z-20 flex h-full flex-col border-r border-border bg-surface/95 shadow-lg backdrop-blur-md transition-[width] duration-200 ease-out ${widthClass}`}
    >
      <div
        className={`flex shrink-0 items-center gap-1 border-b border-border p-2 ${
          collapsed && !isMobile ? 'flex-col' : 'justify-between'
        }`}
      >
        {!(collapsed && !isMobile) ? (
          <div className="flex min-w-0 items-center gap-2 px-1">
            <h1 className="font-display truncate text-base font-bold text-foreground">
              Projeto
            </h1>
            {loading ? (
              <Spinner size="sm" aria-label="Carregando elementos da rede" />
            ) : null}
          </div>
        ) : (
          <span className="sr-only">Projeto</span>
        )}

        <div
          className={`flex items-center gap-1 ${collapsed && !isMobile ? 'flex-col' : ''}`}
        >
          {isMobile ? (
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Fechar painel do mapa"
              onPress={onCloseMobile}
            >
              <LuX className="size-4" />
            </Button>
          ) : (
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={collapsed ? 'Expandir painel' : 'Recolher painel'}
              onPress={onToggleCollapse}
            >
              {collapsed ? (
                <LuChevronRight className="size-4" />
              ) : (
                <LuPanelLeftClose className="size-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {collapsed && !isMobile ? (
        <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto p-2">
          {PANEL_TABS.map((item) => (
            <Button
              key={item.id}
              isIconOnly
              size="sm"
              variant={tab === item.id ? 'secondary' : 'ghost'}
              aria-label={item.label}
              onPress={() => openTab(item.id)}
            >
              {item.icon}
            </Button>
          ))}
          {loading ? (
            <Spinner size="sm" aria-label="Carregando elementos da rede" />
          ) : null}
        </div>
      ) : (
        <Tabs
          variant="secondary"
          selectedKey={tab}
          onSelectionChange={(key) => setTab(String(key) as MapPanelTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <Tabs.ListContainer className="shrink-0 border-b border-border px-1">
            <Tabs.List
              aria-label="Seções do painel do projeto"
              className="w-full gap-0"
            >
              {PANEL_TABS.map((item) => (
                <Tabs.Tab
                  key={item.id}
                  id={item.id}
                  className="min-w-0 flex-1 px-1 text-[11px]"
                >
                  <span className="flex flex-col items-center gap-0.5 py-0.5">
                    <span aria-hidden>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel
            id="buscar"
            className="flex min-h-0 flex-1 flex-col outline-none"
          >
            <div className="shrink-0 space-y-3 border-b border-border p-3">
              <SearchField
                aria-label="Pesquisar elementos no mapa"
                value={search}
                onChange={onSearchChange}
                onClear={() => onSearchChange('')}
                className="w-full"
              >
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Buscar CTO, cabo…" />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>

              {searching ? (
                <p className="flex items-center gap-2 text-xs text-muted">
                  <Spinner size="sm" aria-label="Buscando elementos" />
                  Buscando…
                </p>
              ) : null}

              {error ? (
                <p role="alert" className="text-xs text-danger">
                  {error}
                </p>
              ) : null}
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto p-2"
              role="listbox"
              aria-label="Resultados da busca"
            >
              {!search.trim() ? (
                <p className="px-2 py-3 text-xs text-muted">
                  Digite ao menos 2 caracteres para buscar CTOs e cabos em todo
                  o projeto.
                </p>
              ) : search.trim().length < 2 ? (
                <p className="px-2 py-3 text-xs text-muted">
                  Digite ao menos 2 caracteres para buscar.
                </p>
              ) : searching && hits.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted">Buscando…</p>
              ) : hits.length === 0 ? (
                <p className="flex items-center gap-2 px-2 py-3 text-xs text-muted">
                  <LuSearch aria-hidden className="size-3.5 shrink-0" />
                  Nenhum elemento encontrado.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {hits.map((hit) => {
                    const active = hit.id === selectedId;
                    return (
                      <li key={`${hit.kind}-${hit.id}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => onSelectHit(hit)}
                          className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                            active
                              ? 'bg-accent/15 text-foreground'
                              : 'text-foreground hover:bg-default/50'
                          }`}
                        >
                          {hit.kind === 'fat' ? (
                            <LuRadioTower
                              aria-hidden
                              className="mt-0.5 size-3.5 shrink-0 text-accent"
                            />
                          ) : (
                            <LuCable
                              aria-hidden
                              className="mt-0.5 size-3.5 shrink-0 text-accent"
                            />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {hit.name}
                            </span>
                            <span className="block text-xs text-muted">
                              {hit.kind === 'fat' ? 'CTO (FAT)' : 'Cabo'}
                              {hit.subtitle ? ` · ${hit.subtitle}` : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Tabs.Panel>

          <Tabs.Panel
            id="elementos"
            className="min-h-0 flex-1 overflow-y-auto outline-none"
          >
            <div className="space-y-1 p-2">
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase">
                Camadas visíveis
              </p>
              <Switch
                isSelected={layers.fat}
                onChange={(value) => onLayerChange('fat', value)}
                className="w-full rounded-lg px-2 py-2 hover:bg-default/40"
              >
                <Switch.Content className="w-full justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                    <LuRadioTower
                      aria-hidden
                      className="size-4 shrink-0 text-accent"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">CTO (FAT)</span>
                      <span className="block text-xs text-muted">
                        {fatCount} carregadas
                      </span>
                    </span>
                  </span>
                  <Switch.Control className="shrink-0">
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>

              <Switch
                isSelected={layers.cables}
                onChange={(value) => onLayerChange('cables', value)}
                className="w-full rounded-lg px-2 py-2 hover:bg-default/40"
              >
                <Switch.Content className="w-full justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                    <LuCable
                      aria-hidden
                      className="size-4 shrink-0 text-accent"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">Cabos</span>
                      <span className="block text-xs text-muted">
                        {cableCount} carregados
                      </span>
                    </span>
                  </span>
                  <Switch.Control className="shrink-0">
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>

              <Switch
                isSelected={false}
                isDisabled
                className="w-full rounded-lg px-2 py-2 opacity-70"
              >
                <Switch.Content className="w-full justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                    <LuMapPin
                      aria-hidden
                      className="size-4 shrink-0 text-muted"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">CEO</span>
                      <span className="block text-xs text-muted">Em breve</span>
                    </span>
                  </span>
                  <Switch.Control className="shrink-0">
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            </div>
          </Tabs.Panel>

          <Tabs.Panel
            id="aparencia"
            className="min-h-0 flex-1 overflow-y-auto outline-none"
          >
            <div className="space-y-1 p-2" role="radiogroup" aria-label="Estilo do mapa">
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase">
                Estilo do mapa
              </p>
              {MAP_BASE_STYLES.map((style) => {
                const selected = mapStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onMapStyleChange(style.id)}
                    className={`flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      selected
                        ? 'bg-accent/15 text-foreground'
                        : 'text-foreground hover:bg-default/50'
                    }`}
                  >
                    <span className="text-sm font-medium">{style.label}</span>
                    <span className="text-xs text-muted">
                      {style.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </Tabs.Panel>

          <Tabs.Panel
            id="configuracoes"
            className="min-h-0 flex-1 overflow-y-auto outline-none"
          >
            <div className="space-y-1 p-2">
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase">
                Exibição
              </p>
              <Switch
                isSelected={showFatLabels}
                onChange={onShowFatLabelsChange}
                className="w-full rounded-lg px-2 py-2 hover:bg-default/40"
              >
                <Switch.Content className="w-full justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                    <LuTag
                      aria-hidden
                      className="size-4 shrink-0 text-accent"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">
                        Nomes das CTOs
                      </span>
                      <span className="block text-xs text-muted">
                        Mostrar rótulos no mapa
                      </span>
                    </span>
                  </span>
                  <Switch.Control className="shrink-0">
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            </div>
          </Tabs.Panel>
        </Tabs>
      )}
    </aside>
  );
};
