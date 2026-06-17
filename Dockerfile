# RUNECHAIN — zero-dependency Node app (serves the game client + WebSocket MMO)
FROM node:20-alpine
WORKDIR /app

# no dependencies to install — just copy the runtime source
COPY package.json ./
COPY server.js ./
COPY index.html ./
COPY landing.html ./
COPY coming-soon.html ./
COPY game/ ./game/
COPY engine/ ./engine/
COPY assets/ ./assets/

# App Runner / ECS / Lightsail set PORT; default to 8080 locally
ENV PORT=8080
# AWS is the playable game host (the coming-soon gate stays on Vercel) — serve the game at /
ENV GAME_OPEN=1
EXPOSE 8080

# basic container healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1

CMD ["node", "server.js"]
