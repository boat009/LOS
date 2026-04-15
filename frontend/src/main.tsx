import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'Arial, sans-serif', fontSize: '14px' },
            success: { style: { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' } },
            error: { style: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
