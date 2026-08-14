export type AvatarColorTheme = {
  bg: string;
  text: string;
  ring: string;
  dot: string;
};

const PALETTES: readonly AvatarColorTheme[] = [
  {
    bg: 'bg-sky-500/15',
    text: 'text-sky-700 dark:text-sky-300',
    ring: 'ring-sky-500/25',
    dot: 'bg-sky-500',
  },
  {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-500/25',
    dot: 'bg-emerald-500',
  },
  {
    bg: 'bg-violet-500/15',
    text: 'text-violet-700 dark:text-violet-300',
    ring: 'ring-violet-500/25',
    dot: 'bg-violet-500',
  },
  {
    bg: 'bg-amber-500/15',
    text: 'text-amber-800 dark:text-amber-300',
    ring: 'ring-amber-500/25',
    dot: 'bg-amber-500',
  },
  {
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-700 dark:text-indigo-300',
    ring: 'ring-indigo-500/25',
    dot: 'bg-indigo-500',
  },
  {
    bg: 'bg-teal-500/15',
    text: 'text-teal-700 dark:text-teal-300',
    ring: 'ring-teal-500/25',
    dot: 'bg-teal-500',
  },
  {
    bg: 'bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    ring: 'ring-rose-500/25',
    dot: 'bg-rose-500',
  },
  {
    bg: 'bg-purple-500/15',
    text: 'text-purple-700 dark:text-purple-300',
    ring: 'ring-purple-500/25',
    dot: 'bg-purple-500',
  },
];

export function getAvatarColor(identifier: string | null | undefined): AvatarColorTheme {
  const fallback = PALETTES[0] ?? {
    bg: 'bg-sky-500/15',
    text: 'text-sky-700 dark:text-sky-300',
    ring: 'ring-sky-500/25',
    dot: 'bg-sky-500',
  };
  if (!identifier) {
    return fallback;
  }
  let hash = 0;
  for (let i = 0; i < identifier.length; i += 1) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTES.length;
  return PALETTES[index] ?? fallback;
}
