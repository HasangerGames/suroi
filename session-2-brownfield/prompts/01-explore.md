# Prompt 01: Explore the Suroi Codebase

**When to use:** PART 2 — REHEARSAL step (after cloning Suroi and copying AGENTS.md)
**Goal:** Use AI to understand an unfamiliar 114k LOC battle royale game codebase

**Prerequisite:** You've already run `cp /path/to/AGENTS.md .` in the Suroi repo root, `bun install`, and `bun dev`.

---

## Step 1: Understand the monorepo structure

```
@codebase What is the overall structure of this project?

Identify:
1. What are the workspace packages (client, server, common, tests)?
2. Where are the entry points for client and server?
3. What is the role of the `common/` package — why does it exist?
4. How does the build system work (Bun, Vite)?
```

---

## Step 2: Find the game loop

```
@server/src/game.ts

Explain the game loop:
1. What function runs every tick? How often (TPS)?
2. What gets updated each tick (players, bullets, gas, loot)?
3. How are game objects managed (created, updated, destroyed)?
4. What is the relationship between Game, GameManager, and Server?
```

---

## Step 3: Understand the definitions system

This is the heart of the game — all items, weapons, and objects are defined here.

```
@common/src/definitions/
@common/src/constants.ts

How does the definitions system work?
1. What is the ObjectDefinitions pattern used across guns.ts, melees.ts, obstacles.ts, etc.?
2. What is GameConstants.protocolVersion and when must it be incremented?
3. Pick a specific weapon (e.g., AK-47) — what stats does it have?
4. How do client and server both use these shared definitions?
```

---

## Step 4: Map your chosen subsystem

Pick your subsystem and use ONE of these prompts:

### If you chose Weapons & Inventory:
```
@common/src/definitions/items/guns.ts
@server/src/inventory/

How are weapons defined? Pick the AK-47 and trace:
1. Its definition (damage, fire rate, reload time, magazine size)
2. How the server processes a shot (where does damage calculation happen?)
3. How bullet spread and recoil work
4. What happens when a gun runs out of ammo?
```

### If you chose Game Loop & Entities:
```
@server/src/game.ts
@server/src/objects/

What entity types exist (Player, Obstacle, Building, Loot, etc.)?
How does the BaseGameObject.derive(ObjectCategory.X) pattern work?
Show me the lifecycle: creation → tick update → destruction.
```

### If you chose Gas/Zone Mechanics:
```
@server/src/data/gasStages.ts
@server/src/game.ts

How does the shrinking zone (gas) work?
1. What are the gas stages — radius, wait time, advance time, damage?
2. How is gas damage applied to players?
3. What triggers transitions between stages?
```

### If you chose Networking:
```
@common/src/packets/
@server/src/server.ts

What protocol does client-server communication use?
1. What is SuroiByteStream and why binary serialization?
2. What packet types exist (Join, Update, Input, Kill, etc.)?
3. How does state sync work at 40 TPS?
```

### If you chose Map Generation:
```
@server/src/map.ts
@server/src/data/maps.ts

How are maps generated?
1. What parameters control map size and layout (width, height, ocean, beach)?
2. How are obstacles and buildings placed?
3. What's different between normal mode and other mode maps?
```

---

## What you should know after this step

- [ ] You can describe the monorepo structure (client/server/common)
- [ ] You know how the definitions system works (ObjectDefinitions pattern)
- [ ] You understand GameConstants and protocolVersion
- [ ] You understand the basics of your chosen subsystem
- [ ] You've identified 2-3 key files with specific values you could change
