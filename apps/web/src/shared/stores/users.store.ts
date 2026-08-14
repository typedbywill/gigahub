import { create } from 'zustand';
import type { UserListItemDto } from '@gigahub/shared/contracts';
import { listUsersRequest } from '../api/users.api';

interface UsersState {
  users: UserListItemDto[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  fetchUsers: (
    accessToken: string,
    forceRefresh?: boolean,
  ) => Promise<UserListItemDto[]>;
  getUserById: (id: string) => UserListItemDto | undefined;
  reset: () => void;
}

let fetchPromise: Promise<UserListItemDto[]> | null = null;

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  reset: () => {
    fetchPromise = null;
    set({
      users: [],
      isLoading: false,
      isLoaded: false,
      error: null,
    });
  },

  getUserById: (id: string) => {
    return get().users.find((u) => u.id === id);
  },

  fetchUsers: async (accessToken: string, forceRefresh = false) => {
    const { isLoaded, isLoading, users } = get();

    if (isLoaded && !forceRefresh) {
      return users;
    }

    if (isLoading && fetchPromise) {
      return fetchPromise;
    }

    set({ isLoading: true, error: null });

    fetchPromise = (async () => {
      try {
        let currentPage = 1;
        const pageSize = 500;
        let allUsers: UserListItemDto[] = [];
        let totalItems = 0;

        do {
          const res = await listUsersRequest(accessToken, {
            status: 'active',
            page: currentPage,
            pageSize,
          });

          allUsers = allUsers.concat(res.items);
          totalItems = res.total;
          currentPage += 1;
        } while (
          allUsers.length < totalItems &&
          currentPage <= Math.ceil(totalItems / pageSize)
        );

        // Deduplicate and sort by name
        const uniqueMap = new Map<string, UserListItemDto>();
        for (const u of allUsers) {
          uniqueMap.set(u.id, u);
        }
        const sorted = Array.from(uniqueMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
        );

        set({
          users: sorted,
          isLoading: false,
          isLoaded: true,
          error: null,
        });

        return sorted;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Erro ao carregar colaboradores';
        set({
          isLoading: false,
          error: msg,
        });
        throw err;
      } finally {
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  },
}));
