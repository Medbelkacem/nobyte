/**
 * NOBTY — Outbox local IndexedDB pour les prises de ticket hors-ligne.
 *
 * Quand l'utilisateur tape sur « Prendre mon ticket » sans réseau, on
 * empile une entrée dans la store `outbox` ; le {@link OutboxProvider}
 * la rejoue dès que `navigator.onLine` repasse à true (ou toutes les
 * 30 s tant qu'il reste du `pending`).
 *
 * Format d'une entrée :
 *
 * ```ts
 * {
 *   id:             "uuid",                       // clé primaire
 *   service_id:     "ab12cd34",
 *   service_name:   "Retrait CCP",
 *   establishment_id:   "ef56gh78",
 *   establishment_name: "La Poste — Batna Centre",
 *   queued_at:      "2026-05-25T14:32:11.123Z",
 *   status:         "pending" | "syncing" | "error",
 *   attempts:       0,
 *   error?:         string,                       // dernier message d'erreur
 * }
 * ```
 *
 * Le module est volontairement sans dépendance externe (pas d'`idb`).
 */

export type OutboxStatus = 'pending' | 'syncing' | 'error';

export interface OutboxEntry {
  id: string;
  service_id: string;
  service_name: string;
  establishment_id: string;
  establishment_name: string;
  queued_at: string;
  status: OutboxStatus;
  attempts: number;
  error?: string;
}

const DB_NAME    = 'nobty';
const DB_VERSION = 1;
const STORE      = 'outbox';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('by_queued_at', 'queued_at');
        store.createIndex('by_status',    'status');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDb().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

function awaitReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Fallback déterministe-ish pour les anciens runtimes.
  return 'tk-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export async function addEntry(
  partial: Omit<OutboxEntry, 'id' | 'queued_at' | 'status' | 'attempts'>,
): Promise<OutboxEntry> {
  const entry: OutboxEntry = {
    id:        uuid(),
    queued_at: new Date().toISOString(),
    status:    'pending',
    attempts:  0,
    ...partial,
  };
  const store = await tx('readwrite');
  await awaitReq(store.add(entry));
  return entry;
}

export async function listEntries(): Promise<OutboxEntry[]> {
  const store = await tx('readonly');
  const all = await awaitReq(store.getAll() as IDBRequest<OutboxEntry[]>);
  return all.sort((a, b) => a.queued_at.localeCompare(b.queued_at));
}

export async function updateEntry(id: string, patch: Partial<OutboxEntry>): Promise<void> {
  const store = await tx('readwrite');
  const current = await awaitReq(store.get(id) as IDBRequest<OutboxEntry | undefined>);
  if (!current) return;
  await awaitReq(store.put({ ...current, ...patch }));
}

export async function removeEntry(id: string): Promise<void> {
  const store = await tx('readwrite');
  await awaitReq(store.delete(id));
}

export async function countPending(): Promise<number> {
  const store = await tx('readonly');
  const idx = store.index('by_status');
  return awaitReq(idx.count(IDBKeyRange.only('pending')));
}
