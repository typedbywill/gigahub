import React, { useCallback, useMemo, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from 'react-map-gl/mapbox';
import type {
  NearbyFiberAccessTerminalDto,
  NearbyFiberCableDto,
} from '@gigahub/shared/contracts';
import type { MapLayerVisibility } from './MapControlsPanel';
import type { MapSelectedRef } from './map-search-params';
import {
  mapStyleUsesDarkChrome,
  resolveMapStyleUrl,
  type MapBaseStyleId,
} from './map-styles';
import { NetworkElementPopup } from './NetworkElementPopup';
import 'mapbox-gl/dist/mapbox-gl.css';

const FALLBACK_FAT_COLOR = '#000000';
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
  showFatLabels: boolean;
  initialViewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  fats: NearbyFiberAccessTerminalDto[];
  cables: NearbyFiberCableDto[];
  layers: MapLayerVisibility;
  selected: MapSelectedRef | null;
  selectedCustomerData?: { subtitle?: string; document?: string } | null;
  customerPin: CustomerMapPin | null;
  onSelectElement: (selected: MapSelectedRef | null) => void;
  onOpenSplitting?: (fatId: string) => void;
  onMoveEnd: () => void;
  onResize?: () => void;
};


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
  showFatLabels,
  initialViewState,
  fats,
  cables,
  layers,
  selected,
  selectedCustomerData,
  customerPin,
  onSelectElement,
  onOpenSplitting,
  onMoveEnd,
  onResize,
}) => {

  const [cursor, setCursor] = useState<string>('default');

  const selectedId =
    selected?.kind === 'customer' ? null : (selected?.id ?? null);

  const fatData = useMemo(() => fatsToGeoJson(fats), [fats]);
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
    if (layers.cables) {
      ids.push('project-cables-line-solid', 'project-cables-line-dashed');
    }
    return ids;
  }, [layers.cables, layers.fat]);

  const handleMapClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature || !feature.properties) {
        onSelectElement(null);
        return;
      }
      const kind = feature.properties.kind as 'fat' | 'cable';
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
      <NavigationControl position="bottom-right" showCompass={false} />

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

      {/* Popups */}
      {selectedFat ? (
        <Popup
          longitude={selectedFat.location.longitude}
          latitude={selectedFat.location.latitude}
          anchor="bottom"
          offset={16}
          closeButton={false}
          closeOnClick={false}
          className="network-element-mapbox-popup"
          maxWidth="380px"
          onClose={() => onSelectElement(null)}
        >
          <NetworkElementPopup
            element={{ kind: 'fat', data: selectedFat }}
            onClose={() => onSelectElement(null)}
            onOpenSplitting={onOpenSplitting}
          />

        </Popup>
      ) : null}

      {selectedCable && selectedCableTarget ? (
        <Popup
          longitude={selectedCableTarget.longitude}
          latitude={selectedCableTarget.latitude}
          anchor="bottom"
          offset={16}
          closeButton={false}
          closeOnClick={false}
          className="network-element-mapbox-popup"
          maxWidth="380px"
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
          anchor="bottom"
          offset={36}
          closeButton={false}
          closeOnClick={false}
          className="network-element-mapbox-popup"
          maxWidth="380px"
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
  );
};
