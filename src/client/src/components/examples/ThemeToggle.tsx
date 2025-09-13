import { ThemeToggle } from '../ThemeToggle.tsx';
import { ThemeProvider } from '../ThemeProvider.tsx';

export default function ThemeToggleExample() {
  return (
    <ThemeProvider>
      <div className="flex items-center gap-4 p-4">
        <span>Toggle between light and dark mode:</span>
        <ThemeToggle />
      </div>
    </ThemeProvider>
  );
}
