# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Git Policy

**NEVER push to the remote repository.** This is a local-only trial branch (`pasi-trial`). All work stays local. Do not run `git push` under any circumstances.

## Project Overview

Suroi is an open-source 2D battle royale game inspired by surviv.io. It's a multiplayer browser game with a client-server architecture using WebSockets and binary protocol serialization.

## Commands

```bash
# Development
bun dev              # Start both client (port 3000) and server (port 8000)
bun dev:client       # Client only
bun dev:server       # Server only

# Building
bun build:client     # Production client build
bun start            # Start production server

# Linting (Biome)
bun lint             # Lint with auto-fix
bun lint:check       # Lint check only (used in CI)

# Validation
bun validateDefinitions  # Validate game definitions
bun validateSvgs         # Validate SVG assets

# Type checking
bun watch:server     # TypeScript type checking in watch mode
```

Server requires `server/config.json` — copy from `server/config.example.json` if missing.

## Monorepo Structure

Four workspace packages managed with Bun:

- **`common/`** — Shared code: game definitions, packet serialization, constants, utilities. Imported via `@common/*` path alias.
- **`client/`** — Browser game client: PixiJS v8 rendering, Svelte 5 UI, Vite bundler, SCSS styling.
- **`server/`** — Game server: runs on Bun runtime, uses Node cluster API for multi-process, WebSocket connections.
- **`tests/`** — Definition validators and stress tests.

## Architecture

### Definitions System (`common/src/definitions/`)
All game objects (guns, melees, obstacles, buildings, emotes, etc.) are defined as typed definition objects wrapped in `ObjectDefinitions` collections. Adding/modifying items here requires incrementing `GameConstants.protocolVersion` in `common/src/constants.ts`.

### Packet System (`common/src/packets/`)
Custom binary protocol using `SuroiByteStream` for client-server communication. The protocol version must be incremented when byte stream format changes.

### Object Model
Base classes use `BaseGameObject.derive(ObjectCategory.X)` pattern. Both client and server extend these shared base implementations with their own rendering/simulation logic:
- Client objects: `client/src/scripts/objects/`
- Server objects: `server/src/objects/`

### Game Loop
Server runs at 40 TPS. Main game logic in `server/src/game.ts`, server setup in `server/src/server.ts`, multi-game management in `server/src/gameManager.ts`.

## Code Conventions

- **Linter:** Biome with strict rules — no `any`, no non-null assertions (`!`), no `var`, `useConst` enforced
- **TypeScript:** Strict mode across all packages
- **Path alias:** `@common/*` maps to `../common/src/*` in client and server
- **Class properties:** `readonly` by default (enforced by Biome `useReadonlyClassProperties`)
- **Files:** kebab-case filenames, PascalCase classes

## Related

- **[AGENTS.md](AGENTS.md)** — Agent workflows (documentation, spec-driven development, TDD, review) and skills/tools configuration
