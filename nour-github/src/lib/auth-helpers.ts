import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { pb, callApi } from './pb';

/** Force du mot de passe : 0..4 (none|weak|medium|strong|excellent). */
export function passwordStrength(pwd: string): { score: 0 | 1 | 2 | 3 | 4; label: 'weak' | 'medium' | 'strong' | 'excellent' } {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) s++;
  const map: Array<'weak' | 'medium' | 'strong' | 'excellent'> = ['weak','weak','medium','strong','excellent'];
  return { score: Math.min(4, s) as 0|1|2|3|4, label: map[Math.min(4, s)] };
}

/** Validation numéro algérien : +213 + 9 chiffres (commençant par 5/6/7). */
export function isValidAlgerianPhone(p: string): boolean {
  return /^\+213[567]\d{8}$/.test(p.replace(/\s+/g, ''));
}

export function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** Identifie si la chaîne saisie est un email ou un téléphone. */
export function detectIdentifier(value: string): 'email' | 'phone' | 'unknown' {
  if (isValidEmail(value)) return 'email';
  if (isValidAlgerianPhone(value)) return 'phone';
  return 'unknown';
}

// =====================================================================
// WebAuthn — vérification serveur réelle
//
// Le client utilise @simplewebauthn/browser pour les appels navigateur
// (navigator.credentials.create/get) et délègue toute la cryptographie
// aux endpoints PocketBase /api/nobty/webauthn/*, eux-mêmes appuyés sur
// le sidecar Node (scripts/webauthn-verifier.mjs).
// =====================================================================
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined'
    && 'credentials' in navigator
    && typeof (window as any).PublicKeyCredential !== 'undefined';
}

/** Enrôle une passkey pour l'utilisateur connecté. */
export async function registerPasskey(deviceName?: string): Promise<string> {
  if (!isWebAuthnSupported()) throw new Error('WebAuthn non supporté');
  if (!pb.authStore.isValid) throw new Error('Vous devez être connecté.');

  const options = await callApi<any>('webauthn/register-begin');
  const attestation = await startRegistration(options);
  const finish = await callApi<{ ok: boolean; credential_id: string }>(
    'webauthn/register-finish',
    { response: attestation, challenge: options.challenge, device_name: deviceName ?? '' },
  );
  return finish.credential_id;
}

/** Authentifie via passkey ; succès = pb.authStore est rempli. */
export async function loginWithPasskey(email?: string): Promise<boolean> {
  if (!isWebAuthnSupported()) throw new Error('WebAuthn non supporté');

  const options = await callApi<any>('webauthn/auth-begin', email ? { email } : {});
  const assertion = await startAuthentication(options);
  const finish = await callApi<{ token: string; record: any }>(
    'webauthn/auth-finish',
    { response: assertion, challenge: options.challenge },
  );
  pb.authStore.save(finish.token, finish.record);
  return pb.authStore.isValid;
}
