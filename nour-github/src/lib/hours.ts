type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export type OpeningHours = Record<string, [string, string] | null | undefined>;

/** Renvoie true si l'établissement est ouvert maintenant. */
export function isOpenNow(hours: OpeningHours, now: Date = new Date()): boolean {
  const day = DAY_KEYS[now.getDay()];
  const slot = hours?.[day];
  if (!slot || !Array.isArray(slot)) return false;
  const [open, close] = slot;
  const t = now.getHours() * 60 + now.getMinutes();
  const [oH, oM] = open.split(':').map(Number);
  const [cH, cM] = close.split(':').map(Number);
  return t >= oH * 60 + oM && t < cH * 60 + cM;
}

/** Renvoie le prochain créneau d'ouverture sous forme lisible. */
export function nextOpening(hours: OpeningHours, now: Date = new Date()): string | null {
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const day = DAY_KEYS[d.getDay()];
    const slot = hours?.[day];
    if (slot && Array.isArray(slot)) {
      const [open] = slot;
      if (i === 0) {
        const t = now.getHours() * 60 + now.getMinutes();
        const [oH, oM] = open.split(':').map(Number);
        if (t < oH * 60 + oM) return `Aujourd'hui à ${open}`;
      } else {
        const labels = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
        return `${labels[d.getDay()]} à ${open}`;
      }
    }
  }
  return null;
}
