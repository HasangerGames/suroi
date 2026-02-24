# Session 2: Brownfield Development with AI

**90 min | Intermediate | "Taming Existing Codebases"**

Work with a real, large open-source codebase using AI. You'll learn to document, spec changes using SDD, and code review — all in unfamiliar code.

---

## Rehearsal Project: Suroi

**Repo:** https://github.com/HasangerGames/suroi
**What it is:** A 2D battle royale io-game (surviv.io clone), ~114k lines of TypeScript
**Live demo:** https://suroi.io

### Why Suroi?

- **~114k lines of TypeScript** — large enough that you NEED AI to navigate
- **Zero architecture docs** — README covers setup, not how the code works
- **Rich domain complexity** — game loop, entity system, physics, networking, map generation
- **Monorepo structure** — `client/`, `server/`, `common/` workspaces
- **Runs in browser** — change code, see results instantly with hot reload
- **Real open issues** — actual bugs and feature requests to pick from

### Setup

```bash
git clone https://github.com/HasangerGames/suroi.git
cd suroi
cp /path/to/ai_training/AGENTS.md .
bun install
cp server/config.example.json server/config.json
bun dev
# Open http://localhost:3000 (or next available port)
```

**Important:** Copy `AGENTS.md` into the Suroi repo root. The prompts reference its templates for documentation and specs.

---

## Session Flow

| # | Type | Topic | Duration |
|---|------|-------|----------|
| | | **— PART 1: OVERVIEW —** | |
| 1 | THEORY | Greenfield vs Brownfield — 80% of work is brownfield | 5 min |
| 2 | THEORY | Vibe Coding vs Grounded SDD | 5 min |
| 3 | THEORY | ModernPath 4-Step Process (Document → Spec → Develop → Audit) | 5 min |
| | | **— PART 2: DOCUMENTATION —** | |
| 4 | **REHEARSAL** | **Clone Suroi, copy AGENTS.md, run `bun dev`, explore the codebase** | **10 min** |
| 5 | THEORY | Brownfield: 3-Tiered Documentation (High-level → Subsystem → Module) | 5 min |
| 6 | THEORY | Documentation Plan (content-plan.md — map what exists, index for AI) | 5 min |
| 7 | **BUILD** | **Document Suroi: create content-plan.md + document your subsystem** | **10 min** |
| 8 | THEORY | AI-Friendly Architecture *(side bite while AI documents)* | 5 min |
| 9 | **BUILD** | **Test & improve docs — ask AI questions about the codebase, iterate** | **5 min** |
| | | **— PART 3: SPEC-DRIVEN CHANGE —** | |
| 10 | **BUILD** | **Prompt a change to the game, generate specs using SDD** | **10 min** |
| 11 | THEORY | Code Review with AI (Critique loops, PR review prompts) | 5 min |
| 12 | **BUILD** | **Code review the change against the spec** | **10 min** |
| 13 | WRAP-UP | What you documented & improved, Q&A | 5 min |

**Total: 90 min** (30 min theory + 45 min hands-on + 5 min wrap-up + 10 min rehearsal)

---

## Pick a Subsystem

Choose ONE subsystem to focus on during the session:

| Subsystem | Key Files | What to document | Easy changes to try |
|-----------|-----------|-----------------|---------------------|
| **Weapons & inventory** | `common/src/definitions/items/guns.ts`, `server/src/inventory/` | Weapon definitions, damage calc, ammo system | AK-47 damage (14→50), fire rate (100ms→30ms), shotgun pellets (9→20) |
| **Game loop & entities** | `server/src/game.ts`, `server/src/objects/` | How the game tick works, entity lifecycle, collision | Player speed (0.03→0.06), player health (100→200) |
| **Gas/zone mechanics** | `server/src/data/gasStages.ts`, `server/src/game.ts` | Zone shrinking stages, damage, timing | Gas damage (1→10 DPS), faster zone closing |
| **Map generation** | `server/src/map.ts`, `server/src/data/maps.ts` | How maps are generated, obstacle placement | Map size (1632→2048), more gun spawns in loot tables |
| **Networking** | `common/src/packets/`, `server/src/server.ts` | Client-server protocol, state sync, WebSocket messages | (More advanced — read-only recommended) |

---

## Quick Reference: Key Values

For the spec-change step, here are concrete values you can modify and immediately test:

| What | File | Current | Effect of change |
|------|------|---------|-----------------|
| Player speed | `common/src/constants.ts:19` | `0.03` | Higher = faster movement |
| Player health | `common/src/constants.ts:20` | `100` | Higher = harder to kill |
| AK-47 damage | `common/src/definitions/items/guns.ts` | `14` | Higher = more lethal |
| AK-47 fire rate | `common/src/definitions/items/guns.ts` | `100ms` delay | Lower = faster shooting |
| Mosin damage | `common/src/definitions/items/guns.ts` | `75` | Sniper one-shot potential |
| Shotgun pellets | `common/src/definitions/items/guns.ts` | `9` per shot | More pellets = more spread damage |
| Grenade fuse | `common/src/definitions/items/throwables.ts` | `4000ms` | Lower = quicker detonation |
| Gas stage 1 DPS | `server/src/data/gasStages.ts` | `1` | Higher = deadlier storm |
| Gun spawn weight | `server/src/data/lootTables.ts` | `0.9` | Higher = more guns on ground |

---

## Prompt Files

Follow these in order during the BUILD steps:
1. `prompts/01-explore.md` — Explore the codebase with AI (REHEARSAL, Part 2)
2. `prompts/02-document.md` — Create content-plan.md + 3-tiered docs using AGENTS.md templates (BUILD steps 7 + 9)
3. `prompts/03-spec-change.md` — Prompt a change, write a grounded spec using AGENTS.md spec template (BUILD step 10)
4. `prompts/04-review.md` — Code review the change against the spec (BUILD step 12)
