FROM oven/bun:1

WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./

# Copy workspace package.json files
COPY client/package.json client/
COPY server/package.json server/
COPY common/package.json common/
COPY tests/package.json tests/

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Environment variables (Defaults, can be overridden by Render)
ENV PORT=8000
ENV HOSTNAME=0.0.0.0

# Start command
# The root package.json has a "start" script that runs "cd server && bun ."
CMD ["bun", "start"]
