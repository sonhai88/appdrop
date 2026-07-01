# AppDrop — container image for Railway/Render/Fly (persistent-disk hosts).
# Single stage keeps the compiled better-sqlite3 native binary in place.
FROM node:20-bookworm-slim

# Build tools in case better-sqlite3 needs to compile (prebuilt binaries are
# used when available, but this makes the build robust).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
# Uploaded builds + SQLite live here — mount a persistent volume at /data.
ENV DATA_DIR=/data
ENV PORT=3000
EXPOSE 3000

# next start binds to $PORT (Railway/Render inject it).
CMD ["npm", "run", "start"]
