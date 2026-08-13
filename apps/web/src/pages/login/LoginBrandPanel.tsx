import React from 'react';
import { LuClipboardList, LuMapPin, LuWrench } from 'react-icons/lu';

const PILLS = [
  {
    label: 'Suas OS do dia',
    icon: LuClipboardList,
    className: 'top-[18%] right-[8%]',
    floatDelay: '0s',
  },
  {
    label: 'Rotas no mapa',
    icon: LuMapPin,
    className: 'top-[48%] right-[2%]',
    floatDelay: '0.9s',
  },
  {
    label: 'Ferramentas do campo',
    icon: LuWrench,
    className: 'bottom-[28%] left-[6%]',
    floatDelay: '1.7s',
  },
] as const;

export const LoginBrandPanel: React.FC = () => {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden border-l border-white/5 bg-[#0a0a0a] lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:px-12 lg:pb-12 lg:pt-16 xl:px-16">
      <div className="relative mx-auto flex w-full max-w-lg flex-1 items-center justify-center">
        <div
          aria-hidden
          className="login-orbit-spin-slow pointer-events-none absolute size-[min(72vw,28rem)] rounded-full border border-white/10"
        />
        <div
          aria-hidden
          className="login-orbit-spin pointer-events-none absolute size-[min(58vw,22rem)] rounded-full border border-dashed border-white/15"
        />
        <div
          aria-hidden
          className="login-orbit-spin-reverse pointer-events-none absolute size-[min(42vw,16rem)] rounded-full border border-white/10"
        />

        <img
          src="/brand/giga-logo-white.png"
          alt=""
          className="relative z-10 size-28 object-contain xl:size-32"
        />

        {PILLS.map((pill) => {
          const Icon = pill.icon;
          return (
            <span
              key={pill.label}
              className={`login-float absolute z-20 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#111]/90 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm ${pill.className}`}
              style={{ animationDelay: pill.floatDelay }}
            >
              <Icon className="size-3.5 text-white/70" aria-hidden />
              {pill.label}
            </span>
          );
        })}
      </div>

      <figure className="relative z-10 max-w-md">
        <blockquote className="font-display text-lg font-semibold leading-snug tracking-tight text-white xl:text-xl">
          "xxx”
        </blockquote>
        <figcaption className="mt-5 flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white"
          >
            RS
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Rafael Souza</p>
            <p className="text-sm text-white/50">xxx, GigaNet</p>
          </div>
        </figcaption>
      </figure>
    </aside>
  );
};
