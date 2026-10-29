'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../utils';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  durationMs?: number;
}

interface ToastContextType {
  toast: (message: Omit<ToastMessage, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, description, durationMs = 4000 }: Omit<ToastMessage, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastMessage = { id, type, title, description, durationMs };
      setToasts((prev) => [...prev, newToast]);

      if (durationMs > 0) {
        setTimeout(() => {
          dismiss(id);
        }, durationMs);
      }
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} message={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const ToastItem: React.FC<{ message: ToastMessage; onDismiss: () => void }> = ({
  message,
  onDismiss,
}) => {
  const isError = message.type === 'error';

  const typeConfig = {
    success: {
      icon: CheckCircle2,
      styles: 'bg-emerald-50 border-emerald-300 text-emerald-900',
      iconStyles: 'text-emerald-600',
    },
    warning: {
      icon: AlertTriangle,
      styles: 'bg-amber-50 border-amber-300 text-amber-900',
      iconStyles: 'text-amber-600',
    },
    // Distinct deep-crimson error token
    error: {
      icon: AlertCircle,
      styles: 'bg-error-light border-error-border text-error-dark',
      iconStyles: 'text-error',
    },
    info: {
      icon: Info,
      styles: 'bg-sky-50 border-sky-300 text-sky-900',
      iconStyles: 'text-sky-600',
    },
  };

  const { icon: Icon, styles, iconStyles } = typeConfig[message.type];

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all animate-in slide-in-from-bottom-2',
        styles,
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconStyles)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold">{message.title}</h4>
        {message.description && (
          <p className="text-xs opacity-90 mt-0.5">{message.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="rounded p-1 opacity-70 hover:opacity-100 min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center transition-opacity"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};
