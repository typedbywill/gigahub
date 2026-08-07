import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: 'usr_admin_01',
    name: 'GigaHub Admin',
    email: 'admin@gigahub.local',
    role: 'ADMIN',
  },
  isAuthenticated: true,
  token: 'stub-jwt-token-gigahub',
  login: (user, token) => set({ user, isAuthenticated: true, token }),
  logout: () => set({ user: null, isAuthenticated: false, token: null }),
}));
