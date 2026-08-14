import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import { getDemandCountsRequest, type DemandCountsResponse } from '../api/demandas.api';

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

      const handleInvalidated = () => {
        void get().fetchCounts(accessToken);
      };

      socket.on('demand:invalidated', handleInvalidated);
      socket.on('demand.opened', handleInvalidated);
      socket.on('demand.claimed', handleInvalidated);
      socket.on('demand.assigned', handleInvalidated);
      socket.on('demand.transferred', handleInvalidated);
      socket.on('demand.resolved', handleInvalidated);
      socket.on('demand.closed', handleInvalidated);
      socket.on('demand.reopened', handleInvalidated);
    } catch {
      // Ignored if socket fails
    }

    return () => {
      socket?.disconnect();
    };
  },
}));
