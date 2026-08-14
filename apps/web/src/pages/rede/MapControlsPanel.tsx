import React from 'react';
import {
  Button,
  Drawer,
  SearchField,
  Spinner,
  Switch,
  Tabs,
} from '@heroui/react';
import {
  LuCable,
  LuChevronRight,
  LuMap,
  LuMapPin,
  LuPanelLeftClose,
  LuRadioTower,
  LuSearch,
  LuShapes,
  LuTag,
  LuUser,
} from 'react-icons/lu';
import type { MapPanelTab } from './map-preferences-storage';
import { MAP_BASE_STYLES, type MapBaseStyleId } from './map-styles';

export type MapLayerVisibility = {
  fat: boolean;
  cables: boolean;
  ceo: boolean;
};

export type MapSearchHit = {
  id: string;
  kind: 'fat' | 'cable' | 'customer';
  name: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
};

export function mapSearchHitKey(hit: MapSearchHit): string {
  return `${hit.kind}:${hit.id}`;
}

export type { MapPanelTab };

const PANEL_TABS: {
  id: MapPanelTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: 'buscar', label: 'Buscar', icon: <LuSearch className="size-4" /> },
  {
    id: 'elementos',
    label: 'Elementos',
    icon: <LuShapes className="size-4" />,
  },
  {
    id: 'mapa',
    label: 'Mapa',
    icon: <LuMap className="size-4" />,
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
  selectedKey: string | null;
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
  activeTab: MapPanelTab;
  onActiveTabChange: (tab: MapPanelTab) => void;
};

type SectionProps = Pick<
  MapControlsPanelProps,
  | 'search'
  | 'onSearchChange'
  | 'layers'
  | 'onLayerChange'
  | 'mapStyle'
  | 'onMapStyleChange'
  | 'showFatLabels'
  | 'onShowFatLabelsChange'
  | 'hits'
  | 'onSelectHit'
  | 'selectedKey'
  | 'searching'
  | 'error'
  | 'fatCount'
  | 'cableCount'
>;

function SearchSection({
  search,
  onSearchChange,
  hits,
  onSelectHit,
  selectedKey,
  searching = false,
  error,
}: SectionProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
            Digite ao menos 2 caracteres para buscar CTOs, cabos e clientes em
            todo o projeto.
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
                    ) : hit.kind === 'customer' ? (
                      <LuUser
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
                        {hit.kind === 'fat'
                          ? 'CTO (FAT)'
                          : hit.kind === 'customer'
                            ? 'Cliente'
                            : 'Cabo'}
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
    </div>
  );
}

function LayersSection({
  layers,
  onLayerChange,
  fatCount,
  cableCount,
}: SectionProps) {
  return (
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
            <LuCable aria-hidden className="size-4 shrink-0 text-accent" />
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
            <LuMapPin aria-hidden className="size-4 shrink-0 text-muted" />
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
  );
}

function MapSection({
  mapStyle,
  onMapStyleChange,
  showFatLabels,
  onShowFatLabelsChange,
}: SectionProps) {
  return (
    <div className="space-y-4 p-2">
      <div className="space-y-1" role="radiogroup" aria-label="Estilo do mapa">
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
              <span className="text-xs text-muted">{style.description}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
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
              <LuTag aria-hidden className="size-4 shrink-0 text-accent" />
              <span className="min-w-0">
                <span className="block font-medium">Nomes das CTOs</span>
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
    </div>
  );
}

function PanelBody(props: SectionProps & { activeTab: MapPanelTab }) {
  const { activeTab, ...sectionProps } = props;
  if (activeTab === 'buscar') {
    return <SearchSection {...sectionProps} />;
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {activeTab === 'elementos' ? (
        <LayersSection {...sectionProps} />
      ) : (
        <MapSection {...sectionProps} />
      )}
    </div>
  );
}

const SEGMENTED_TAB_LIST_CLASS =
  'grid w-full grid-cols-3 gap-0.5 rounded-xl border border-border bg-default/40 p-0.5 **:data-[slot=tabs-tab]:min-w-0 **:data-[slot=tabs-tab]:flex-1 **:data-[slot=tabs-tab]:rounded-lg **:data-[slot=tabs-tab]:bg-transparent **:data-[slot=tabs-tab]:px-2 **:data-[slot=tabs-tab]:py-2 **:data-[slot=tabs-tab]:text-muted **:data-[slot=tabs-tab]:shadow-none **:data-[slot=tabs-tab]:transition-colors **:data-[slot=tabs-tab]:data-[hovered=true]:not-data-[selected=true]:bg-default/60 **:data-[slot=tabs-tab]:data-[hovered=true]:not-data-[selected=true]:text-foreground **:data-[slot=tabs-tab]:data-[selected=true]:text-foreground **:data-[slot=tabs-tab]:data-[focus-visible=true]:ring-2 **:data-[slot=tabs-tab]:data-[focus-visible=true]:ring-accent/20 **:data-[slot=tabs-indicator]:rounded-lg **:data-[slot=tabs-indicator]:bg-surface **:data-[slot=tabs-indicator]:shadow-sm';

function PanelTabBar({
  activeTab,
  onSelect,
  variant = 'segmented',
  orientation = 'horizontal',
}: {
  activeTab: MapPanelTab;
  onSelect: (tab: MapPanelTab) => void;
  variant?: 'segmented' | 'icons';
  orientation?: 'horizontal' | 'vertical';
}) {
  if (variant === 'icons') {
    return (
      <div
        role="tablist"
        aria-label="Seções do painel do projeto"
        aria-orientation={orientation}
        className={
          orientation === 'vertical'
            ? 'flex flex-col items-center gap-2'
            : 'flex w-full items-center justify-around gap-1'
        }
      >
        {PANEL_TABS.map((item) => {
          const selected = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-label={item.label}
              aria-selected={selected}
              onClick={() => onSelect(item.id)}
              className={`inline-flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                selected
                  ? 'bg-default text-foreground'
                  : 'text-muted hover:bg-default/50 hover:text-foreground'
              }`}
            >
              <span aria-hidden>{item.icon}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={(key) => onSelect(key as MapPanelTab)}
      className="w-full"
    >
      <Tabs.ListContainer className="rounded-none bg-transparent">
        <Tabs.List
          aria-label="Seções do painel do projeto"
          className={SEGMENTED_TAB_LIST_CLASS}
        >
          {PANEL_TABS.map((item) => (
            <Tabs.Tab key={item.id} id={item.id}>
              <span className="flex items-center justify-center gap-1.5">
                <span aria-hidden className="shrink-0">
                  {item.icon}
                </span>
                <span className="truncate text-xs leading-none font-medium">
                  {item.label}
                </span>
              </span>
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}

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
  selectedKey,
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
  activeTab,
  onActiveTabChange,
}) => {
  const sectionProps: SectionProps = {
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
    selectedKey,
    searching,
    error,
    fatCount,
    cableCount,
  };

  const openTab = (next: MapPanelTab) => {
    onActiveTabChange(next);
    if (!isMobile && collapsed) {
      onToggleCollapse();
    }
  };

  if (isMobile) {
    return (
      <>
        {!mobileOpen ? (
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
        ) : null}

        <Drawer.Backdrop
          isOpen={mobileOpen}
          onOpenChange={(open) => {
            if (!open) {
              onCloseMobile();
            }
          }}
          variant="opaque"
          className="pointer-events-auto"
        >
          <Drawer.Content placement="bottom">
            <Drawer.Dialog
              aria-label="Controles do mapa"
              className="max-h-[min(70dvh,36rem)] border-t border-border bg-surface"
            >
              <Drawer.Handle />
              <Drawer.CloseTrigger
                aria-label="Fechar painel do mapa"
                onPress={onCloseMobile}
              />
              <Drawer.Header className="border-b border-border px-4 pt-1 pb-3">
                <div className="flex min-w-0 items-center gap-2 pr-8">
                  <Drawer.Heading className="font-display text-base font-bold text-foreground">
                    Projeto
                  </Drawer.Heading>
                  {loading ? (
                    <Spinner
                      size="sm"
                      aria-label="Carregando elementos da rede"
                    />
                  ) : null}
                </div>
                <div className="mt-3">
                  <PanelTabBar activeTab={activeTab} onSelect={openTab} />
                </div>
              </Drawer.Header>
              <Drawer.Body className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                <PanelBody {...sectionProps} activeTab={activeTab} />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </>
    );
  }

  const widthClass = collapsed ? 'w-14' : 'w-80';

  return (
    <aside
      aria-label="Controles do mapa"
      className={`pointer-events-auto absolute inset-y-0 left-0 z-20 flex h-full flex-col border-r border-border bg-surface/95 shadow-lg backdrop-blur-md transition-[width] duration-200 ease-out ${widthClass}`}
    >
      <div
        className={`flex shrink-0 items-center gap-1 border-b border-border p-2 ${
          collapsed ? 'flex-col' : 'justify-between'
        }`}
      >
        {!collapsed ? (
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
      </div>

      {collapsed ? (
        <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto p-2">
          <PanelTabBar
            activeTab={activeTab}
            onSelect={openTab}
            variant="icons"
            orientation="vertical"
          />
          {loading ? (
            <Spinner size="sm" aria-label="Carregando elementos da rede" />
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-border px-3 py-3">
            <PanelTabBar activeTab={activeTab} onSelect={openTab} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <PanelBody {...sectionProps} activeTab={activeTab} />
          </div>
        </div>
      )}
    </aside>
  );
};
