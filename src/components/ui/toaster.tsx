"use client";

import { useState, createContext, useContext, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

interface Toast {
  id: string;
  title: string;
  description?: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success" />,
    error: <AlertCircle className="w-5 h-5 text-danger" />,
    info: <Info className="w-5 h-5 text-accent-purple" />,
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      <div className="fixed top-4 right-4 left-4 z-[100] flex flex-col gap-2 max-w-sm mx-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="holy-card flex items-start gap-3 animate-slide-up shadow-purple-sm"
          >
            {icons[t.type]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {t.title}
              </p>
              {t.description && (
                <p className="text-xs text-text-muted mt-0.5">{t.description}</p>
              )}
            </div>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((toast) => toast.id !== t.id))
              }
              className="text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
