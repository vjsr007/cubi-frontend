import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import SplashScreen from './components/arcade/SplashScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function App() {
  const [booted, setBooted] = useState(false);
  return (
    <QueryClientProvider client={queryClient}>
      {!booted && <SplashScreen onDone={() => setBooted(true)} />}
      <AppShell />
    </QueryClientProvider>
  );
}

export default App;
