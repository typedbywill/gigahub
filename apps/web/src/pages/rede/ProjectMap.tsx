import React, { useMemo } from 'react';
import type { FeatureCollection } from 'geojson';
import Map, {
  Layer,
  NavigationControl,
  Source,
  type MapRef,
} from 'react-map-gl/mapbox';
import type {
  NearbyFiberAccessTerminalDto,
  NearbyFiberCableDto,
} from '@gigahub/shared/contracts';
import type { MapLayerVisibility } from './MapControlsPanel';
import 'mapbox-gl/dist/mapbox-gl.css';

const LIGHT_STYLE = 'mapbox://styles/mapbox/streets-v12';
const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';
const FALLBACK_FAT_COLOR = '#000000';
const FALLBACK_CABLE_COLOR = '#0284c7';

export type ProjectMapProps = {
  mapRef: React.RefObject<MapRef | null>;
  mapboxToken: string;
  isDark: boolean;
  initialViewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  fats: NearbyFiberAccessTerminalDto[];
  cables: NearbyFiberCableDto[];
  layers: MapLayerVisibility;
  selectedId: string | null;
  onMoveEnd: () => void;
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
  isDark,
  initialViewState,
  fats,
  cables,
  layers,
  selectedId,
  onMoveEnd,
}) => {
  const fatData = useMemo(() => fatsToGeoJson(fats), [fats]);
  const cableData = useMemo(() => cablesToGeoJson(cables), [cables]);
  const selectedFilter = useMemo(
    () => idEqualsFilter(selectedId),
    [selectedId],
  );

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={mapboxToken}
      initialViewState={initialViewState}
      mapStyle={isDark ? DARK_STYLE : LIGHT_STYLE}
      style={{ width: '100%', height: '100%' }}
      onMoveEnd={onMoveEnd}
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
            'circle-stroke-color': isDark ? '#0f172a' : '#ffffff',
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
            visibility: layers.fat ? 'visible' : 'none',
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-optional': true,
          }}
          paint={{
            'text-color': isDark ? '#e2e8f0' : '#1e293b',
            'text-halo-color': isDark ? '#0f172a' : '#ffffff',
            'text-halo-width': 1.5,
          }}
        />
      </Source>
    </Map>
  );
};
