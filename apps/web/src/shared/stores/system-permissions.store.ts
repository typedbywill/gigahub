import { create } from 'zustand';
import { unlockAudio } from '../lib/sound-alerts';

export type PermissionKey =
  | 'geolocation'
  | 'notifications'
  | 'audio'
  | 'storage'
  | 'clipboard'
  | 'camera';

export type PermissionStatus = 'granted' | 'prompt' | 'denied' | 'unsupported';

export interface PermissionDetail {
  key: PermissionKey;
  name: string;
  category: string;
  description: string;
  status: PermissionStatus;
  isOptional?: boolean;
}

const PROMPT_SESSION_KEY = 'gigahub_permissions_prompted_v1';
const PROMPT_LOGIN_FLAG = 'gigahub_prompt_on_next_auth';

interface SystemPermissionsState {
  isOpen: boolean;
  isChecking: boolean;
  isRequestingAll: boolean;
  permissions: Record<PermissionKey, PermissionDetail>;
  openModal: () => void;
  closeModal: () => void;
  checkAllPermissions: () => Promise<void>;
  requestPermission: (key: PermissionKey) => Promise<boolean>;
  requestAllPermissions: () => Promise<void>;
  setPromptOnNextAuth: () => void;
  triggerAuthCheck: () => void;
}

const INITIAL_PERMISSIONS: Record<PermissionKey, PermissionDetail> = {
  geolocation: {
    key: 'geolocation',
    name: 'Localização em Tempo Real',
    category: 'Operacional e Campo',
    description:
      'Exibe sua posição em mapas de rede/projetos, centraliza visualização técnica e agiliza check-in em ordens de serviço.',
    status: 'prompt',
  },
  notifications: {
    key: 'notifications',
    name: 'Notificações do Sistema',
    category: 'HelpDesk e Atendimento',
    description:
      'Receba alertas em segundo plano quando novos chamados chegarem à fila, forem transferidos ou atingirem limite de SLA.',
    status: 'prompt',
  },
  audio: {
    key: 'audio',
    name: 'Sons e Alertas Sonoros',
    category: 'Monitoramento',
    description:
      'Habilita toques e bips instantâneos ao receber ocorrências críticas sem bloqueio de autoplay do navegador.',
    status: 'prompt',
  },
  storage: {
    key: 'storage',
    name: 'Armazenamento Persistente',
    category: 'Desempenho e Offline',
    description:
      'Evita que o navegador apague caches de mapas, preferências e rascunhos de formulários durante limpezas de memória.',
    status: 'prompt',
  },
  clipboard: {
    key: 'clipboard',
    name: 'Área de Transferência Rápida',
    category: 'Produtividade',
    description:
      'Permite copiar com 1 clique endereços IP, coordenadas de caixas de emenda (CTOs) e códigos de clientes.',
    status: 'prompt',
  },
  camera: {
    key: 'camera',
    name: 'Câmera para Vistorias e Fotos',
    category: 'Suporte Técnico',
    description:
      'Permite registrar fotos de instalações, identificação de portas em CTOs e comprovantes de atendimento.',
    status: 'prompt',
    isOptional: true,
  },
};

export const useSystemPermissionsStore = create<SystemPermissionsState>((set, get) => ({
  isOpen: false,
  isChecking: false,
  isRequestingAll: false,
  permissions: INITIAL_PERMISSIONS,

  openModal: () => {
    set({ isOpen: true });
    void get().checkAllPermissions();
  },

  closeModal: () => {
    try {
      sessionStorage.setItem(PROMPT_SESSION_KEY, 'true');
      sessionStorage.removeItem(PROMPT_LOGIN_FLAG);
    } catch {
      // Ignored in restrictive storage
    }
    set({ isOpen: false });
  },

  setPromptOnNextAuth: () => {
    try {
      sessionStorage.setItem(PROMPT_LOGIN_FLAG, 'true');
    } catch {
      // Ignored
    }
  },

  triggerAuthCheck: () => {
    const hasLoginFlag = typeof window !== 'undefined' && sessionStorage.getItem(PROMPT_LOGIN_FLAG) === 'true';
    const hasPrompted = typeof window !== 'undefined' && sessionStorage.getItem(PROMPT_SESSION_KEY) === 'true';

    void get().checkAllPermissions().then(() => {
      const current = get().permissions;
      const hasPendingEssential =
        current.geolocation.status === 'prompt' ||
        current.notifications.status === 'prompt' ||
        current.audio.status === 'prompt';

      // Always open on explicit login flag or if never prompted in this session and has pending permissions
      if (hasLoginFlag || (!hasPrompted && hasPendingEssential)) {
        set({ isOpen: true });
      }
    });
  },

  checkAllPermissions: async () => {
    if (typeof window === 'undefined') return;
    set({ isChecking: true });

    const updated = { ...get().permissions };

    // 1. Geolocation
    if (!('geolocation' in navigator)) {
      updated.geolocation = { ...updated.geolocation, status: 'unsupported' };
    } else if (navigator.permissions?.query) {
      try {
        const query = await navigator.permissions.query({ name: 'geolocation' });
        updated.geolocation = {
          ...updated.geolocation,
          status: query.state === 'prompt' ? 'prompt' : query.state,
        };
      } catch {
        // Leave as prompt
      }
    }

    // 2. Notifications
    if (!('Notification' in window)) {
      updated.notifications = { ...updated.notifications, status: 'unsupported' };
    } else {
      const state = Notification.permission;
      updated.notifications = {
        ...updated.notifications,
        status: state === 'default' ? 'prompt' : state,
      };
    }

    // 3. Audio
    // If user has interacted / audioContext is running or stored
    const isAudioUnlocked = sessionStorage.getItem('gigahub_audio_unlocked') === 'true';
    updated.audio = {
      ...updated.audio,
      status: isAudioUnlocked ? 'granted' : 'prompt',
    };

    // 4. Storage Persistence
    if (navigator.storage?.persisted) {
      try {
        const isPersisted = await navigator.storage.persisted();
        updated.storage = {
          ...updated.storage,
          status: isPersisted ? 'granted' : 'prompt',
        };
      } catch {
        updated.storage = { ...updated.storage, status: 'unsupported' };
      }
    } else {
      updated.storage = { ...updated.storage, status: 'unsupported' };
    }

    // 5. Clipboard
    if (navigator.clipboard) {
      if (navigator.permissions?.query) {
        try {
          const query = await navigator.permissions.query({
            name: 'clipboard-write' as PermissionName,
          });
          updated.clipboard = {
            ...updated.clipboard,
            status: query.state === 'prompt' ? 'prompt' : query.state,
          };
        } catch {
          // If query is unsupported, clipboard API itself is available
          updated.clipboard = { ...updated.clipboard, status: 'granted' };
        }
      } else {
        updated.clipboard = { ...updated.clipboard, status: 'granted' };
      }
    } else {
      updated.clipboard = { ...updated.clipboard, status: 'unsupported' };
    }

    // 6. Camera
    if (!navigator.mediaDevices?.getUserMedia) {
      updated.camera = { ...updated.camera, status: 'unsupported' };
    } else if (navigator.permissions?.query) {
      try {
        const query = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });
        updated.camera = {
          ...updated.camera,
          status: query.state === 'prompt' ? 'prompt' : query.state,
        };
      } catch {
        // Leave as prompt
      }
    }

    set({ permissions: updated, isChecking: false });
  },

  requestPermission: async (key: PermissionKey): Promise<boolean> => {
    const perm = get().permissions[key];
    if (perm.status === 'unsupported' || perm.status === 'granted') {
      return perm.status === 'granted';
    }

    let success = false;

    try {
      switch (key) {
        case 'geolocation':
          if ('geolocation' in navigator) {
            await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                enableHighAccuracy: true,
              });
            });
            success = true;
          }
          break;

        case 'notifications':
          if ('Notification' in window) {
            const res = await Notification.requestPermission();
            success = res === 'granted';
          }
          break;

        case 'audio': {
          const unlocked = await unlockAudio();
          if (unlocked) {
            sessionStorage.setItem('gigahub_audio_unlocked', 'true');
            success = true;
          }
          break;
        }

        case 'storage':
          if (navigator.storage?.persist) {
            const persisted = await navigator.storage.persist();
            success = persisted;
          }
          break;

        case 'clipboard':
          if (navigator.clipboard) {
            // Validate clipboard access
            await navigator.clipboard.writeText('');
            success = true;
          }
          break;

        case 'camera':
          if (navigator.mediaDevices?.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach((track) => track.stop());
            success = true;
          }
          break;
      }
    } catch {
      success = false;
    }

    await get().checkAllPermissions();
    return success;
  },

  requestAllPermissions: async () => {
    set({ isRequestingAll: true });

    // Request in user-friendly order
    const order: PermissionKey[] = [
      'audio',
      'notifications',
      'geolocation',
      'storage',
      'clipboard',
      'camera',
    ];

    for (const key of order) {
      const current = get().permissions[key];
      if (current && current.status === 'prompt') {
        try {
          await get().requestPermission(key);
        } catch {
          // Continue to next permission even if one is cancelled or denied
        }
      }
    }

    set({ isRequestingAll: false });
    await get().checkAllPermissions();
  },
}));
