import { createContext } from 'react';
import type { AlertColor } from '@mui/material/Alert';

export interface ToastOptions {
  message: string;
  severity?: AlertColor;
  duration?: number;
}

export interface ToastContextValue {
  notify: (opts: ToastOptions | string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
