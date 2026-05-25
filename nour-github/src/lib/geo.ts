/**
 * Distance Haversine (km) entre deux points GPS.
 */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(d: number) { return (d * Math.PI) / 180; }

/** Demande la géolocalisation utilisateur, retourne {lat, lng} ou null. */
export function getUserPosition(timeoutMs = 6000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

/** Lien Google Maps pour itinéraire. */
export function googleMapsDirections(to: { lat: number; lng: number }, label?: string) {
  const q = label ? encodeURIComponent(label) : `${to.lat},${to.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&destination_place_id=${q}`;
}
