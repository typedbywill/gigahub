import React from 'react';

export type StatusBadgeVariant =
  | 'active'
  | 'inactive'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'erp'
  | 'security'
  | 'accent'
  | 'neutral';

const BADGE_STYLES: Record<
  StatusBadgeVariant,
  {
    chipColor: 'success' | 'danger' | 'warning' | 'primary' | 'accent' | 'default';
    className: string;
    dotColor?: string;
  }
> = {
  active: {
    chipColor: 'success',
    className:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium',
    dotColor: 'bg-emerald-500',
  },
  success: {
    chipColor: 'success',
    className:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium',
    dotColor: 'bg-emerald-500',
  },
  danger: {
    chipColor: 'danger',
    className:
      'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-medium',
    dotColor: 'bg-rose-500',
  },
  inactive: {
    chipColor: 'default',
    className:
      'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border border-zinc-500/20 font-medium',
    dotColor: 'bg-zinc-400',
  },
  warning: {
    chipColor: 'warning',
    className:
      'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-medium',
    dotColor: 'bg-amber-500',
  },
  info: {
    chipColor: 'primary',
    className:
      'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 font-medium',
    dotColor: 'bg-sky-500',
  },
  erp: {
    chipColor: 'primary',
    className:
      'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 font-medium',
    dotColor: 'bg-sky-500',
  },
  security: {
    chipColor: 'accent',
    className:
      'bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 font-medium',
    dotColor: 'bg-violet-500',
  },
  accent: {
    chipColor: 'accent',
    className:
      'bg-accent/10 text-accent border border-accent/20 font-medium',
    dotColor: 'bg-accent',
  },
  neutral: {
    chipColor: 'default',
    className:
      'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 font-medium',
    dotColor: 'bg-zinc-400',
  },
};

export type StatusBadgeProps = {
  variant?: StatusBadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant = 'neutral',
  children,
  icon,
  showDot = false,
  size = 'sm',
  className,
}) => {
  const config = BADGE_STYLES[variant] ?? BADGE_STYLES.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs transition-colors ${
        config.className
      } ${className ?? ''}`}
    >
      {showDot && config.dotColor ? (
        <span
          className={`size-1.5 shrink-0 rounded-full ${config.dotColor}`}
          aria-hidden
        />
      ) : null}
      {icon ? <span className="shrink-0 [&_svg]:size-3">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
};
