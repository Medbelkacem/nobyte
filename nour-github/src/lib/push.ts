/**
 * NOBTY — Helpers Web Push côté navigateur.
 *
 * Le flux d'opt-in :
 *   1) Récupère la clé publique VAPID depuis le sidecar
 *      (proxy `/api/nobty/push/vapid-public-key`).
 *   2) navigator.serviceWorker.ready → swReg.pushManager.subscribe(...).
 *   3) POST l'abonnement vers `/api/nobty/push/subscribe`.
 *
 * L'annulation purge l'abonnement local ET serveur.
 */
import { callApi } from './pb';

export function isPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribePush(): Promise<PushSubscription> {
  if (!isPushSupported()) throw new Error('Push non supporté');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permission refusée');

  const { key } = await callApi<{ key: string }>('push/vapid-public-key', undefined, 'GET');
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
  });

  await callApi('push/subscribe', {
    subscription: sub.toJSON(),
    ua: navigator.userAgent,
  });
  return sub;
}

export async function unsubscribePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  try { await callApi('push/unsubscribe', { endpoint: sub.endpoint }); }
  catch { /* ignore : on supprime quand même côté client */ }
  await sub.unsubscribe();
}

function urlBase64ToUint8Array(b64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (b64Url.length % 4)) % 4);
  const b64 = (b64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
