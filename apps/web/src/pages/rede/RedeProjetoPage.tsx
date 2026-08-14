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
import { searchCustomersRequest } from '../../shared/api/clientes.api';
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
  mergeUrlWithStorage,
  preferencesFromUrlState,
  writeMapPreferences,
  type MapPanelTab,
} from './map-preferences-storage';
import {
  mapUrlStatesEqual,
  toMapSearchParams,
  type MapSelectedRef,
  type MapUrlState,
} from './map-search-params';
import type { MapBaseStyleId } from './map-styles';
import { ProjectMap, type CustomerMapPin } from './ProjectMap';
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

function persistPreferences(state: MapUrlState, activeTab: MapPanelTab): void {
  writeMapPreferences(preferencesFromUrlState(state, activeTab));
}

export const RedeProjetoPage: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const mapboxToken = resolveMapboxToken();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [searchParams, setSearchParams] = useSearchParams();

  const [urlState, setUrlState] = useState<MapUrlState>(
    () => mergeUrlWithStorage(searchParams).urlState,
  );
  const [activeTab, setActiveTab] = useState<MapPanelTab>(
    () => mergeUrlWithStorage(searchParams).activeTab,
  );

  const mapRef = useRef<MapRef | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const didInitialFetchRef = useRef(false);
  const didFlyToSelectionRef = useRef(false);
  const didSyncUrlRef = useRef(false);
  const urlStateRef = useRef(urlState);
  urlStateRef.current = urlState;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

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
  const [customerPin, setCustomerPin] = useState<CustomerMapPin | null>(null);

  const search = urlState.q;
  const layers = useMemo(() => layersFromUrl(urlState), [urlState]);
  const selectedKey = urlState.selected
    ? `${urlState.selected.kind}:${urlState.selected.id}`
    : null;
  const selectedId =
    urlState.selected?.kind === 'customer' ? null : (urlState.selected?.id ?? null);
  const collapsed = urlState.panelCollapsed;
  const mapStyle = urlState.mapStyle;
  const showFatLabels = urlState.showFatLabels;

  const patchUrlState = useCallback(
    (patch: Partial<MapUrlState>) => {
      const next: MapUrlState = { ...urlStateRef.current, ...patch };
      if (mapUrlStatesEqual(urlStateRef.current, next)) {
        return;
      }
      urlStateRef.current = next;
      setUrlState(next);
      persistPreferences(next, activeTabRef.current);
      startTransition(() => {
        setSearchParams(toMapSearchParams(next), { replace: true });
      });
    },
    [setSearchParams],
  );

  // Sync URL once after bootstrap so restored storage prefs appear in the address bar.
  useEffect(() => {
    if (didSyncUrlRef.current) {
      return;
    }
    didSyncUrlRef.current = true;
    const nextParams = toMapSearchParams(urlState);
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
    persistPreferences(urlState, activeTab);
  }, [activeTab, searchParams, setSearchParams, urlState]);

  // Keep local state in sync when the user navigates with browser back/forward.
  useEffect(() => {
    if (!didSyncUrlRef.current) {
      return;
    }
    const merged = mergeUrlWithStorage(searchParams);
    if (!mapUrlStatesEqual(urlStateRef.current, merged.urlState)) {
      urlStateRef.current = merged.urlState;
      setUrlState(merged.urlState);
      persistPreferences(merged.urlState, activeTabRef.current);
    }
  }, [searchParams]);

  const handleActiveTabChange = useCallback((tab: MapPanelTab) => {
    setActiveTab(tab);
    activeTabRef.current = tab;
    persistPreferences(urlStateRef.current, tab);
  }, []);

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
    const container = mapContainerRef.current;
    if (!container) {
      return;
    }

    let animationFrameId: number;

    const handleResize = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        const map = mapRef.current;
        if (map) {
          map.resize();
        }
      });
    };

    const observer = new ResizeObserver(() => {
      handleResize();
    });

    observer.observe(container);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

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
      void Promise.allSettled([
        searchProjectNetworkRequest(
          accessToken,
          { q, kind: 'all', limit: 40 },
          controller.signal,
        ),
        searchCustomersRequest(
          accessToken,
          { q, limit: 10 },
          controller.signal,
        ),
      ])
        .then(([networkResult, customerResult]) => {
          if (controller.signal.aborted) {
            return;
          }

          const merged: MapSearchHit[] = [];
          if (networkResult.status === 'fulfilled') {
            merged.push(
              ...networkResult.value.items.map((item) => ({
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
          }

          if (customerResult.status === 'fulfilled') {
            merged.push(
              ...customerResult.value.items
                .filter((item) => item.location)
                .map((item) => ({
                  id: item.id,
                  kind: 'customer' as const,
                  name: item.name,
                  subtitle: item.document ?? item.idErp,
                  latitude: item.location!.latitude,
                  longitude: item.location!.longitude,
                })),
            );
          }

          merged.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
          setHits(merged);

          const errors: string[] = [];
          if (networkResult.status === 'rejected') {
            const err = networkResult.reason;
            if (err instanceof ApiClientError) {
              errors.push(err.message || 'Falha ao buscar rede.');
            } else {
              errors.push('Falha ao buscar rede.');
            }
          }
          if (customerResult.status === 'rejected') {
            const err = customerResult.reason;
            if (!(err instanceof ApiClientError && err.status === 403)) {
              if (err instanceof ApiClientError) {
                errors.push(err.message || 'Falha ao buscar clientes.');
              }
            }
          }
          setSearchError(errors.length ? errors.join(' ') : null);
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
      if (selected.kind === 'customer') {
        if (urlState.lat != null && urlState.lng != null) {
          flyToPoint(urlState.lat, urlState.lng, 16);
        }
        return;
      }
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
    [cables, fats, flyToPoint, urlState.lat, urlState.lng],
  );

  useEffect(() => {
    const selected = urlState.selected;
    if (!selected || selected.kind !== 'customer') {
      setCustomerPin(null);
      return;
    }
    if (urlState.lat == null || urlState.lng == null) {
      setCustomerPin(null);
      return;
    }
    const hit = hits.find(
      (item) => item.kind === 'customer' && item.id === selected.id,
    );
    setCustomerPin({
      id: selected.id,
      name: hit?.name ?? `Cliente ${selected.id}`,
      latitude: urlState.lat,
      longitude: urlState.lng,
    });
  }, [hits, urlState.lat, urlState.lng, urlState.selected]);

  useEffect(() => {
    if (!urlState.selected || didFlyToSelectionRef.current) {
      return;
    }
    if (urlState.selected.kind === 'customer') {
      if (urlState.lat == null || urlState.lng == null) {
        return;
      }
      didFlyToSelectionRef.current = true;
      flyToSelection(urlState.selected);
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

  const handleSelectElement = useCallback(
    (selected: MapSelectedRef | null) => {
      if (!selected) {
        patchUrlState({ selected: null });
        return;
      }
      if (selected.kind === 'fat') {
        const fat = fats.find((f) => f.id === selected.id);
        if (fat) {
          patchUrlState({
            selected,
            lat: fat.location.latitude,
            lng: fat.location.longitude,
          });
        } else {
          patchUrlState({ selected });
        }
      } else if (selected.kind === 'cable') {
        const cable = cables.find((c) => c.id === selected.id);
        if (cable && cable.path.length > 0) {
          const target = cableFlyTarget(cable);
          patchUrlState({
            selected,
            lat: target.latitude,
            lng: target.longitude,
          });
        } else {
          patchUrlState({ selected });
        }
      } else {
        patchUrlState({ selected });
      }
    },
    [cables, fats, patchUrlState],
  );

  const selectedCustomerData = useMemo(() => {
    if (urlState.selected?.kind !== 'customer') {
      return null;
    }
    const hit = hits.find(
      (h) => h.kind === 'customer' && h.id === urlState.selected?.id,
    );
    return hit ? { subtitle: hit.subtitle, document: hit.subtitle } : null;
  }, [hits, urlState.selected]);

  const handleSelectHit = useCallback(
    (hit: MapSearchHit) => {
      if (hit.kind === 'customer') {
        setCustomerPin({
          id: hit.id,
          name: hit.name,
          latitude: hit.latitude,
          longitude: hit.longitude,
        });
      } else {
        setCustomerPin(null);
      }

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
        hit.kind === 'fat' ? 16 : hit.kind === 'customer' ? 16 : 15,
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
      <div
        ref={mapContainerRef}
        className="project-map-root absolute inset-0 z-0"
      >
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
          selected={urlState.selected}
          selectedCustomerData={selectedCustomerData}
          customerPin={customerPin}
          onSelectElement={handleSelectElement}
          onMoveEnd={scheduleFetchFromMap}
          onResize={scheduleFetchFromMap}
        />
      </div>

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
          selectedKey={selectedKey}
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
          activeTab={activeTab}
          onActiveTabChange={handleActiveTabChange}
        />
      </div>
    </div>
  );
};
