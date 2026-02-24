# Prompt 02: Document the Codebase

**When to use:** PART 2 — After the 3-Tiered Documentation + Documentation Plan theory blocks
**Goal:** Build documentation iteratively, top-down. Every new document updates the references in all documents above it and beside it.

**Prerequisite:** You've completed Prompt 01 (explore) and know which subsystem you're focusing on.

---

## The Process

Work top-down: **content-plan → Tier 1 → Tier 2 → Tier 3**. Each step follows the same pattern:

1. **Create** the document for the current tier using the AGENTS.md template
2. **Update references upward** — go back to every higher-tier document and add/update links pointing down to the new document
3. **Update references sideways** — add links to/from related documents at the same tier
4. **Update content-plan.md** — mark status as "Done", set the date

Never create a document in isolation. Every document must be woven into the existing reference web.

---

## Step 1: Create content-plan.md

The content plan is the index — the starting point for all navigation.

```
@AGENTS.md
@codebase

Run the `document` workflow from AGENTS.md.

Step 1: Create a Documentation Content Plan (content-plan.md).
Use the Content Plan template from AGENTS.md (PART 1 → Content Plan → Template).

Scan the codebase to identify all major subsystems. For each one, add a row to
the Documentation Index table with: Module/Area, Tier, Status (all "Not Started"),
Path (where the doc will live), and Priority.

Follow the Generation Order from the template:
1. Tier 1 first — architecture overview, data model
2. Core Tier 2 — subsystems that others depend on
3. Feature Tier 2 — domain-specific subsystems
4. Tier 3 last — module-level docs within subsystems
```

---

## Step 2: Document Tier 1 (Architecture overview)

Start at the top. The Tier 1 doc is the entry point that everything else hangs from.

```
@AGENTS.md
@content-plan.md

Create the Tier 1 Architecture document using the Tier 1 template from AGENTS.md
(PART 1 → Tier 1 → Tier 1 Document Template).

Save to docs/architecture.md. It must include:
- Tech stack and high-level structure
- Subsystem References section — link to each Tier 2 doc path from content-plan.md
  (even though they don't exist yet — the links create the navigation skeleton)
- Related Documents section linking to other Tier 1 docs

After creating the document:
- Update content-plan.md: mark Architecture as "Done" with today's date
```

---

## Step 3: Document Tier 2 (Your chosen subsystem)

Drill into your subsystem. Use the key files you identified in Prompt 01.

```
@AGENTS.md
@docs/architecture.md
@[key files from your subsystem — the ones you explored in Prompt 01]

Create the Tier 2 Subsystem README using the template from AGENTS.md
(PART 1 → Tier 2 → Subsystem README Template).

Save to docs/subsystems/[your-subsystem]/README.md. It must include:
- Purpose, Key Files & Entry Points table
- Architecture and Data Flow sections
- Dependencies (what this subsystem depends on, what depends on it)
- Cross-tier references:
  - ↑ Link UP to docs/architecture.md (Tier 1)
  - ↓ List Tier 3 module docs that should be created (Module Index section)
  - → Link sideways to related subsystems

After creating the document, update references:
- Update docs/architecture.md: ensure the Subsystem References section links
  to this new Tier 2 doc with a description (not just a placeholder anymore)
- Update content-plan.md: mark your Tier 2 entry as "Done"
```

---

## Step 4: Document Tier 3 (Module-level detail)

Pick the most complex or important module within your subsystem. Bridge documentation to source code.

```
@AGENTS.md
@docs/subsystems/[your-subsystem]/README.md
@[the specific module source file]

Create a Tier 3 Module document using the template from AGENTS.md
(PART 1 → Tier 3 → Module Document Template).

Save to docs/subsystems/[your-subsystem]/modules/[module-name].md. It must include:
- Key Files table with complexity ratings
- Business Rules that govern this module
- Data Lineage (input → processing → output)
- Complex Functions section with @file references to source code
- Cross-tier references:
  - ↑ Link UP to the Tier 2 README
  - → Link to source code via @file references

After creating the document, update references:
- Update docs/subsystems/[your-subsystem]/README.md: update the Module Index
  section so the Tier 3 link points to the real document (not a placeholder)
- Update docs/architecture.md: if this module reveals cross-subsystem
  dependencies, add those to the Subsystem References
- Update content-plan.md: mark your Tier 3 entry as "Done"
```

---

## Step 5: Test & improve — verify the reference chain

> This step runs during BUILD step 9 (5 min), after the Architecture theory side bite.

Test that the documentation is navigable end-to-end. Walk the reference chain both ways.

```
@content-plan.md
@docs/architecture.md
@docs/subsystems/[your-subsystem]/README.md

I'm a new developer. Using ONLY the documentation above:

1. Start at docs/architecture.md. Can you navigate down to the Tier 2 doc
   for [your subsystem]? Do the links work?
2. From the Tier 2 doc, can you navigate down to a Tier 3 module doc?
   Does the Module Index have working links?
3. From the Tier 3 doc, can you navigate back up to Tier 2 and Tier 1?
   Are the upward references present?
4. Using this documentation chain, answer: how would I add a new
   [item/entity/feature] to [your subsystem]? Cite which document
   and section you found each part of the answer in.

If any links are broken, missing, or point to placeholder paths, list them.
If you can't answer question 4 from the docs alone, tell me what's missing
and which tier/document should contain it.
```

Then fix the gaps — this is the iteration loop:

```
The documentation has these broken references and gaps:
[paste what AI identified]

Fix each one:
1. For broken/missing links: update the source document to point correctly
2. For missing information: add it to the appropriate tier document
3. After every update: check that references in higher-tier and same-tier
   documents still point correctly

Do not create a fix in isolation — always update the reference web.
```

---

## The Key Discipline

Every time you create or update a document, ask:
- **Did I update the references pointing DOWN to this doc from higher tiers?**
- **Did I update the references pointing SIDEWAYS from related docs at this tier?**
- **Does this doc reference UP to its parent tier?**

If any answer is no, you're not done yet.

---

## What you should have after this step

- [ ] `content-plan.md` — documentation index with status tracking
- [ ] `docs/architecture.md` — Tier 1 with subsystem references pointing down (updated as Tier 2 docs were created)
- [ ] `docs/subsystems/[your-subsystem]/README.md` — Tier 2 with references up to Tier 1 and down to Tier 3
- [ ] `docs/subsystems/[your-subsystem]/modules/[module].md` — Tier 3 with @file refs to source and up to Tier 2
- [ ] **Reference chain is complete:** Tier 1 ↔ Tier 2 ↔ Tier 3 ↔ source code (navigable in both directions)
- [ ] **No orphan documents:** every doc is referenced from at least one other doc
- [ ] `content-plan.md` updated with "Done" statuses for all completed docs
