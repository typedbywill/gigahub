import React, { useCallback, useMemo, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapMouseEvent,
  type MapRef,
} from 'react-map-gl/mapbox';

import { Drawer } from '@heroui/react';
import {
  LuCheck,
  LuCompass,
  LuGlobe,
  LuLayers,
  LuLocate,
  LuMap,
  LuMoon,
  LuMoonStar,
  LuMountain,
  LuSparkles,
  LuSun,
} from 'react-icons/lu';
import type {
  NearbyFiberAccessTerminalDto,
  NearbyFiberCableDto,
  NearbyFiberSpliceEnclosureDto,
} from '@gigahub/shared/contracts';
import type { MapLayerVisibility } from './MapControlsPanel';
import type { MapSelectedRef } from './map-search-params';
import {
  MAP_BASE_STYLES,
  mapStyleUsesDarkChrome,
  resolveMapStyleUrl,
  type MapBaseStyleId,
} from './map-styles';
import { NetworkElementPopup } from './NetworkElementPopup';
import { UserLocationDot } from './components/UserLocationDot';
import 'mapbox-gl/dist/mapbox-gl.css';

const FALLBACK_FAT_COLOR = '#000000';
const FALLBACK_CEO_COLOR = '#8b5cf6';
const FALLBACK_CABLE_COLOR = '#0284c7';

export type CustomerMapPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type ProjectMapProps = {
  mapRef: React.RefObject<MapRef | null>;
  mapboxToken: string;
  isAppDark: boolean;
  mapStyle: MapBaseStyleId;
  onMapStyleChange: (style: MapBaseStyleId) => void;
  showFatLabels: boolean;
  initialViewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  fats: NearbyFiberAccessTerminalDto[];
  ceos: NearbyFiberSpliceEnclosureDto[];
  cables: NearbyFiberCableDto[];
  layers: MapLayerVisibility;
  selected: MapSelectedRef | null;
  selectedCustomerData?: { subtitle?: string; document?: string } | null;
  customerPin: CustomerMapPin | null;
  userLocation?: { latitude: number; longitude: number; accuracy?: number } | null;
  isMobile?: boolean;
  isLocating?: boolean;
  onCenterUserLocation?: () => void;
  onSelectElement: (selected: MapSelectedRef | null) => void;
  onOpenSplitting?: (fatId: string) => void;
  onOpenCustomers?: (fatId: string) => void;
  onMoveEnd: () => void;
  onResize?: () => void;
};

function getMapStyleIcon(styleId: MapBaseStyleId) {
  switch (styleId) {
    case 'auto':
      return <LuSparkles className="size-5 text-amber-500 dark:text-amber-400" />;
    case 'streets':
      return <LuMap className="size-5 text-sky-500 dark:text-sky-400" />;
    case 'satellite':
      return <LuGlobe className="size-5 text-emerald-500 dark:text-emerald-400" />;
    case 'outdoors':
      return <LuMountain className="size-5 text-teal-500 dark:text-teal-400" />;
    case 'light':
      return <LuSun className="size-5 text-orange-500 dark:text-orange-400" />;
    case 'dark':
      return <LuMoon className="size-5 text-indigo-500 dark:text-indigo-400" />;
    case 'navigation-day':
      return <LuCompass className="size-5 text-blue-500 dark:text-blue-400" />;
    case 'navigation-night':
      return <LuMoonStar className="size-5 text-purple-500 dark:text-purple-400" />;
    default:
      return <LuMap className="size-5 text-muted" />;
  }
}

function fatsToGeoJson(
  fats: NearbyFiberAccessTerminalDto[],
): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: fats.map((fat) => ({
      type: 'Feature',
      id: fat.id,
      properties: {
        id: fat.id,
        name: fat.name,
        idErp: fat.idErp,
        kind: 'fat',
        mapColor: fat.mapColorHex || FALLBACK_FAT_COLOR,
      },
      geometry: {
        type: 'Point',
        coordinates: [fat.location.longitude, fat.location.latitude],
      },
    })),
  };
}

function ceosToGeoJson(
  ceos: NearbyFiberSpliceEnclosureDto[],
): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: ceos.map((ceo) => ({
      type: 'Feature',
      id: ceo.id,
      properties: {
        id: ceo.id,
        name: ceo.name,
        idErp: ceo.idErp,
        kind: 'ceo',
        mapColor: ceo.mapColorHex || FALLBACK_CEO_COLOR,
      },
      geometry: {
        type: 'Point',
        coordinates: [ceo.location.longitude, ceo.location.latitude],
      },
    })),
  };
}


function cablesToGeoJson(
  cables: NearbyFiberCableDto[],
): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cables.map((cable) => ({
      type: 'Feature',
      id: cable.id,
      properties: {
        id: cable.id,
        name: cable.name,
        idErp: cable.idErp,
        kind: 'cable',
        strokeColor: cable.strokeColorHex || FALLBACK_CABLE_COLOR,
        strokeWidth: cable.strokeWidth > 0 ? cable.strokeWidth : 3,
        strokeDashed: cable.strokeDashed ? 1 : 0,
      },
      geometry: {
        type: 'LineString',
        coordinates: cable.path.map((p) => [p.longitude, p.latitude]),
      },
    })),
  };
}

function idEqualsFilter(
  selectedId: string | null,
): ['==', ['get', 'id'], string] {
  return ['==', ['get', 'id'], selectedId ?? ''];
}

export const ProjectMap: React.FC<ProjectMapProps> = ({
  mapRef,
  mapboxToken,
  isAppDark,
  mapStyle,
  onMapStyleChange,
  showFatLabels,
  initialViewState,
  fats,
  ceos,
  cables,
  layers,
  selected,
  selectedCustomerData,
  customerPin,
  userLocation,
  isMobile = false,
  isLocating = false,
  onCenterUserLocation,
  onSelectElement,
  onOpenSplitting,
  onOpenCustomers,
  onMoveEnd,
  onResize,
}) => {
  const [cursor, setCursor] = useState<string>('default');
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);

  const selectedId =
    selected?.kind === 'customer' ? null : (selected?.id ?? null);

  const fatData = useMemo(() => fatsToGeoJson(fats), [fats]);
  const ceoData = useMemo(() => ceosToGeoJson(ceos), [ceos]);
  const cableData = useMemo(() => cablesToGeoJson(cables), [cables]);
  const selectedFilter = useMemo(
    () => idEqualsFilter(selectedId),
    [selectedId],
  );
  const styleUrl = useMemo(
    () => resolveMapStyleUrl(mapStyle, isAppDark),
    [isAppDark, mapStyle],
  );
  const darkChrome = useMemo(
    () => mapStyleUsesDarkChrome(mapStyle, isAppDark),
    [isAppDark, mapStyle],
  );

  const interactiveLayerIds = useMemo(() => {
    const ids: string[] = [];
    if (layers.fat) {
      ids.push('project-fats-circle');
    }
    if (layers.ceo) {
      ids.push('project-ceos-circle');
    }
    if (layers.cables) {
      ids.push('project-cables-line-solid', 'project-cables-line-dashed');
    }
    return ids;
  }, [layers.cables, layers.ceo, layers.fat]);

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      setLayersMenuOpen(false);
      const feature = event.features?.[0];

      if (!feature || !feature.properties) {
        onSelectElement(null);
        return;
      }
      const kind = feature.properties.kind as 'fat' | 'cable' | 'ceo';
      const id = String(feature.properties.id ?? feature.id);
      if (kind && id) {
        onSelectElement({ kind, id });
      } else {
        onSelectElement(null);
      }
    },
    [onSelectElement],
  );

  const handleMouseEnter = useCallback(() => {
    setCursor('pointer');
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCursor('default');
  }, []);

  const selectedFat = useMemo(() => {
    if (selected?.kind !== 'fat') {
      return null;
    }
    return fats.find((f) => f.id === selected.id) ?? null;
  }, [fats, selected]);

  const selectedCeo = useMemo(() => {
    if (selected?.kind !== 'ceo') {
      return null;
    }
    return ceos.find((c) => c.id === selected.id) ?? null;
  }, [ceos, selected]);

  const selectedCable = useMemo(() => {
    if (selected?.kind !== 'cable') {
      return null;
    }
    return cables.find((c) => c.id === selected.id) ?? null;
  }, [cables, selected]);


  const selectedCableTarget = useMemo(() => {
    if (!selectedCable || selectedCable.path.length === 0) {
      return null;
    }
    const mid = Math.floor(selectedCable.path.length / 2);
    return selectedCable.path[mid] ?? selectedCable.path[0];
  }, [selectedCable]);

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        initialViewState={initialViewState}
        mapStyle={styleUrl}
        style={{ width: '100%', height: '100%' }}
        cursor={cursor}
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleMapClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMoveEnd={onMoveEnd}
        onResize={onResize}
        attributionControl={false}
        reuseMaps
      >
        {!isMobile ? (
          <NavigationControl position="bottom-right" showCompass={false} />
        ) : null}

        <Source id="project-cables" type="geojson" data={cableData}>
          <Layer
            id="project-cables-line-solid"
            type="line"
            filter={['!=', ['get', 'strokeDashed'], 1]}
            layout={{
              visibility: layers.cables ? 'visible' : 'none',
              'line-join': 'round',
              'line-cap': 'round',
            }}
            paint={{
              'line-color': [
                'coalesce',
                ['get', 'strokeColor'],
                FALLBACK_CABLE_COLOR,
              ],
              'line-width': ['coalesce', ['get', 'strokeWidth'], 3],
              'line-opacity': 0.9,
            }}
          />
          <Layer
            id="project-cables-line-dashed"
            type="line"
            filter={['==', ['get', 'strokeDashed'], 1]}
            layout={{
              visibility: layers.cables ? 'visible' : 'none',
              'line-join': 'round',
              'line-cap': 'round',
            }}
            paint={{
              'line-color': [
                'coalesce',
                ['get', 'strokeColor'],
                FALLBACK_CABLE_COLOR,
              ],
              'line-width': ['coalesce', ['get', 'strokeWidth'], 3],
              'line-opacity': 0.9,
              'line-dasharray': [2, 2],
            }}
          />
          <Layer
            id="project-cables-selected"
            type="line"
            filter={selectedFilter}
            layout={{
              visibility: layers.cables ? 'visible' : 'none',
              'line-join': 'round',
              'line-cap': 'round',
            }}
            paint={{
              'line-color': '#f59e0b',
              'line-width': ['+', ['coalesce', ['get', 'strokeWidth'], 3], 2],
              'line-opacity': 1,
            }}
          />
        </Source>

        <Source id="project-fats" type="geojson" data={fatData}>
          <Layer
            id="project-fats-circle"
            type="circle"
            layout={{
              visibility: layers.fat ? 'visible' : 'none',
            }}
            paint={{
              'circle-radius': 6,
              'circle-color': [
                'coalesce',
                ['get', 'mapColor'],
                FALLBACK_FAT_COLOR,
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': darkChrome ? '#0f172a' : '#ffffff',
            }}
          />
          <Layer
            id="project-fats-selected"
            type="circle"
            filter={selectedFilter}
            layout={{
              visibility: layers.fat ? 'visible' : 'none',
            }}
            paint={{
              'circle-radius': 9,
              'circle-color': '#f59e0b',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
          />
          <Layer
            id="project-fats-label"
            type="symbol"
            layout={{
              visibility: layers.fat && showFatLabels ? 'visible' : 'none',
              'text-field': ['get', 'name'],
              'text-size': 11,
              'text-offset': [0, 1.2],
              'text-anchor': 'top',
              'text-optional': true,
            }}
            paint={{
              'text-color': darkChrome ? '#e2e8f0' : '#1e293b',
              'text-halo-color': darkChrome ? '#0f172a' : '#ffffff',
              'text-halo-width': 1.5,
            }}
          />
        </Source>

        <Source id="project-ceos" type="geojson" data={ceoData}>
          <Layer
            id="project-ceos-circle"
            type="circle"
            layout={{
              visibility: layers.ceo ? 'visible' : 'none',
            }}
            paint={{
              'circle-radius': 7,
              'circle-color': [
                'coalesce',
                ['get', 'mapColor'],
                FALLBACK_CEO_COLOR,
              ],
              'circle-stroke-width': 2.5,
              'circle-stroke-color': darkChrome ? '#0f172a' : '#ffffff',
            }}
          />
          <Layer
            id="project-ceos-selected"
            type="circle"
            filter={selectedFilter}
            layout={{
              visibility: layers.ceo ? 'visible' : 'none',
            }}
            paint={{
              'circle-radius': 10,
              'circle-color': '#a855f7',
              'circle-stroke-width': 2.5,
              'circle-stroke-color': '#ffffff',
            }}
          />
          <Layer
            id="project-ceos-label"
            type="symbol"
            layout={{
              visibility: layers.ceo && showFatLabels ? 'visible' : 'none',
              'text-field': ['get', 'name'],
              'text-size': 11,
              'text-offset': [0, 1.2],
              'text-anchor': 'top',
              'text-optional': true,
            }}
            paint={{
              'text-color': darkChrome ? '#e2e8f0' : '#1e293b',
              'text-halo-color': darkChrome ? '#0f172a' : '#ffffff',
              'text-halo-width': 1.5,
            }}
          />
        </Source>

        {userLocation ? (
          <Marker
            longitude={userLocation.longitude}
            latitude={userLocation.latitude}
            anchor="center"
          >
            <UserLocationDot accuracy={userLocation.accuracy} />
          </Marker>
        ) : null}

        {customerPin ? (
          <Marker
            longitude={customerPin.longitude}
            latitude={customerPin.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelectElement({ kind: 'customer', id: customerPin.id });
            }}
          >
            <div
              className="flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow-md transition-transform hover:scale-110 active:scale-95"
              title={customerPin.name}
              aria-hidden
            >
              <span className="text-xs font-bold">C</span>
            </div>
          </Marker>
        ) : null}

        {/* Popups (Radial Menu centered over element) */}
        {selectedFat ? (
          <Popup
            longitude={selectedFat.location.longitude}
            latitude={selectedFat.location.latitude}
            anchor="center"
            offset={0}
            closeButton={false}
            closeOnClick={false}
            className="network-element-mapbox-popup"
            maxWidth="540px"
            onClose={() => onSelectElement(null)}
          >
            <NetworkElementPopup
              element={{ kind: 'fat', data: selectedFat }}
              onClose={() => onSelectElement(null)}
              onOpenSplitting={onOpenSplitting}
              onOpenCustomers={onOpenCustomers}
            />
          </Popup>
        ) : null}

        {selectedCeo ? (
          <Popup
            longitude={selectedCeo.location.longitude}
            latitude={selectedCeo.location.latitude}
            anchor="center"
            offset={0}
            closeButton={false}
            closeOnClick={false}
            className="network-element-mapbox-popup"
            maxWidth="540px"
            onClose={() => onSelectElement(null)}
          >
            <NetworkElementPopup
              element={{ kind: 'ceo', data: selectedCeo }}
              onClose={() => onSelectElement(null)}
            />
          </Popup>
        ) : null}


        {selectedCable && selectedCableTarget ? (
          <Popup
            longitude={selectedCableTarget.longitude}
            latitude={selectedCableTarget.latitude}
            anchor="center"
            offset={0}
            closeButton={false}
            closeOnClick={false}
            className="network-element-mapbox-popup"
            maxWidth="540px"
            onClose={() => onSelectElement(null)}
          >
            <NetworkElementPopup
              element={{ kind: 'cable', data: selectedCable }}
              onClose={() => onSelectElement(null)}
            />
          </Popup>
        ) : null}

        {selected?.kind === 'customer' && customerPin ? (
          <Popup
            longitude={customerPin.longitude}
            latitude={customerPin.latitude}
            anchor="center"
            offset={0}
            closeButton={false}
            closeOnClick={false}
            className="network-element-mapbox-popup"
            maxWidth="540px"
            onClose={() => onSelectElement(null)}
          >
            <NetworkElementPopup
              element={{
                kind: 'customer',
                data: {
                  ...customerPin,
                  subtitle: selectedCustomerData?.subtitle,
                  document: selectedCustomerData?.document,
                },
              }}
              onClose={() => onSelectElement(null)}
            />
          </Popup>
        ) : null}
      </Map>

      {/* Floating Bottom-Right Controls Group */}
      <div
        className={`pointer-events-auto absolute right-3.5 z-20 flex flex-col items-center gap-2.5 ${
          isMobile ? 'bottom-5' : 'bottom-20'
        }`}
      >
        {/* Desktop Style Icons Panel (Opens directly above layers button) */}
        {layersMenuOpen && !isMobile ? (
          <div
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/80 bg-surface/95 dark:bg-surface/90 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150"
            role="radiogroup"
            aria-label="Escolher estilo do mapa"
          >
            {MAP_BASE_STYLES.map((style) => {
              const isSelected = mapStyle === style.id;
              const icon = getMapStyleIcon(style.id);
              return (
                <button
                  key={style.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  title={`${style.label} (${style.category}) — ${style.description}`}
                  aria-label={style.label}
                  onClick={() => {
                    onMapStyleChange(style.id);
                    setLayersMenuOpen(false);
                  }}
                  className={`group relative flex size-10 items-center justify-center rounded-xl transition-all focus-visible:outline-2 focus-visible:outline-accent active:scale-95 ${
                    isSelected
                      ? 'bg-accent/20 text-accent ring-2 ring-accent/40 shadow-xs'
                      : 'text-muted hover:bg-default hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center justify-center">{icon}</span>
                  {/* Tooltip on hover */}
                  <span className="pointer-events-none absolute right-full mr-2.5 hidden whitespace-nowrap rounded-lg border border-border/80 bg-surface px-2.5 py-1 text-xs font-medium text-foreground shadow-lg group-hover:block">
                    {style.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Layers Button */}
        <button
          type="button"
          aria-label="Alterar tipo e estilo do mapa"
          title="Camadas e estilos do mapa"
          onClick={() => setLayersMenuOpen((open) => !open)}
          className={`flex size-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            layersMenuOpen
              ? 'border-accent/50 bg-accent/15 text-accent ring-2 ring-accent/30'
              : 'border-border/80 bg-surface/95 text-foreground hover:bg-default'
          }`}
        >
          <LuLayers className="size-5 text-accent" aria-hidden />
        </button>

        {/* Location Button */}
        {onCenterUserLocation ? (
          <button
            type="button"
            aria-label="Centralizar na minha localização"
            title="Centralizar na minha localização"
            onClick={onCenterUserLocation}
            className="flex size-11 items-center justify-center rounded-full border border-border/80 bg-surface/95 text-foreground shadow-lg backdrop-blur-md transition-all hover:bg-default hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {isLocating ? (
              <span
                className="size-4.5 animate-spin rounded-full border-2 border-accent border-t-transparent"
                aria-hidden
              />
            ) : (
              <LuLocate
                aria-hidden
                className={`size-5 transition-colors ${
                  userLocation ? 'text-accent' : 'text-muted'
                }`}
              />
            )}
          </button>
        ) : null}
      </div>

      {/* Mobile Drawer (When clicking layers on mobile) */}
      {isMobile ? (
        <Drawer.Backdrop
          isOpen={layersMenuOpen}
          onOpenChange={(open) => {
            if (!open) {
              setLayersMenuOpen(false);
            }
          }}
          variant="opaque"
          className="pointer-events-auto"
        >
          <Drawer.Content placement="bottom">
            <Drawer.Dialog
              aria-label="Estilos do mapa"
              className="max-h-[min(70dvh,32rem)] border-t border-border bg-surface"
            >
              <Drawer.Handle />
              <Drawer.CloseTrigger
                aria-label="Fechar"
                onPress={() => setLayersMenuOpen(false)}
              />
              <Drawer.Header className="border-b border-border px-4 pt-1 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent"
                    aria-hidden
                  >
                    <LuLayers className="size-4" />
                  </div>
                  <Drawer.Heading className="font-display text-base font-bold text-foreground">
                    Estilo do Mapa
                  </Drawer.Heading>
                </div>
              </Drawer.Header>
              <Drawer.Body className="p-4">
                <div
                  className="grid grid-cols-2 gap-2"
                  role="radiogroup"
                  aria-label="Estilo do mapa"
                >
                  {MAP_BASE_STYLES.map((style) => {
                    const isSelected = mapStyle === style.id;
                    const icon = getMapStyleIcon(style.id);
                    return (
                      <button
                        key={style.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          onMapStyleChange(style.id);
                          setLayersMenuOpen(false);
                        }}
                        className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
                          isSelected
                            ? 'border-accent/50 bg-accent/15 text-foreground ring-1 ring-accent/30 font-medium'
                            : 'border-border/60 bg-default/30 text-foreground hover:bg-default/60'
                        }`}
                      >
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                            isSelected
                              ? 'bg-accent/20 text-accent'
                              : 'bg-surface text-muted'
                          }`}
                          aria-hidden
                        >
                          {icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold">
                            {style.label}
                          </span>
                          <span className="block truncate text-[10px] text-muted">
                            {style.category}
                          </span>
                        </div>
                        {isSelected ? (
                          <LuCheck className="size-3.5 shrink-0 text-accent stroke-3" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      ) : null}
    </div>
  );
};
