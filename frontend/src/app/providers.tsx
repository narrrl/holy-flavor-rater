import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { ToastProvider } from '../contexts/ToastContext';
import { ConfirmProvider } from '../contexts/ConfirmContext';
import { queryClient } from './queryClient';
import '../i18n';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);
