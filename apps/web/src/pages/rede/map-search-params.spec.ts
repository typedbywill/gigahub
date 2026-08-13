import {
  parseMapSearchParams,
  toMapSearchParams,
  type MapUrlState,
} from './map-search-params';

describe('map-search-params', () => {
  it('parses camera, selection, layers and panel', () => {
    const params = new URLSearchParams(
      'lat=-29.68&lng=-53.8&z=15.5&sel=fat:42&layers=fat&q=cto&panel=collapsed',
    );
    expect(parseMapSearchParams(params)).toEqual({
      lat: -29.68,
      lng: -53.8,
      zoom: 15.5,
      q: 'cto',
      selected: { kind: 'fat', id: '42' },
      layers: { fat: true, cables: false },
      panelCollapsed: true,
    });
  });

  it('omits default layers and expanded panel when serializing', () => {
    const state: MapUrlState = {
      lat: -29.684321,
      lng: -53.806543,
      zoom: 14,
      q: '',
      selected: null,
      layers: { fat: true, cables: true },
      panelCollapsed: false,
    };
    expect(toMapSearchParams(state).toString()).toBe(
      'lat=-29.684321&lng=-53.806543&z=14',
    );
  });

  it('serializes selection and non-default layers', () => {
    const state: MapUrlState = {
      lat: -29.68,
      lng: -53.8,
      zoom: 12,
      q: 'flat',
      selected: { kind: 'cable', id: '9' },
      layers: { fat: false, cables: true },
      panelCollapsed: true,
    };
    expect(toMapSearchParams(state).toString()).toBe(
      'lat=-29.680000&lng=-53.800000&z=12&q=flat&sel=cable%3A9&layers=cables&panel=collapsed',
    );
  });
});
