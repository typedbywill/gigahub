import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import { Button, Dropdown } from '@heroui/react';
import {
  LuChevronDown,
  LuCopy,
  LuExternalLink,
  LuMapPin,
  LuNavigation,
  LuNetwork,
} from 'react-icons/lu';
import type { GeoPointDto } from '@gigahub/shared/contracts';
import { useThemeStore } from '../../../../shared/stores/theme.store';
import { resolveMapStyleUrl } from '../../../rede/map-styles';
import { routes } from '../../../../shared/routes';
import { toast } from '../../../../shared/ui/toast';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface ClienteMapCardProps {
  location?: GeoPointDto;
  customerId?: string;
  customerName?: string;
  addressLabel?: string;
  className?: string;
}

function resolveMapboxToken(): string {
  return (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim();
}

export const ClienteMapCard: React.FC<ClienteMapCardProps> = ({
  location,
  customerId,
  customerName,
  addressLabel,
  className = '',
}) => {
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const mapboxToken = resolveMapboxToken();

  const redeProjetoUrl = useMemo(() => {
    if (!location) return '';
    const params = new URLSearchParams();
    params.set('lat', location.latitude.toFixed(6));
    params.set('lng', location.longitude.toFixed(6));
    params.set('z', '17');
    if (customerId) {
      params.set('sel', `customer:${customerId}`);
    }
    if (customerName) {
      params.set('q', customerName);
    }
    return `${routes.redeProjeto}?${params.toString()}`;
  }, [location, customerId, customerName]);

  if (!location || (location.latitude === 0 && location.longitude === 0)) {
    return (
      <div
        className={`flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-default/40 p-4 text-center ${className}`}
      >
        <LuMapPin className="size-8 text-muted/60" />
        <p className="mt-2 text-xs font-medium text-muted">
          Coordenadas geográficas não cadastradas
        </p>
      </div>
    );
  }

  const { latitude, longitude } = location;
  const mapStyleUrl = resolveMapStyleUrl('auto', isDark);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const wazeUrl = `https://www.waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
  const appleMapsUrl = `https://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(customerName || 'Cliente')}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;


  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-surface shadow-xs ${className}`}
    >
      <div className="relative h-64 w-full bg-default/20">
        {mapboxToken ? (
          <Map
            mapboxAccessToken={mapboxToken}
            initialViewState={{
              longitude,
              latitude,
              zoom: 16,
            }}
            mapStyle={mapStyleUrl}
            attributionControl={false}
            dragRotate={false}
            style={{ width: '100%', height: '100%' }}
          >
            <NavigationControl position="top-right" showCompass={false} />

            <Marker
              longitude={longitude}
              latitude={latitude}
              anchor="bottom"
            >
              <div className="group relative flex flex-col items-center">
                {/* Pin Tooltip */}
                {customerName ? (
                  <div className="mb-1.5 hidden rounded-md bg-surface/95 px-2 py-1 text-[11px] font-semibold text-foreground shadow-md backdrop-blur border border-border group-hover:block whitespace-nowrap">
                    {customerName}
                  </div>
                ) : null}

                {/* Pin Element */}
                <div className="relative flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-accent text-white shadow-lg transition-transform hover:scale-110 active:scale-95">
                  <LuMapPin className="size-4.5" />
                  <span className="absolute -inset-1 animate-ping rounded-full bg-accent/30 pointer-events-none" />
                </div>
              </div>
            </Marker>
          </Map>
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-muted">
            Token do Mapbox não configurado (VITE_MAPBOX_TOKEN).
          </div>
        )}
      </div>

      {/* Barra de Ações Inferior */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 bg-surface px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <LuMapPin className="size-3.5 text-accent shrink-0" />
          <span className="font-mono font-medium text-foreground">
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
          {addressLabel ? (
            <span className="hidden sm:inline text-muted truncate max-w-[220px]">
              • {addressLabel}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* Menu Dropdown Ver em... */}
          <Dropdown>
            <Button
              size="sm"
              variant="flat"
              className="h-8 gap-1.5 text-xs font-medium"
              aria-label="Opções de navegação e mapa"
            >
              <LuNavigation className="size-3.5 text-accent" />
              <span>Ver em…</span>
              <LuChevronDown className="size-3 text-muted" />
            </Button>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu
                aria-label="Abrir localização em"
                onAction={(key) => {
                  if (key === 'projeto') {
                    navigate(redeProjetoUrl);
                  } else if (key === 'google-maps') {
                    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
                  } else if (key === 'waze') {
                    window.open(wazeUrl, '_blank', 'noopener,noreferrer');
                  } else if (key === 'apple-maps') {
                    window.open(appleMapsUrl, '_blank', 'noopener,noreferrer');
                  } else if (key === 'osm') {
                    window.open(osmUrl, '_blank', 'noopener,noreferrer');
                  } else if (key === 'copy-coords') {
                    void navigator.clipboard.writeText(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                    toast.success('Coordenadas copiadas para a área de transferência!');
                  }
                }}
              >
                <Dropdown.Item id="projeto" textValue="Projeto de Rede (GigaHub)">
                  <div className="flex items-center gap-2">
                    <LuNetwork className="size-4 text-accent" />
                    <span className="font-medium text-foreground">Projeto de Rede</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item id="google-maps" textValue="Google Maps">
                  <div className="flex items-center gap-2">
                    <LuExternalLink className="size-4 text-muted" />
                    <span>Google Maps</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item id="waze" textValue="Waze">
                  <div className="flex items-center gap-2">
                    <LuExternalLink className="size-4 text-muted" />
                    <span>Waze</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item id="apple-maps" textValue="Apple Maps">
                  <div className="flex items-center gap-2">
                    <LuExternalLink className="size-4 text-muted" />
                    <span>Apple Maps</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item id="osm" textValue="OpenStreetMap">
                  <div className="flex items-center gap-2">
                    <LuExternalLink className="size-4 text-muted" />
                    <span>OpenStreetMap</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item id="copy-coords" textValue="Copiar Coordenadas">
                  <div className="flex items-center gap-2">
                    <LuCopy className="size-4 text-muted" />
                    <span>Copiar Coordenadas</span>
                  </div>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>
    </div>
  );
};
