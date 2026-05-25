#!/usr/bin/env bash
# =====================================================================
# NOBTY — superviseur 3-process pour l'image Docker production.
#
# - push-sender   (Node, port 4568) — requiert VAPID_* dans l'env
# - webauthn      (Node, port 4567)
# - pocketbase    (binaire Go, port 8090) — front-process
#
# Stratégie : on lance les sidecars en arrière-plan ; si l'un meurt,
# on tue tout le groupe pour que Fly redémarre la VM (et donc l'image
# entière). C'est plus simple qu'un vrai supervisor et largement
# suffisant pour un binaire qui doit *toujours* être up.
# =====================================================================
set -euo pipefail

: "${PB_DATA:=/pb_data}"
mkdir -p "$PB_DATA"

log() { printf '[start-prod %s] %s\n' "$(date -u +%FT%TZ)" "$*"; }

# --- Push sender (skipped si pas de VAPID configuré) -----------------
if [ -n "${VAPID_PUBLIC_KEY:-}" ] && [ -n "${VAPID_PRIVATE_KEY:-}" ]; then
  log "→ push-sender on :${PUSH_PORT:-4568}"
  node /app/scripts/push-sender.mjs &
  PUSH_PID=$!
else
  log "⚠ VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY absents — push-sender désactivé"
  PUSH_PID=
fi

# --- WebAuthn verifier ----------------------------------------------
log "→ webauthn-verifier on :${WEBAUTHN_PORT:-4567} (RP_ID=${WEBAUTHN_RP_ID})"
node /app/scripts/webauthn-verifier.mjs &
WA_PID=$!

# --- Si un sidecar meurt, on tue tout -------------------------------
trap 'log "shutting down…"; kill ${PUSH_PID:-} ${WA_PID:-} ${PB_PID:-} 2>/dev/null || true; exit 0' SIGTERM SIGINT
(
  # Watcher : surveille les sidecars, tue PocketBase si l'un meurt.
  while :; do
    if [ -n "${PUSH_PID:-}" ] && ! kill -0 "$PUSH_PID" 2>/dev/null; then
      log "✖ push-sender exited — cascade kill"; kill -TERM 1; exit 1
    fi
    if ! kill -0 "$WA_PID" 2>/dev/null; then
      log "✖ webauthn-verifier exited — cascade kill"; kill -TERM 1; exit 1
    fi
    sleep 5
  done
) &

# --- PocketBase en avant-plan (PID 1 via tini) ----------------------
log "→ pocketbase serve on :8090 (data=$PB_DATA)"
exec pocketbase serve \
  --dir="$PB_DATA" \
  --hooksDir=/pb/pb_hooks \
  --migrationsDir=/pb/pb_migrations \
  --publicDir=/pb/pb_public \
  --http=0.0.0.0:8090
