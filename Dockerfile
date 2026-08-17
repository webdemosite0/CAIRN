# CAIRN — needs a Node server and a persistent disk. It cannot be statically
# exported: there are API routes, server actions, middleware and a SQLite
# database behind it.
#
# Node 24 is not optional. The database uses node:sqlite, which only exists
# unflagged from Node 23.4 onward.

# ---------- deps ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build ----------
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Baked into the client bundle at build time, so it has to be present now
# rather than at runtime. Everything else is read when the server starts.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------- run ----------
FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# The database lives here. Mount a volume at this path or the data is lost
# on every redeploy.
ENV CAIRN_DATA_DIR=/data

RUN addgroup -g 1001 -S nodejs \
 && adduser -u 1001 -S nextjs -G nodejs \
 && mkdir -p /data \
 && chown -R nextjs:nodejs /data

# `output: "standalone"` produces server.js plus only the node_modules it
# actually reaches; static/ and public/ are not included and must be copied.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
VOLUME ["/data"]

CMD ["node", "server.js"]
