// React import not needed in modern React
import { Route, Switch } from 'wouter';
import { queryClient } from './lib/queryClient.js';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster.js';
import { TooltipProvider } from './components/ui/tooltip.js';
import { ThemeProvider } from './components/ThemeProvider.js';
import { MainDashboard } from './components/MainDashboard.js';
import NotFound from './pages/not-found.js';

function Router() {
  return (
    <Switch>
      <Route path="/" component={MainDashboard} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="remote-job-scout-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
