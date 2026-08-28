# ---------- Build stage: install deps and build the client ----------
FROM oven/bun:1 AS build

WORKDIR /app

# Switch apt to a domestic mirror (deb.debian.org is unreliable from China)
RUN sed -i 's|http://deb.debian.org|http://mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null \
    || sed -i 's|http://deb.debian.org|http://mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list 2>/dev/null \
    || true

# Copy workspace manifests first for better layer caching
COPY package.json bun.lock bunfig.toml .npmrc ./
COPY client/package.json client/package.json
COPY common/package.json common/package.json
COPY server/package.json server/package.json
COPY tests/package.json tests/package.json

RUN bun install --frozen-lockfile

# Install Node.js for the client build: spritesheetc's native addon resolves
# relative paths incorrectly when loaded under Bun (verified working under Node).
# The runtime stage still runs the game server on Bun.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates xz-utils \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://npmmirror.com/mirrors/node/v22.16.0/node-v22.16.0-linux-x64.tar.xz | tar -xJ -C /usr/local --strip-components=1

# Copy sources and build the client (outputs to client/dist)
COPY . .
RUN cd client && rm -rf ../node_modules/.vite-temp node_modules/.vite-temp && node ../node_modules/vite/bin/vite.js build

# ---------- Runtime stage: game server + nginx ----------
FROM oven/bun:1

# Switch apt to a domestic mirror too
RUN sed -i 's|http://deb.debian.org|http://mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null \
    || sed -i 's|http://deb.debian.org|http://mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list 2>/dev/null \
    || true; \
    apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Server runtime (config.json is auto-created from config.example.json at startup)
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/common ./common
COPY --from=build /app/server ./server

# Static client files (served by nginx), incl. the bundled clientConfig.json
COPY --from=build /app/client/dist /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
