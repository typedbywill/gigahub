import React from 'react';
import { Button } from '@heroui/react';
import { LuExternalLink, LuMapPin, LuNavigation } from 'react-icons/lu';
import type { GeoPointDto } from '@gigahub/shared/contracts';

export interface ClienteMapCardProps {
  location?: GeoPointDto;
  addressLabel?: string;
  className?: string;
}

export const ClienteMapCard: React.FC<ClienteMapCardProps> = ({
  location,
  addressLabel,
  className = '',
}) => {
  if (!location || (location.latitude === 0 && location.longitude === 0)) {
    return (
      <div
        className={`flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-default/40 p-4 text-center ${className}`}
      >
        <LuMapPin className="size-8 text-muted/60" />
        <p className="mt-2 text-xs font-medium text-muted">
          Coordenadas geográficas não cadastradas
        </p>
      </div>
    );
  }

  const { latitude, longitude } = location;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005}%2C${latitude - 0.003}%2C${longitude + 0.005}%2C${latitude + 0.003}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-surface ${className}`}
    >
      <div className="relative h-56 w-full bg-default/20">
        <iframe
          title="Localização do Cliente"
          src={osmEmbedUrl}
          className="h-full w-full border-0 pointer-events-auto"
          loading="lazy"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 bg-surface px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <LuMapPin className="size-3.5 text-accent shrink-0" />
          <span className="font-mono">
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
          {addressLabel ? (
            <span className="hidden sm:inline text-foreground/80 truncate max-w-[200px]">
              • {addressLabel}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            as="a"
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            variant="flat"
            className="h-7 text-xs font-medium"
          >
            <LuNavigation className="size-3.5 mr-1 text-accent" />
            Abrir no Maps
            <LuExternalLink className="size-3 ml-1 text-muted" />
          </Button>
        </div>
      </div>
    </div>
  );
};
