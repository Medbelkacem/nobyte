import { useCallback, useEffect, useState } from 'react';
import { pb } from '@/lib/pb';
import type { RecordModel } from 'pocketbase';

interface Options {
  filter?: string;
  sort?: string;
  expand?: string;
  page?: number;
  perPage?: number;
  /** S'abonner aux changements realtime sur la collection. */
  subscribe?: boolean;
  /** Filtre côté subscribe (PocketBase accepte `*` ou un id record). */
  subscribeTarget?: string;
}

/**
 * Hook générique : lit une collection PocketBase et (option) se met à jour
 * en temps réel via subscribe().
 */
export function useCollection<T = RecordModel>(
  name: string,
  opts: Options = {},
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pb.collection(name).getList<RecordModel>(
        opts.page ?? 1,
        opts.perPage ?? 200,
        {
          filter: opts.filter,
          sort: opts.sort,
          expand: opts.expand,
        },
      );
      setItems(res.items as unknown as T[]);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'fetch error');
    } finally {
      setLoading(false);
    }
  }, [name, opts.filter, opts.sort, opts.expand, opts.page, opts.perPage]);

  useEffect(() => {
    let active = true;
    fetchList();
    let unsub: (() => void) | null = null;
    if (opts.subscribe) {
      const target = opts.subscribeTarget ?? '*';
      pb.collection(name).subscribe(target, () => {
        if (active) fetchList();
      }).then((u) => { unsub = u as unknown as () => void; });
    }
    return () => {
      active = false;
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, opts.filter, opts.sort, opts.expand, opts.page, opts.perPage, opts.subscribe, opts.subscribeTarget]);

  return { items, loading, error, refresh: fetchList };
}

/** Variante : un seul record par id. */
export function useRecord<T = RecordModel>(
  name: string,
  id: string | undefined,
  opts: { expand?: string; subscribe?: boolean } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const rec = await pb.collection(name).getOne<RecordModel>(id, { expand: opts.expand });
      setData(rec as unknown as T);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'fetch error');
    } finally {
      setLoading(false);
    }
  }, [name, id, opts.expand]);

  useEffect(() => {
    let active = true;
    load();
    let unsub: (() => void) | null = null;
    if (opts.subscribe && id) {
      pb.collection(name).subscribe(id, () => { if (active) load(); })
        .then((u) => { unsub = u as unknown as () => void; });
    }
    return () => { active = false; if (unsub) unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, id, opts.subscribe]);

  return { data, loading, error, refresh: load };
}
