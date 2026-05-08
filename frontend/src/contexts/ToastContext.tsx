import { createContext, useCallback, useState, type ReactNode } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert, { type AlertColor } from '@mui/material/Alert';

export interface ToastOptions {
  message: string;
  severity?: AlertColor;
  duration?: number;
}

export interface ToastContextValue {
  notify: (opts: ToastOptions | string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastState extends ToastOptions {
  key: number;
}

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ToastState | null>(null);

  const notify = useCallback((opts: ToastOptions | string) => {
    const normalized: ToastOptions =
      typeof opts === 'string' ? { message: opts, severity: 'info' } : opts;
    setToast({
      message: normalized.message,
      severity: normalized.severity ?? 'info',
      duration: normalized.duration ?? 4000,
      key: Date.now(),
    });
  }, []);

  const handleClose = (_: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setToast(null);
  };

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <Snackbar
        key={toast?.key}
        open={!!toast}
        autoHideDuration={toast?.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert
            onClose={() => setToast(null)}
            severity={toast.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  );
};
