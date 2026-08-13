import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import type {
  NearbyFiberAccessTerminalDto,
  NearbyFiberCableDto,
} from '@gigahub/shared/contracts';
import { ApiClientError } from '../../shared/api/auth.api';
import {
  listNearbyCablesRequest,
  listNearbyFatsRequest,
} from '../../shared/api/projeto.api';
import { useMediaQuery } from '../../shared/hooks/use-media-query';
import { useAuthStore } from '../../shared/stores/auth.store';
import { useThemeStore } from '../../shared/stores/theme.store';
import {
  MapControlsPanel,
  type MapLayerVisibility,
  type MapSearchHit,
} from './MapControlsPanel';
import { ProjectMap } from './ProjectMap';
import {
  DEFAULT_NEARBY_RADIUS_METERS,
  FALLBACK_MAP_CENTER,
  radiusFromBoundsMeters,
} from './map-utils';

const FETCH_DEBOUNCE_MS = 400;

type InitialView = {
  longitude: number;
  latitude: number;
  zoom: number;
};

function resolveMapboxToken(): string {
  return (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim();
}

function cableFlyTarget(cable: NearbyFiberCableDto): {
  latitude: number;
  longitude: number;
} {
  const mid = Math.floor(cable.path.length / 2);
  const point = cable.path[mid] ?? cable.path[0];
  return { latitude: point.latitude, longitude: point.longitude };
}

export const RedeProjetoPage: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const mapboxToken = resolveMapboxToken();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const mapRef = useRef<MapRef | null>(null);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const didInitialFetchRef = useRef(false);

  const [initialView, setInitialView] = useState<InitialView | null>(null);
  const [layers, setLayers] = useState<MapLayerVisibility>({
    fat: true,
    cables: true,
    ceo: false,
  });
  const [search, setSearch] = useState('');
  const [fats, setFats] = useState<NearbyFiberAccessTerminalDto[]>([]);
  const [cables, setCables] = useState<NearbyFiberCableDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    let cancelled = false;

    const apply = (view: InitialView) => {
      if (!cancelled) {
        setInitialView(view);
      }
    };

    if (!navigator.geolocation) {
      apply({
        longitude: FALLBACK_MAP_CENTER.longitude,
        latitude: FALLBACK_MAP_CENTER.latitude,
        zoom: FALLBACK_MAP_CENTER.zoom,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        apply({
          longitude: pos.coords.longitude,
          latitude: pos.coords.latitude,
          zoom: 14,
        });
      },
      () => {
        apply({
          longitude: FALLBACK_MAP_CENTER.longitude,
          latitude: FALLBACK_MAP_CENTER.latitude,
          zoom: FALLBACK_MAP_CENTER.zoom,
        });
      },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchNearby = useCallback(
    async (lat: number, lng: number, radius: number) => {
      if (!accessToken) {
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const [fatRes, cableRes] = await Promise.all([
          listNearbyFatsRequest(
            accessToken,
            { lat, lng, radius },
            controller.signal,
          ),
          listNearbyCablesRequest(
            accessToken,
            { lat, lng, radius },
            controller.signal,
          ),
        ]);
        if (controller.signal.aborted) {
          return;
        }
        setFats(fatRes.items);
        setCables(cableRes.items);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        if (err instanceof ApiClientError) {
          setError(err.message || 'Falha ao carregar elementos da rede.');
        } else {
          setError('Falha ao carregar elementos da rede.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [accessToken],
  );

  const scheduleFetchFromMap = useCallback(() => {
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
    }
    fetchTimerRef.current = setTimeout(() => {
      const map = mapRef.current;
      if (!map) {
        return;
      }
      const center = map.getCenter();
      const bounds = map.getBounds();
      const radius = bounds
        ? radiusFromBoundsMeters(bounds)
        : DEFAULT_NEARBY_RADIUS_METERS;
      void fetchNearby(center.lat, center.lng, radius);
    }, FETCH_DEBOUNCE_MS);
  }, [fetchNearby]);

  useEffect(() => {
    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!initialView || !accessToken || didInitialFetchRef.current) {
      return;
    }
    didInitialFetchRef.current = true;
    void fetchNearby(
      initialView.latitude,
      initialView.longitude,
      DEFAULT_NEARBY_RADIUS_METERS,
    );
  }, [accessToken, fetchNearby, initialView]);

  const hits = useMemo<MapSearchHit[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return [];
    }
    const fatHits: MapSearchHit[] = fats
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.idErp.toLowerCase().includes(q),
      )
      .map((f) => ({
        id: f.id,
        kind: 'fat' as const,
        name: f.name,
        subtitle: f.idErp,
      }));
    const cableHits: MapSearchHit[] = cables
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.idErp.toLowerCase().includes(q) ||
          (c.cableTypeName?.toLowerCase().includes(q) ?? false),
      )
      .map((c) => ({
        id: c.id,
        kind: 'cable' as const,
        name: c.name,
        subtitle: c.cableTypeName ?? c.idErp,
      }));
    return [...fatHits, ...cableHits].slice(0, 40);
  }, [cables, fats, search]);

  const handleLayerChange = useCallback(
    (layer: keyof MapLayerVisibility, value: boolean) => {
      if (layer === 'ceo') {
        return;
      }
      setLayers((prev) => ({ ...prev, [layer]: value }));
    },
    [],
  );

  const handleToggleCollapse = useCallback(() => {
    if (isMobile) {
      setMobileOpen((open) => !open);
      return;
    }
    setCollapsed((value) => !value);
  }, [isMobile]);

  const handleSelectHit = useCallback(
    (hit: MapSearchHit) => {
      setSelectedId(hit.id);
      if (isMobile) {
        setMobileOpen(false);
      }
      const map = mapRef.current;
      if (!map) {
        return;
      }
      if (hit.kind === 'fat') {
        const fat = fats.find((f) => f.id === hit.id);
        if (!fat) {
          return;
        }
        map.flyTo({
          center: [fat.location.longitude, fat.location.latitude],
          zoom: Math.max(map.getZoom(), 16),
          essential: true,
        });
        return;
      }
      const cable = cables.find((c) => c.id === hit.id);
      if (!cable || cable.path.length === 0) {
        return;
      }
      const target = cableFlyTarget(cable);
      map.flyTo({
        center: [target.longitude, target.latitude],
        zoom: Math.max(map.getZoom(), 15),
        essential: true,
      });
    },
    [cables, fats, isMobile],
  );

  if (!mapboxToken) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center p-6 md:h-dvh">
        <div className="max-w-md space-y-2 text-center">
          <h1 className="font-display text-xl font-bold text-foreground">
            Mapa indisponível
          </h1>
          <p className="text-sm text-muted">
            Configure a variável{' '}
            <code className="rounded bg-default/60 px-1.5 py-0.5 font-mono text-xs">
              VITE_MAPBOX_TOKEN
            </code>{' '}
            no arquivo <code className="font-mono text-xs">.env</code> e
            reinicie o frontend.
          </p>
        </div>
      </div>
    );
  }

  if (!initialView) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center text-sm text-muted md:h-dvh">
        Obtendo localização…
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-3.5rem)] overflow-hidden md:h-dvh">
      <div className="project-map-root absolute inset-0 z-0">
        <ProjectMap
          mapRef={mapRef}
          mapboxToken={mapboxToken}
          isDark={isDark}
          initialViewState={initialView}
          fats={fats}
          cables={cables}
          layers={layers}
          selectedId={selectedId}
          onMoveEnd={scheduleFetchFromMap}
        />
      </div>

      {isMobile && mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar painel do mapa"
          className="pointer-events-auto absolute inset-0 z-10 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-20">
        <MapControlsPanel
          search={search}
          onSearchChange={setSearch}
          layers={layers}
          onLayerChange={handleLayerChange}
          hits={hits}
          onSelectHit={handleSelectHit}
          selectedId={selectedId}
          loading={loading}
          error={error}
          fatCount={fats.length}
          cableCount={cables.length}
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </div>
    </div>
  );
};
