import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import { getDemandCountsRequest, type DemandCountsResponse } from '../api/demandas.api';
import { playNotificationChime } from '../lib/sound-alerts';

interface DemandCountsState {
  counts: DemandCountsResponse;
  isLoading: boolean;
  fetchCounts: (accessToken: string) => Promise<void>;
  setupRealtime: (accessToken: string) => () => void;
}

export const useDemandCountsStore = create<DemandCountsState>((set, get) => ({
  counts: { inbox: 0, queue: 0, claimed: 0, all: 0 },
  isLoading: false,
  fetchCounts: async (accessToken: string) => {
    try {
      const counts = await getDemandCountsRequest(accessToken);
      set({ counts });
    } catch {
      // Keep existing counts if request fails silently
    }
  },
  setupRealtime: (accessToken: string) => {
    get().fetchCounts(accessToken);

    let socket: Socket | null = null;
    try {
      socket = io('/realtime', {
        transports: ['websocket', 'polling'],
      });

      const handleInvalidated = (notify = false) => {
        void get().fetchCounts(accessToken);
        if (notify) {
          playNotificationChime();
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification('GigaHub — Atualização de Demanda', {
                body: 'Há novas demandas ou atualizações na sua fila.',
                icon: '/brand/giga-logo.png',
              });
            } catch {
              // Ignore notification errors
            }
          }
        }
      };

      socket.on('demand:invalidated', () => handleInvalidated(false));
      socket.on('demand.opened', () => handleInvalidated(true));
      socket.on('demand.claimed', () => handleInvalidated(false));
      socket.on('demand.assigned', () => handleInvalidated(true));
      socket.on('demand.transferred', () => handleInvalidated(true));
      socket.on('demand.resolved', () => handleInvalidated(false));
      socket.on('demand.closed', () => handleInvalidated(false));
      socket.on('demand.reopened', () => handleInvalidated(true));
    } catch {
      // Ignored if socket fails
    }

    return () => {
      socket?.disconnect();
    };
  },
}));
