import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { callApi } from '@/lib/pb';
import { addEntry, listEntries, removeEntry, updateEntry, type OutboxEntry } from '@/lib/outbox';
import type { Ticket } from '@/types/db';

interface OutboxCtx {
  entries: OutboxEntry[];
  pendingCount: number;
  online: boolean;
  syncing: boolean;
  enqueue: (svc: {
    service_id: string; service_name: string;
    establishment_id: string; establishment_name: string;
  }) => Promise<OutboxEntry>;
  flush: () => Promise<void>;
  drop: (id: string) => Promise<void>;
}

const Ctx = createContext<OutboxCtx | null>(null);

const FLUSH_INTERVAL_MS = 30_000;

function isNetworkError(err: any): boolean {
  // PocketBase ClientResponseError sans status = pas de réponse HTTP (donc réseau coupé).
  if (!err) return false;
  if (err.isAbort) return false;
  if (typeof err.status === 'number' && err.status > 0) return false;
  return true;
}

export function OutboxProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [online,  setOnline]  = useState<boolean>(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const flushing = useRef(false);

  const reload = useCallback(async () => {
    try { setEntries(await listEntries()); }
    catch { /* IDB indisponible — on garde l'état courant */ }
  }, []);

  const enqueue: OutboxCtx['enqueue'] = useCallback(async (svc) => {
    const entry = await addEntry(svc);
    await reload();
    return entry;
  }, [reload]);

  const drop = useCallback(async (id: string) => {
    await removeEntry(id);
    await reload();
  }, [reload]);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    flushing.current = true;
    setSyncing(true);
    try {
      const list = await listEntries();
      const pending = list.filter((e) => e.status === 'pending' || e.status === 'error');
      for (const entry of pending) {
        await updateEntry(entry.id, { status: 'syncing', error: undefined });
        try {
          await callApi<Ticket>('issue-ticket', { service: entry.service_id });
          await removeEntry(entry.id);
        } catch (err: any) {
          if (err?.status === 409) {
            // Ticket actif déjà existant : on considère l'entrée comme résolue.
            await removeEntry(entry.id);
          } else if (isNetworkError(err)) {
            // Toujours hors-ligne : on remet en pending sans incrémenter
            // les attempts (la prochaine fenêtre online retentera).
            await updateEntry(entry.id, { status: 'pending', error: 'offline' });
            break;
          } else {
            await updateEntry(entry.id, {
              status: 'error',
              attempts: entry.attempts + 1,
              error: String(err?.message || err),
            });
          }
        }
      }
    } finally {
      await reload();
      flushing.current = false;
      setSyncing(false);
    }
  }, [reload]);

  // Chargement initial + écoute online/offline + tick périodique.
  useEffect(() => {
    reload();
    flush();

    const onOnline  = () => { setOnline(true);  flush(); };
    const onOffline = () => { setOnline(false); };
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);

    const id = window.setInterval(() => {
      if (navigator.onLine) flush();
    }, FLUSH_INTERVAL_MS);

    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      window.clearInterval(id);
    };
  }, [flush, reload]);

  const value = useMemo<OutboxCtx>(() => ({
    entries,
    pendingCount: entries.filter((e) => e.status === 'pending' || e.status === 'syncing').length,
    online, syncing,
    enqueue, flush, drop,
  }), [entries, online, syncing, enqueue, flush, drop]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOutbox(): OutboxCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOutbox must be used within OutboxProvider');
  return ctx;
}

// =====================================================================
// Bandeau présenté dans AppShell quand on est hors-ligne ou qu'il reste
// des tickets à synchroniser.
// =====================================================================
export function OfflineBanner() {
  const { online, pendingCount, syncing, flush } = useOutbox();
  if (online && pendingCount === 0) return null;
  const text = !online
    ? `Hors-ligne — ${pendingCount > 0 ? `${pendingCount} ticket(s) en attente de synchronisation` : 'la prise de ticket sera mise en file locale'}`
    : syncing
      ? `Synchronisation de ${pendingCount} ticket(s)…`
      : `${pendingCount} ticket(s) en attente`;
  return (
    <div className="bg-gold/15 text-leather dark:text-ivory border-b border-gold/30 text-sm px-4 py-2 flex items-center gap-3">
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald' : 'bg-red-500'} animate-pulse`} />
      <span className="flex-1">{text}</span>
      {online && pendingCount > 0 && !syncing && (
        <button onClick={() => flush()} className="font-semibold text-emerald dark:text-gold hover:underline">
          Réessayer
        </button>
      )}
    </div>
  );
}
