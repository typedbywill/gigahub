import { create } from 'zustand';

const STORAGE_KEY = 'gigahub-sidebar';

type SidebarPersisted = {
  expandedGroupIds: string[];
};

function readPersisted(): SidebarPersisted {
  if (typeof window === 'undefined') {
    return { expandedGroupIds: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { expandedGroupIds: [] };
    }
    const parsed = JSON.parse(raw) as Partial<SidebarPersisted>;
    return {
      expandedGroupIds: Array.isArray(parsed.expandedGroupIds)
        ? parsed.expandedGroupIds.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    return { expandedGroupIds: [] };
  }
}

function persist(expandedGroupIds: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ expandedGroupIds } satisfies SidebarPersisted),
  );
}

interface SidebarState {
  /** Group ids the user opened. Absent ids stay collapsed by default. */
  expandedGroupIds: ReadonlySet<string>;
  hydrated: boolean;
  hydrate: () => void;
  isGroupExpanded: (id: string) => boolean;
  setGroupExpanded: (id: string, expanded: boolean) => void;
  toggleGroup: (id: string) => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  expandedGroupIds: new Set(),
  hydrated: false,
  hydrate: () => {
    const { expandedGroupIds } = readPersisted();
    set({ expandedGroupIds: new Set(expandedGroupIds), hydrated: true });
  },
  isGroupExpanded: (id) => get().expandedGroupIds.has(id),
  setGroupExpanded: (id, expanded) => {
    const next = new Set(get().expandedGroupIds);
    if (expanded) {
      next.add(id);
    } else {
      next.delete(id);
    }
    persist([...next]);
    set({ expandedGroupIds: next });
  },
  toggleGroup: (id) => {
    get().setGroupExpanded(id, !get().isGroupExpanded(id));
  },
}));
