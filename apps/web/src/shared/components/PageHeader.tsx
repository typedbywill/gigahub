import React from 'react';

export interface PageHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  description,
  badge,
  actions,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon ? (
          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 shrink-0 text-accent flex items-center justify-center">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {badge}
          </div>
          {description ? (
            <p className="text-xs md:text-sm text-muted line-clamp-2 sm:line-clamp-none">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {actions ? (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
        </div>
      ) : null}
    </div>
  );
};

export interface PageContainerProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  maxWidth?: 'max-w-7xl' | 'max-w-6xl' | 'max-w-5xl' | 'max-w-4xl' | 'max-w-full';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  header,
  className = '',
  maxWidth = 'max-w-7xl',
}) => {
  return (
    <div
      className={`p-4 md:p-6 flex flex-col gap-4 ${maxWidth} mx-auto w-full ${className}`}
    >
      {header}
      {children}
    </div>
  );
};
