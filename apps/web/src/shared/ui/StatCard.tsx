import React from 'react';

export type StatCardColor =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'info'
  | 'security'
  | 'accent'
  | 'danger';

const COLOR_STYLES: Record<
  StatCardColor,
  {
    iconBg: string;
    iconText: string;
    border: string;
    accentGlow?: string;
  }
> = {
  neutral: {
    iconBg: 'bg-zinc-500/10 dark:bg-zinc-400/10',
    iconText: 'text-zinc-700 dark:text-zinc-300',
    border: 'border-border/80',
  },
  success: {
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20 hover:border-emerald-500/30',
  },
  warning: {
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20 hover:border-amber-500/30',
  },
  info: {
    iconBg: 'bg-sky-500/10',
    iconText: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/20 hover:border-sky-500/30',
  },
  security: {
    iconBg: 'bg-violet-500/10',
    iconText: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/20 hover:border-violet-500/30',
  },
  accent: {
    iconBg: 'bg-accent/10',
    iconText: 'text-accent',
    border: 'border-accent/20 hover:border-accent/30',
  },
  danger: {
    iconBg: 'bg-rose-500/10',
    iconText: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20 hover:border-rose-500/30',
  },
};

export type StatCardProps = {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  subtitle?: string;
  color?: StatCardColor;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  color = 'neutral',
  active = false,
  onClick,
  className,
}) => {
  const styles = COLOR_STYLES[color];
  const isClickable = Boolean(onClick);

  const content = (
    <div
      className={`relative flex items-center justify-between gap-4 rounded-2xl border bg-surface p-4 transition-all duration-150 ${
        styles.border
      } ${
        active
          ? 'ring-2 ring-foreground/20 shadow-sm'
          : 'shadow-xs'
      } ${isClickable ? 'cursor-pointer hover:bg-surface-secondary/50' : ''} ${
        className ?? ''
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xs font-medium text-muted tracking-tight">
          {title}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">
            {value}
          </span>
        </div>
        {subtitle ? (
          <span className="truncate text-xs text-muted/80">{subtitle}</span>
        ) : null}
      </div>

      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${styles.iconBg} ${styles.iconText}`}
        aria-hidden
      >
        {icon}
      </div>
    </div>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded-2xl"
      >
        {content}
      </button>
    );
  }

  return content;
};
