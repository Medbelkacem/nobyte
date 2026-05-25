import { useEffect, useState } from 'react';
import { pb } from '@/lib/pb';
import type { QueueCounter } from '@/types/db';

/**
 * Souscrit au counter d'un service via Realtime SSE.
 * Renvoie le dernier état et un flag de chargement.
 */
export function useQueueCounter(serviceId: string | undefined) {
  const [counter, setCounter] = useState<QueueCounter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serviceId) return;
    let active = true;
    let unsub: (() => void) | null = null;

    (async () => {
      try {
        // Charge initial
        const rec = await pb.collection('queue_counters').getFirstListItem(`service = "${serviceId}"`);
        if (active) setCounter(rec as unknown as QueueCounter);
      } catch {
        if (active) setCounter(null);
      } finally {
        if (active) setLoading(false);
      }
      // Subscribe à la collection entière, filtrage côté client par service
      try {
        const u = await pb.collection('queue_counters').subscribe('*', (e) => {
          const rec = e.record as unknown as QueueCounter;
          if ((rec as any).service === serviceId) setCounter(rec);
        });
        unsub = u as unknown as () => void;
      } catch { /* tolerate */ }
    })();

    return () => {
      active = false;
      if (unsub) unsub();
    };
  }, [serviceId]);

  return { counter, loading };
}
