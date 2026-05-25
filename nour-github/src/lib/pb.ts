import PocketBase, { type RecordModel } from 'pocketbase';

const url = (import.meta.env.VITE_PB_URL as string | undefined) ?? 'http://127.0.0.1:8090';

/** Client PocketBase global, partagé par toute l'app. */
export const pb = new PocketBase(url);
pb.autoCancellation(false); // évite les "AbortError" sur les re-renders React stricts

export const isPbConfigured = Boolean(import.meta.env.VITE_PB_URL);

/** Persiste la session dans localStorage. PocketBase le fait nativement,
 *  mais on expose un helper pour intégrer "Remember me". */
export function setRememberMe(enabled: boolean) {
  try { localStorage.setItem('nobty.remember', enabled ? '1' : '0'); } catch { /* ignore */ }
}
export function getRememberMe(): boolean {
  try { return localStorage.getItem('nobty.remember') !== '0'; } catch { return true; }
}

/** Cast utilitaire pour récupérer un Record typé. */
export function asRecord<T>(r: RecordModel | null | undefined): T | null {
  return (r as unknown as T) ?? null;
}

/** Appel d'un endpoint custom monté via pb_hooks (`/api/nobty/...`). */
export async function callApi<T = unknown>(
  path: string,
  body?: Record<string, unknown>,
  method: 'GET' | 'POST' = 'POST',
): Promise<T> {
  const res = await pb.send<T>(`/api/nobty/${path.replace(/^\//, '')}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  });
  return res;
}
