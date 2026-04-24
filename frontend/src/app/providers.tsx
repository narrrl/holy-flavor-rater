import type { ReactNode } from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { ToastProvider } from '../contexts/ToastContext';
import { ConfirmProvider } from '../contexts/ConfirmContext';
import '../i18n';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <AuthProvider>
      <NotificationProvider>
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </NotificationProvider>
    </AuthProvider>
  </ThemeProvider>
);
