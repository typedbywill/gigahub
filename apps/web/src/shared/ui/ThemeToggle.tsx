import { Button } from '@heroui/react';
import { LuMoon, LuSun } from 'react-icons/lu';
import { useThemeStore } from '../stores/theme.store';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <Button
      isIconOnly
      size="sm"
      variant="ghost"
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className={className}
      onPress={toggleTheme}
    >
      {isDark ? <LuSun className="size-4" /> : <LuMoon className="size-4" />}
    </Button>
  );
}
