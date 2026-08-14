import { create } from 'zustand';
import type { PublicUserDto } from '@gigahub/shared/contracts';
import {
  ApiClientError,
  loginRequest,
  renewTokenRequest,
} from '../api/auth.api';
import { useUsersStore } from './users.store';

interface AuthState {
  user: PublicUserDto | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  bootstrapped: boolean;
  isBootstrapping: boolean;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setSession: (user: PublicUserDto, accessToken: string) => void;
  patchCurrentUser: (patch: Partial<PublicUserDto>) => void;
  hasPermission: (permissionId: string) => boolean;
  hasAnyPermission: (...permissionIds: string[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  bootstrapped: false,
  isBootstrapping: false,
  setSession: (user, accessToken) =>
    set({
      user,
      accessToken,
      isAuthenticated: true,
    }),
  patchCurrentUser: (patch) =>
    set((state) =>
      state.user
        ? {
            user: { ...state.user, ...patch },
          }
        : state,
    ),
  logout: () => {
    useUsersStore.getState().reset();
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },
  hasPermission: (permissionId) => {
    const ids = get().user?.permissionIds ?? [];
    return ids.includes(permissionId);
  },
  hasAnyPermission: (...permissionIds) => {
    const ids = get().user?.permissionIds ?? [];
    return permissionIds.some((id) => ids.includes(id));
  },
  bootstrap: async () => {
    set({ isBootstrapping: true });
    try {
      const result = await renewTokenRequest();
      set({
        user: result.user,
        accessToken: result.accessToken,
        isAuthenticated: true,
        bootstrapped: true,
        isBootstrapping: false,
      });
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.status >= 500) {
        console.warn('Auth bootstrap failed', error);
      }
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        bootstrapped: true,
        isBootstrapping: false,
      });
    }
  },
  login: async (email, password) => {
    const result = await loginRequest({ email, password });
    set({
      user: result.user,
      accessToken: result.accessToken,
      isAuthenticated: true,
      bootstrapped: true,
    });
  },
}));
