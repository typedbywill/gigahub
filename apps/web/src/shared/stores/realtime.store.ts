import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface RealtimeState {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: unknown;
  connect: () => void;
  disconnect: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  socket: null,
  isConnected: false,
  lastMessage: null,
  connect: () => {
    if (get().socket) return;

    const socket = io('http://localhost:3000/realtime', {
      autoConnect: true,
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('pong', (data) => {
      set({ lastMessage: data });
    });

    set({ socket });
  },
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));
