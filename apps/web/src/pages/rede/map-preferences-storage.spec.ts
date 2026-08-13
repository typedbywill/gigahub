import {
  DEFAULT_MAP_PREFERENCES,
  MAP_PREFERENCES_STORAGE_KEY,
  mergeUrlWithStorage,
  parseMapPreferences,
  readMapPreferences,
  writeMapPreferences,
  type MapPreferences,
} from './map-preferences-storage';

describe('map-preferences-storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('parses stored preferences defensively', () => {
    expect(parseMapPreferences(null)).toEqual({
      ...DEFAULT_MAP_PREFERENCES,
      layers: { fat: true, cables: true },
    });
    expect(
      parseMapPreferences({
        lat: -29.68,
        lng: -53.8,
        zoom: 14,
        layers: { fat: false, cables: true },
        mapStyle: 'satellite',
        showFatLabels: false,
        panelCollapsed: true,
        activeTab: 'elementos',
      }),
    ).toEqual({
      lat: -29.68,
      lng: -53.8,
      zoom: 14,
      layers: { fat: false, cables: true },
      mapStyle: 'satellite',
      showFatLabels: false,
      panelCollapsed: true,
      activeTab: 'elementos',
    });
  });

  it('maps legacy aparencia/configuracoes tabs to mapa', () => {
    expect(parseMapPreferences({ activeTab: 'aparencia' }).activeTab).toBe(
      'mapa',
    );
    expect(parseMapPreferences({ activeTab: 'configuracoes' }).activeTab).toBe(
      'mapa',
    );
  });

  it('reads and writes preferences to localStorage', () => {
    writeMapPreferences({
      lat: -29.68,
      lng: -53.8,
      zoom: 15,
      mapStyle: 'dark',
      showFatLabels: false,
      activeTab: 'mapa',
    });
    const stored = JSON.parse(
      window.localStorage.getItem(MAP_PREFERENCES_STORAGE_KEY)!,
    ) as MapPreferences;
    expect(stored.mapStyle).toBe('dark');
    expect(stored.showFatLabels).toBe(false);
    expect(stored.activeTab).toBe('mapa');

    expect(readMapPreferences()).toMatchObject({
      lat: -29.68,
      lng: -53.8,
      zoom: 15,
      mapStyle: 'dark',
      showFatLabels: false,
      activeTab: 'mapa',
    });
  });

  it('gives explicit URL params precedence over storage', () => {
    const stored: MapPreferences = {
      lat: -10,
      lng: -50,
      zoom: 10,
      layers: { fat: false, cables: false },
      mapStyle: 'dark',
      showFatLabels: false,
      panelCollapsed: true,
      activeTab: 'elementos',
    };
    const params = new URLSearchParams(
      'lat=-29.68&lng=-53.8&z=15&layers=fat&style=satellite&labels=0&panel=collapsed',
    );
    const { urlState, activeTab } = mergeUrlWithStorage(params, stored);
    expect(urlState).toMatchObject({
      lat: -29.68,
      lng: -53.8,
      zoom: 15,
      layers: { fat: true, cables: false },
      mapStyle: 'satellite',
      showFatLabels: false,
      panelCollapsed: true,
    });
    expect(activeTab).toBe('elementos');
  });

  it('fills missing URL keys from storage', () => {
    const stored: MapPreferences = {
      lat: -29.68,
      lng: -53.8,
      zoom: 14,
      layers: { fat: true, cables: false },
      mapStyle: 'light',
      showFatLabels: false,
      panelCollapsed: true,
      activeTab: 'mapa',
    };
    const { urlState, activeTab } = mergeUrlWithStorage(
      new URLSearchParams('q=cto'),
      stored,
    );
    expect(urlState).toMatchObject({
      lat: -29.68,
      lng: -53.8,
      zoom: 14,
      q: 'cto',
      layers: { fat: true, cables: false },
      mapStyle: 'light',
      showFatLabels: false,
      panelCollapsed: true,
    });
    expect(activeTab).toBe('mapa');
  });
});
