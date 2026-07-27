import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;
const toasts: Toast[] = [];
const listeners: Array<() => void> = [];

export function showToast(type: ToastType, message: string, duration = 3000) {
  const id = ++toastId;
  toasts.push({ id, type, message });
  listeners.forEach((fn) => fn());
  setTimeout(() => {
    const index = toasts.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.splice(index, 1);
      listeners.forEach((fn) => fn());
    }
  }, duration);
}

export function ToastContainer() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  const iconMap = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgMap = {
    success: 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800',
  };

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[280px] max-w-[400px] animate-slide-in-right ${bgMap[t.type]}`}
        >
          {iconMap[t.type]}
          <span className="flex-1 text-sm text-slate-800 dark:text-slate-200">{t.message}</span>
          <button
            onClick={() => {
              const index = toasts.findIndex((toast) => toast.id === t.id);
              if (index > -1) {
                toasts.splice(index, 1);
                listeners.forEach((fn) => fn());
              }
            }}
            className="p-0.5 hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      ))}
    </div>
  );
}
