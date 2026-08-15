import React from 'react';

export type UserLocationDotProps = {
  accuracy?: number;
  heading?: number | null;
};

export const UserLocationDot: React.FC<UserLocationDotProps> = () => {
  return (
    <div
      className="relative flex items-center justify-center pointer-events-none select-none"
      aria-label="Sua localização atual"
    >
      {/* Outer pulsing animated beacon */}
      <span className="absolute -inset-2 rounded-full bg-blue-500/30 animate-ping opacity-75" />
      <span className="absolute -inset-1 rounded-full bg-blue-500/20" />
      
      {/* Crisp white halo and vivid Google Maps blue center */}
      <span className="relative flex size-4 items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-md ring-1 ring-blue-700/40 dark:border-slate-900">
        <span className="size-1.5 rounded-full bg-white/90" />
      </span>
    </div>
  );
};
