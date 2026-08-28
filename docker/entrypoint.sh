#!/bin/sh
set -e

cd /app/server

# Auto-create config.json from the example on first run.
# Also handles a bind-mount that created a directory instead of a file.
if [ -d config.json ]; then
    echo "[suroi] config.json is a directory; replacing with config.example.json"
    rm -rf config.json
fi
if [ ! -f config.json ]; then
    cp config.example.json config.json
    echo "[suroi] config.json created from config.example.json"
fi

# If clientConfig.json was bind-mounted as an empty directory (e.g. the host file
# doesn't exist), remove it so nginx falls back to the bundled default.
CLIENT_CONFIG=/usr/share/nginx/html/clientConfig.json
if [ -d "$CLIENT_CONFIG" ]; then
    echo "[suroi] clientConfig.json is a directory; removing it to use the bundled default"
    rm -rf "$CLIENT_CONFIG"
fi

# Start the game server in the background
bun . &

# Start nginx in the foreground (keeps the container alive)
exec nginx -g 'daemon off;'
