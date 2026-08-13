import { create } from 'zustand';

const STORAGE_KEY = 'gigahub-sidebar';

type SidebarPersisted = {
  collapsed: boolean;
  expandedGroupIds: string[];
};

function readPersisted(): SidebarPersisted {
  if (typeof window === 'undefined') {
    return { collapsed: false, expandedGroupIds: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { collapsed: false, expandedGroupIds: [] };
    }
    const parsed = JSON.parse(raw) as Partial<SidebarPersisted>;
    return {
      collapsed: parsed.collapsed === true,
      expandedGroupIds: Array.isArray(parsed.expandedGroupIds)
        ? parsed.expandedGroupIds.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    return { collapsed: false, expandedGroupIds: [] };
  }
}

function persist(state: SidebarPersisted): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state satisfies SidebarPersisted));
}

interface SidebarState {
  /** Desktop rail collapsed. Mobile drawer ignores this. */
  collapsed: boolean;
  /** Group ids the user opened. Absent ids stay collapsed by default. */
  expandedGroupIds: ReadonlySet<string>;
  hydrated: boolean;
  hydrate: () => void;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  isGroupExpanded: (id: string) => boolean;
  setGroupExpanded: (id: string, expanded: boolean) => void;
  toggleGroup: (id: string) => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: false,
  expandedGroupIds: new Set(),
  hydrated: false,
  hydrate: () => {
    const { collapsed, expandedGroupIds } = readPersisted();
    set({ collapsed, expandedGroupIds: new Set(expandedGroupIds), hydrated: true });
  },
  setCollapsed: (collapsed) => {
    const { expandedGroupIds } = get();
    persist({ collapsed, expandedGroupIds: [...expandedGroupIds] });
    set({ collapsed });
  },
  toggleCollapsed: () => {
    get().setCollapsed(!get().collapsed);
  },
  isGroupExpanded: (id) => get().expandedGroupIds.has(id),
  setGroupExpanded: (id, expanded) => {
    const next = new Set(get().expandedGroupIds);
    if (expanded) {
      next.add(id);
    } else {
      next.delete(id);
    }
    persist({ collapsed: get().collapsed, expandedGroupIds: [...next] });
    set({ expandedGroupIds: next });
  },
  toggleGroup: (id) => {
    get().setGroupExpanded(id, !get().isGroupExpanded(id));
  },
}));
