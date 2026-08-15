import { useCallback, useState } from 'react';
import type { GeoPointDto } from '@gigahub/shared/contracts';

export interface GeolocationState {
  loading: boolean;
  location: GeoPointDto | null;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    location: null,
    error: null,
  });

  const getCurrentLocation = useCallback(async (): Promise<GeoPointDto | null> => {
    if (!navigator.geolocation) {
      setState({
        loading: false,
        location: null,
        error: 'Geolocalização não suportada pelo navegador',
      });
      return null;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    return new Promise<GeoPointDto | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: GeoPointDto = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setState({
            loading: false,
            location: loc,
            error: null,
          });
          resolve(loc);
        },
        (err) => {
          let msg = 'Erro ao obter localização';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Permissão de localização negada pelo usuário/navegador';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Sinal de GPS indisponível no momento';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Tempo limite esgotado ao buscar GPS';
          }
          setState({
            loading: false,
            location: null,
            error: msg,
          });
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
      );
    });
  }, []);

  return {
    ...state,
    getCurrentLocation,
  };
}
