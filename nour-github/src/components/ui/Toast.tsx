import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ToastKind = 'info' | 'success' | 'error';
interface Toast { id: number; kind: ToastKind; message: string; }
interface ToastCtx { push: (kind: ToastKind, message: string) => void; }

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto rounded-2xl px-4 py-3 shadow-zellij animate-fade-up',
              'border backdrop-blur',
              t.kind === 'success' && 'bg-emerald/90 text-ivory border-emerald-600',
              t.kind === 'error'   && 'bg-red-600/90 text-white border-red-700',
              t.kind === 'info'    && 'bg-ivory/95 dark:bg-night-card/95 text-leather dark:text-ivory border-gold/30',
            )}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

/** Petit hook utilitaire pour notifier l'utilisateur via le système. */
export function usePushNotification() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);
  return useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: '/icons/icon-192.png' }); } catch { /* ignore */ }
    }
  }, []);
}
