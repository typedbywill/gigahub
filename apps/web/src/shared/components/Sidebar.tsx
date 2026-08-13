import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Button, Chip } from '@heroui/react';
import {
  LuChevronDown,
  LuChevronRight,
  LuPanelLeftClose,
  LuX,
} from 'react-icons/lu';
import { useSidebarStore } from '../stores/sidebar.store';

export type SidebarNavItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onPress?: () => void;
  highlighted?: boolean;
  badge?: number | string;
  children?: SidebarNavItem[];
};

export type SidebarProps = {
  topItems?: SidebarNavItem[];
  bottomItems?: SidebarNavItem[];
  footer?: React.ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  onCloseMobile?: () => void;
  showMobileClose?: boolean;
  className?: string;
};

function itemClassName(
  active: boolean,
  highlighted: boolean | undefined,
  collapsed: boolean,
): string {
  const base = collapsed
    ? 'relative flex w-full items-center justify-center rounded-lg p-2.5 text-sm transition'
    : 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition';
  if (active || highlighted) {
    return `${base} bg-accent/10 font-medium text-accent`;
  }
  return `${base} text-muted hover:bg-default hover:text-foreground`;
}

function NavBadge({
  badge,
  collapsed,
}: {
  badge: number | string;
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
        {badge}
      </span>
    );
  }
  return (
    <Chip size="sm" color="danger" variant="primary" className="ml-auto shrink-0">
      {badge}
    </Chip>
  );
}

function ItemContent({
  item,
  showChevron,
  expanded,
  collapsed,
}: {
  item: SidebarNavItem;
  showChevron?: boolean;
  expanded?: boolean;
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <>
        {item.icon ? (
          <span className="shrink-0 text-current [&_svg]:size-4">{item.icon}</span>
        ) : (
          <span className="text-xs font-semibold">{item.label.charAt(0)}</span>
        )}
        {item.badge != null ? <NavBadge badge={item.badge} collapsed /> : null}
      </>
    );
  }

  return (
    <>
      {item.icon ? <span className="shrink-0 text-current [&_svg]:size-4">{item.icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge != null ? <NavBadge badge={item.badge} /> : null}
      {showChevron ? (
        <LuChevronDown
          className={`size-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      ) : null}
    </>
  );
}

function SidebarLeaf({
  item,
  nested,
  collapsed,
  onNavigate,
}: {
  item: SidebarNavItem;
  nested?: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pad = nested && !collapsed ? 'pl-9' : '';

  if (item.href) {
    return (
      <NavLink
        to={item.href}
        title={collapsed ? item.label : undefined}
        aria-label={collapsed ? item.label : undefined}
        onClick={onNavigate}
        className={({ isActive }) =>
          `${itemClassName(isActive, item.highlighted, collapsed)} ${pad}`
        }
      >
        <ItemContent item={item} collapsed={collapsed} />
      </NavLink>
    );
  }

  return (
    <button
      type="button"
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={`${itemClassName(false, item.highlighted, collapsed)} ${pad}`}
      onClick={item.onPress}
    >
      <ItemContent item={item} collapsed={collapsed} />
    </button>
  );
}

function SidebarGroup({
  item,
  collapsed,
  onNavigate,
  onExpandSidebar,
}: {
  item: SidebarNavItem;
  collapsed: boolean;
  onNavigate?: () => void;
  onExpandSidebar?: () => void;
}) {
  const expanded = useSidebarStore((s) => s.expandedGroupIds.has(item.id));
  const toggleGroup = useSidebarStore((s) => s.toggleGroup);
  const children = item.children ?? [];

  if (collapsed) {
    return (
      <button
        type="button"
        title={item.label}
        aria-label={item.label}
        className={itemClassName(false, item.highlighted, true)}
        onClick={() => {
          onExpandSidebar?.();
          item.onPress?.();
        }}
      >
        <ItemContent item={item} collapsed />
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={itemClassName(false, item.highlighted, false)}
        aria-expanded={expanded}
        onClick={() => {
          toggleGroup(item.id);
          item.onPress?.();
        }}
      >
        <ItemContent item={item} showChevron expanded={expanded} />
      </button>
      <div
        className={`sidebar-collapse grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-0.5 flex flex-col gap-0.5">
            {children.map((child) => (
              <SidebarItem
                key={child.id}
                item={child}
                nested
                collapsed={false}
                onNavigate={onNavigate}
                onExpandSidebar={onExpandSidebar}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  item,
  nested,
  collapsed,
  onNavigate,
  onExpandSidebar,
}: {
  item: SidebarNavItem;
  nested?: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  onExpandSidebar?: () => void;
}) {
  if (item.children && item.children.length > 0) {
    return (
      <SidebarGroup
        item={item}
        collapsed={collapsed}
        onNavigate={onNavigate}
        onExpandSidebar={onExpandSidebar}
      />
    );
  }
  return (
    <SidebarLeaf
      item={item}
      nested={nested}
      collapsed={collapsed}
      onNavigate={onNavigate}
    />
  );
}

function SidebarNavList({
  items,
  collapsed,
  onNavigate,
  onExpandSidebar,
}: {
  items: SidebarNavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
  onExpandSidebar?: () => void;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => (
        <SidebarItem
          key={item.id}
          item={item}
          collapsed={collapsed}
          onNavigate={onNavigate}
          onExpandSidebar={onExpandSidebar}
        />
      ))}
    </nav>
  );
}

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      to="/"
      title="GigaHub"
      className={`font-display flex items-center gap-2 py-1 text-lg font-bold tracking-tight text-accent ${
        collapsed ? 'justify-center px-0' : 'px-2'
      }`}
    >
      <img
        src="/brand/giga-logo.png"
        alt=""
        className="size-8 shrink-0 object-contain"
      />
      {!collapsed ? <span>GigaHub</span> : null}
    </Link>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({
  topItems = [],
  bottomItems = [],
  footer,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  onCloseMobile,
  showMobileClose = false,
  className,
}) => {
  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out ${
        collapsed ? 'w-16' : 'w-60'
      } ${className ?? ''}`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-3">
        <div
          className={`flex items-center gap-1 ${collapsed ? 'flex-col' : 'justify-between'}`}
        >
          <SidebarBrand collapsed={collapsed} />
          <div className={`flex items-center gap-1 ${collapsed ? 'flex-col' : ''}`}>
            {showMobileClose && onCloseMobile ? (
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Fechar menu"
                className="md:hidden"
                onPress={onCloseMobile}
              >
                <LuX className="size-4" />
              </Button>
            ) : null}
            {onToggleCollapse ? (
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
                className="hidden md:inline-flex"
                onPress={onToggleCollapse}
              >
                {collapsed ? (
                  <LuChevronRight className="size-4" />
                ) : (
                  <LuPanelLeftClose className="size-4" />
                )}
              </Button>
            ) : null}
          </div>
        </div>

        <SidebarNavList
          items={topItems}
          collapsed={collapsed}
          onNavigate={onNavigate}
          onExpandSidebar={collapsed ? onToggleCollapse : undefined}
        />

        <div className="mt-auto flex flex-col gap-3">
          <SidebarNavList
            items={bottomItems}
            collapsed={collapsed}
            onNavigate={onNavigate}
            onExpandSidebar={collapsed ? onToggleCollapse : undefined}
          />
          {footer ? (
            <div className={`border-t border-border pt-3 ${collapsed ? 'px-0' : ''}`}>
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
};
