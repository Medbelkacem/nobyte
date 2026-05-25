# =====================================================================
# NOBTY backend image — PocketBase + WebAuthn sidecar + Push sidecar
#
# Cible : Fly.io (volume monté sur /pb_data pour la persistance SQLite).
# Le frontend (PWA Vite) est déployé séparément sur Vercel.
#
# Build :
#   docker build -t nobty-backend .
# Run local :
#   docker run --rm -p 8090:8090 \
#     -e VAPID_PUBLIC_KEY=... -e VAPID_PRIVATE_KEY=... -e VAPID_SUBJECT=mailto:... \
#     -v "$PWD/pocketbase/pb_data:/pb_data" nobty-backend
# =====================================================================
FROM node:20-alpine

# Dépendances système : curl pour télécharger PB, unzip, ca-certificates,
# tini (PID 1 propre + reaping des zombies).
RUN apk add --no-cache curl unzip ca-certificates tini bash

ARG PB_VERSION=0.38.2
ARG TARGETARCH=amd64
RUN curl -fLsS "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" \
      -o /tmp/pb.zip \
 && unzip /tmp/pb.zip pocketbase -d /usr/local/bin \
 && chmod +x /usr/local/bin/pocketbase \
 && rm /tmp/pb.zip

WORKDIR /app

# Dépendances Node strictement nécessaires aux deux sidecars.
# On n'installe ni React ni Vite ici — le frontend est sur Vercel.
COPY package.json /app/package.json
RUN node -e "const p=require('./package.json'); \
  const keep={ 'web-push': p.dependencies['web-push'], \
               '@simplewebauthn/server': p.dependencies['@simplewebauthn/server'] }; \
  require('fs').writeFileSync('package.sidecars.json', \
    JSON.stringify({name:'nobty-sidecars',private:true,type:'module',dependencies:keep},null,2));" \
 && mv package.sidecars.json package.json \
 && npm install --omit=dev --no-audit --no-fund

# Code applicatif backend.
COPY scripts/                    /app/scripts/
COPY pocketbase/pb_hooks/        /pb/pb_hooks/
COPY pocketbase/pb_migrations/   /pb/pb_migrations/
COPY pocketbase/pb_public/       /pb/pb_public/

# Le volume Fly est monté ici (cf. fly.toml). En dev local on map ce
# chemin sur ./pocketbase/pb_data.
ENV PB_DATA=/pb_data
ENV PUSH_PORT=4568
ENV WEBAUTHN_PORT=4567
# Le sidecar WebAuthn doit connaître le RP_ID/Origin du déploiement :
# à surcharger via `fly secrets set WEBAUTHN_RP_ID=... WEBAUTHN_ORIGIN=...`.
ENV WEBAUTHN_RP_ID=localhost
ENV WEBAUTHN_ORIGIN=https://localhost
ENV WEBAUTHN_VERIFIER_URL=http://127.0.0.1:4567
ENV PUSH_SENDER_URL=http://127.0.0.1:4568

VOLUME ["/pb_data"]

# Healthcheck pointe le hook /api/nobty/health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8090/api/nobty/health || exit 1

EXPOSE 8090

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/scripts/start-prod.sh"]
