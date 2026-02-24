# Prompt 03: Prompt a Change & Generate Specs Using SDD

**When to use:** PART 3 — First BUILD step
**Goal:** Pick a visible change to the game and write a grounded spec using the AGENTS.md spec template

---

## Step 1: Pick a change to the game

Choose something **visible** — you want to see the result in the browser at http://localhost:3000. Pick ONE:

### Option A — Gameplay tweaks (easiest to verify):

| Change | File | Current Value | What to try |
|--------|------|---------------|-------------|
| Player speed | `common/src/constants.ts:19` | `0.03` | `0.06` (double speed) |
| Player health | `common/src/constants.ts:20` | `100` | `200` (tank mode) |
| AK-47 damage | `common/src/definitions/items/guns.ts` | `14` | `50` (one-shot kills) |
| AK-47 fire rate | `common/src/definitions/items/guns.ts` | `100ms` | `30ms` (minigun mode) |
| Mosin damage | `common/src/definitions/items/guns.ts` | `75` | `200` (instant kill) |
| Shotgun pellet count | `common/src/definitions/items/guns.ts` | `9` | `20` (wall of lead) |
| Frag grenade fuse | `common/src/definitions/items/throwables.ts` | `4000ms` | `1000ms` (quick fuse) |
| Gas stage 1 damage | `server/src/data/gasStages.ts` | `1 DPS` | `10 DPS` (deadly storm) |
| More gun spawns | `server/src/data/lootTables.ts` | weight `0.9` | `3.0` (guns everywhere) |

### Option B — Visual/feel changes:

| Change | What to look for | Area |
|--------|-----------------|------|
| Blood particle lifetime | `client/src/scripts/objects/player.ts` hitEffect() | Longer/shorter blood splatter |
| Kill feed duration | `client/src/scripts/managers/uiManager.ts` | How long kills show on screen |
| Map size | `server/src/data/maps.ts` width/height | Bigger/smaller arena |

### Option C — Multi-file feature (more ambitious):

| Change | Files involved |
|--------|---------------|
| New game mode with 2x player speed | `common/src/definitions/modes.ts` + `common/src/constants.ts` |
| Custom weapon variant (e.g., golden AK-47 with double damage) | `common/src/definitions/items/guns.ts` |
| Faster zone closing for quick matches | `server/src/data/gasStages.ts` (multiple stages) |

---

## Step 2: Write the spec

Write a change spec using the spec template from AGENTS.md. Save it as `specs/[your-change].md`.

**Use the spec template from `AGENTS.md` (PART 2 → Workflow: spec → Spec Template) as your format.**

Example prompt for a gameplay tweak:

```
@AGENTS.md
@common/src/constants.ts
@docs/subsystems/[your-subsystem]/README.md

I want to [describe your change — e.g., "double the player movement speed"].

Write a change spec using the spec template from AGENTS.md (PART 2 → Workflow: spec → Spec Template).
Save it as specs/[your-change].md.

Ground the spec in the actual code:
- Reference current values with file paths and line numbers
- List exactly which files need to change
- Consider: does this require incrementing protocolVersion? (Yes if definition lists change, no for value tweaks)
- Include Given/When/Then acceptance criteria that I can verify in the browser
- Risk assessment: what other systems could this affect?
```

---

## Step 3: Ask AI to review your spec

```
@AGENTS.md
@specs/[your-change].md
@docs/subsystems/[your-subsystem]/README.md

Review this spec against the spec template in AGENTS.md:
1. Is every AC testable by playing the game in the browser?
2. Are the files to modify correct and complete?
3. Does the risk assessment identify what could break?
4. Is the spec grounded in our documentation (not invented)?
5. Is the change small enough to complete in 10 minutes?

Check the Spec Readiness Checklist from AGENTS.md.
List any issues found.
```

Fix any issues before proceeding.

---

## Step 4: Implement the spec

```
@specs/[your-change].md
@[files to modify from the spec]

Implement this change following the spec exactly.

Requirements:
- Modify only the files listed in the spec
- Follow existing code patterns in this project
- Do not change any interfaces that other subsystems depend on
- After each file change, explain what you changed and why
- The dev server (bun dev) has hot reload — changes should appear immediately
```

After implementation, open the game in the browser and test your change!

---

## The "Is This Spec Ready?" Checklist

Before implementation, check against the AGENTS.md Spec Readiness Checklist:
- [ ] Every AC has Given/When/Then format
- [ ] Files to modify are listed with specific changes
- [ ] Risk assessment identifies what could break
- [ ] Testing strategy describes how to verify in the browser
- [ ] The change is small enough to complete in 10 minutes
- [ ] The spec references our documentation (grounded, not vibe)
