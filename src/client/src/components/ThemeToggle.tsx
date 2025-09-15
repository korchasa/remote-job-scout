/**
 * ThemeToggle Component
 *
 * Responsibility: Provides theme switching functionality with cycling through light/dark/system themes
 * Relationships: Uses ThemeProvider context, integrated into MainDashboard header
 * Features: Cycles through light → dark → system → light, localStorage persistence, accessibility labels
 */

import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from './ui/button.tsx';
import { useTheme } from './ThemeProvider.tsx';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // Cycle through themes: light → dark → system → light
  // Provides complete theme control including system preference following
  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  };

  const getAriaLabel = () => {
    switch (theme) {
      case 'light':
        return 'Switch to dark theme';
      case 'dark':
        return 'Switch to system theme';
      case 'system':
        return 'Switch to light theme';
      default:
        return 'Toggle theme';
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      data-testid="button-theme-toggle"
      aria-label={getAriaLabel()}
    >
      {getIcon()}
    </Button>
  );
}
