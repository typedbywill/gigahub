import React from 'react';
import { LuClipboardList, LuMapPin, LuWrench } from 'react-icons/lu';
import { useThemeStore } from '../../shared/stores/theme.store';

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
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <aside className="relative hidden min-h-screen overflow-hidden border-l border-border/70 bg-zinc-50 dark:bg-[#0a0a0a] transition-colors duration-200 lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:px-12 lg:pb-12 lg:pt-16 xl:px-16">
      <div className="relative mx-auto flex w-full max-w-lg flex-1 items-center justify-center">
        <div
          aria-hidden
          className="login-orbit-spin-slow pointer-events-none absolute size-[min(72vw,28rem)] rounded-full border border-foreground/10"
        />
        <div
          aria-hidden
          className="login-orbit-spin pointer-events-none absolute size-[min(58vw,22rem)] rounded-full border border-dashed border-foreground/15"
        />
        <div
          aria-hidden
          className="login-orbit-spin-reverse pointer-events-none absolute size-[min(42vw,16rem)] rounded-full border border-foreground/10"
        />

        <img
          src={isDark ? '/brand/giga-logo-white.png' : '/brand/giga-logo.png'}
          alt=""
          className="relative z-10 size-28 object-contain xl:size-32"
        />

        {PILLS.map((pill) => {
          const Icon = pill.icon;
          return (
            <span
              key={pill.label}
              className={`login-float absolute z-20 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-xs backdrop-blur-sm dark:border-white/15 dark:bg-[#111]/90 dark:text-white/90 ${pill.className}`}
              style={{ animationDelay: pill.floatDelay }}
            >
              <Icon className="size-3.5 text-muted dark:text-white/70" aria-hidden />
              {pill.label}
            </span>
          );
        })}
      </div>

      <figure className="relative z-10 max-w-md">
        <blockquote className="font-display text-lg font-semibold leading-snug tracking-tight text-foreground xl:text-xl">
          "xxx”
        </blockquote>
        <figcaption className="mt-5 flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold text-foreground"
          >
            RS
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Rafael Souza</p>
            <p className="text-sm text-muted">xxx, GigaNet</p>
          </div>
        </figcaption>
      </figure>
    </aside>
  );
};
