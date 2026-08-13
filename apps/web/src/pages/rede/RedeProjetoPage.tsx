import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import type { MapRef } from 'react-map-gl/mapbox';
import type {
  NearbyFiberAccessTerminalDto,
  NearbyFiberCableDto,
} from '@gigahub/shared/contracts';
import { ApiClientError } from '../../shared/api/auth.api';
import {
  listNearbyCablesRequest,
  listNearbyFatsRequest,
  searchProjectNetworkRequest,
} from '../../shared/api/projeto.api';
import { useMediaQuery } from '../../shared/hooks/use-media-query';
import { useAuthStore } from '../../shared/stores/auth.store';
import { useThemeStore } from '../../shared/stores/theme.store';
import {
  MapControlsPanel,
  type MapLayerVisibility,
  type MapSearchHit,
} from './MapControlsPanel';
import {
  mapUrlStatesEqual,
  parseMapSearchParams,
  toMapSearchParams,
  type MapSelectedRef,
  type MapUrlState,
} from './map-search-params';
import type { MapBaseStyleId } from './map-styles';
import { ProjectMap } from './ProjectMap';
import {
  DEFAULT_NEARBY_RADIUS_METERS,
  FALLBACK_MAP_CENTER,
  radiusFromBoundsMeters,
} from './map-utils';

const FETCH_DEBOUNCE_MS = 400;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;

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

function layersFromUrl(url: MapUrlState): MapLayerVisibility {
  return {
    fat: url.layers.fat,
    cables: url.layers.cables,
    ceo: false,
  };
}

export const RedeProjetoPage: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const mapboxToken = resolveMapboxToken();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [searchParams, setSearchParams] = useSearchParams();

  const urlState = useMemo(
    () => parseMapSearchParams(searchParams),
    [searchParams],
  );

  const mapRef = useRef<MapRef | null>(null);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const didInitialFetchRef = useRef(false);
  const didFlyToSelectionRef = useRef(false);
  const urlStateRef = useRef(urlState);
  urlStateRef.current = urlState;

  const [initialView, setInitialView] = useState<InitialView | null>(() => {
    if (urlState.lat != null && urlState.lng != null) {
      return {
        latitude: urlState.lat,
        longitude: urlState.lng,
        zoom: urlState.zoom ?? 14,
      };
    }
    return null;
  });
  const [fats, setFats] = useState<NearbyFiberAccessTerminalDto[]>([]);
  const [cables, setCables] = useState<NearbyFiberCableDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<MapSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const search = urlState.q;
  const layers = useMemo(() => layersFromUrl(urlState), [urlState]);
  const selectedId = urlState.selected?.id ?? null;
  const collapsed = urlState.panelCollapsed;
  const mapStyle = urlState.mapStyle;
  const showFatLabels = urlState.showFatLabels;

  const patchUrlState = useCallback(
    (patch: Partial<MapUrlState>) => {
      const next: MapUrlState = { ...urlStateRef.current, ...patch };
      if (mapUrlStatesEqual(urlStateRef.current, next)) {
        return;
      }
      startTransition(() => {
        setSearchParams(toMapSearchParams(next), { replace: true });
      });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (initialView) {
      return;
    }

    let cancelled = false;

    const apply = (view: InitialView) => {
      if (cancelled) {
        return;
      }
      setInitialView(view);
      patchUrlState({
        lat: view.latitude,
        lng: view.longitude,
        zoom: view.zoom,
      });
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
  }, [initialView, patchUrlState]);

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
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      const radius = bounds
        ? radiusFromBoundsMeters(bounds)
        : DEFAULT_NEARBY_RADIUS_METERS;
      patchUrlState({
        lat: center.lat,
        lng: center.lng,
        zoom,
      });
      void fetchNearby(center.lat, center.lng, radius);
    }, FETCH_DEBOUNCE_MS);
  }, [fetchNearby, patchUrlState]);

  useEffect(() => {
    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      abortRef.current?.abort();
      searchAbortRef.current?.abort();
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

  useEffect(() => {
    const q = search.trim();
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchAbortRef.current?.abort();

    if (q.length < SEARCH_MIN_LENGTH) {
      setHits([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    if (!accessToken) {
      return;
    }

    setSearching(true);
    searchTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      searchAbortRef.current = controller;
      void searchProjectNetworkRequest(
        accessToken,
        { q, kind: 'all', limit: 40 },
        controller.signal,
      )
        .then((res) => {
          if (controller.signal.aborted) {
            return;
          }
          setHits(
            res.items.map((item) => ({
              id: item.id,
              kind: item.kind,
              name: item.name,
              subtitle:
                item.kind === 'fat'
                  ? item.idErp
                  : (item.cableTypeName ?? item.idErp),
              latitude: item.location.latitude,
              longitude: item.location.longitude,
            })),
          );
          setSearchError(null);
        })
        .catch((err) => {
          if (controller.signal.aborted) {
            return;
          }
          setHits([]);
          if (err instanceof ApiClientError) {
            setSearchError(err.message || 'Falha ao buscar elementos.');
          } else {
            setSearchError('Falha ao buscar elementos.');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setSearching(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [accessToken, search]);

  const flyToPoint = useCallback(
    (latitude: number, longitude: number, zoom: number) => {
      const map = mapRef.current;
      if (!map) {
        return;
      }
      map.flyTo({
        center: [longitude, latitude],
        zoom: Math.max(map.getZoom(), zoom),
        essential: true,
      });
    },
    [],
  );

  const flyToSelection = useCallback(
    (selected: MapSelectedRef) => {
      if (selected.kind === 'fat') {
        const fat = fats.find((f) => f.id === selected.id);
        if (!fat) {
          return;
        }
        flyToPoint(fat.location.latitude, fat.location.longitude, 16);
        return;
      }
      const cable = cables.find((c) => c.id === selected.id);
      if (!cable || cable.path.length === 0) {
        return;
      }
      const target = cableFlyTarget(cable);
      flyToPoint(target.latitude, target.longitude, 15);
    },
    [cables, fats, flyToPoint],
  );

  useEffect(() => {
    if (!urlState.selected || didFlyToSelectionRef.current) {
      return;
    }
    if (fats.length === 0 && cables.length === 0) {
      return;
    }
    const exists =
      urlState.selected.kind === 'fat'
        ? fats.some((f) => f.id === urlState.selected!.id)
        : cables.some((c) => c.id === urlState.selected!.id);
    if (!exists) {
      return;
    }
    didFlyToSelectionRef.current = true;
    flyToSelection(urlState.selected);
  }, [cables, fats, flyToSelection, urlState.selected]);

  const handleSearchChange = useCallback(
    (value: string) => {
      patchUrlState({ q: value });
    },
    [patchUrlState],
  );

  const handleLayerChange = useCallback(
    (layer: keyof MapLayerVisibility, value: boolean) => {
      if (layer === 'ceo') {
        return;
      }
      patchUrlState({
        layers: {
          fat: layer === 'fat' ? value : layers.fat,
          cables: layer === 'cables' ? value : layers.cables,
        },
      });
    },
    [layers.cables, layers.fat, patchUrlState],
  );

  const handleMapStyleChange = useCallback(
    (style: MapBaseStyleId) => {
      patchUrlState({ mapStyle: style });
    },
    [patchUrlState],
  );

  const handleShowFatLabelsChange = useCallback(
    (value: boolean) => {
      patchUrlState({ showFatLabels: value });
    },
    [patchUrlState],
  );

  const handleToggleCollapse = useCallback(() => {
    if (isMobile) {
      setMobileOpen((open) => !open);
      return;
    }
    patchUrlState({ panelCollapsed: !collapsed });
  }, [collapsed, isMobile, patchUrlState]);

  const handleSelectHit = useCallback(
    (hit: MapSearchHit) => {
      const selected: MapSelectedRef = { kind: hit.kind, id: hit.id };
      didFlyToSelectionRef.current = true;
      patchUrlState({
        selected,
        lat: hit.latitude,
        lng: hit.longitude,
      });
      if (isMobile) {
        setMobileOpen(false);
      }
      flyToPoint(
        hit.latitude,
        hit.longitude,
        hit.kind === 'fat' ? 16 : 15,
      );
      void fetchNearby(
        hit.latitude,
        hit.longitude,
        DEFAULT_NEARBY_RADIUS_METERS,
      );
    },
    [fetchNearby, flyToPoint, isMobile, patchUrlState],
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
          isAppDark={isDark}
          mapStyle={mapStyle}
          showFatLabels={showFatLabels}
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
          onSearchChange={handleSearchChange}
          layers={layers}
          onLayerChange={handleLayerChange}
          mapStyle={mapStyle}
          onMapStyleChange={handleMapStyleChange}
          showFatLabels={showFatLabels}
          onShowFatLabelsChange={handleShowFatLabelsChange}
          hits={hits}
          onSelectHit={handleSelectHit}
          selectedId={selectedId}
          loading={loading}
          searching={searching}
          error={searchError ?? error}
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
