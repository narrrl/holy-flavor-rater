import { createContext } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions | string) => Promise<boolean>;
}

export const ConfirmContext = createContext<ConfirmContextValue | null>(null);
