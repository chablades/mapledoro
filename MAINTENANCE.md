# Maintenance Checklist

Run this after any major MapleStory patch (new class, class revamp, boss balance changes,
stat/formula changes), or on a routine cadence if a while has passed with no obvious patch.
Goal: catch drift between MapleDoro's pinned assumptions and the live game/live external
sites, before a player notices something's silently wrong.

## Quick start

```bash
npm run maintenance-check
```

Runs the checks below that can run unattended (no game files needed) and prints a
pass/fail summary. If everything passes, you're done unless a version bump happened (see
"Needs a manifest bump" below). If something fails, read the matching section here for
what it means and what to do next — the script itself only reports pass/fail, not why.

## What `maintenance-check` covers

### 1. Unit tests (`npm test`)
177+ tests covering pure formulas/logic: stat calculations (Mastery%, Final Damage%,
Damage Range), the Boss Clear (Cut) formula, search ranking, PNG export/import, JSON
import conflict resolution, link skill sync. See
`src/features/characters/scouter/bossClearFormula.verify.test.ts` for a real-character
golden-value check (not synthetic data).

**If this fails:** something in the tested logic itself broke — almost always a real
regression from a recent code change, not a stale-data problem. Read the failing test's
name and assertion message; it should point at exactly which function/behavior broke.
This is the one check here that's about our own code being wrong, not the outside world
changing.

### 2. MapleScouter boss-cut data (`scrape-bosscut.mjs`)
Re-scrapes MapleScouter's live site for boss clear thresholds
(`src/features/characters/scouter/bosscut-data.generated.ts`). Fingerprints the shape of
their data rather than trusting a hardcoded module ID, so it fails loudly instead of
silently reading garbage if MapleScouter redeploys.

**If this fails:** MapleScouter changed the *shape* of their data (not just refreshed the
numbers) — a real break, not routine drift. Needs someone to open the script
(`scripts/scrape-bosscut.mjs`) and re-derive the new fingerprint/module location by
inspecting MapleScouter's current bundle. This is genuine investigation work, budget real
time for it.

**If this passes but numbers look off in-app:** MapleScouter may have re-tuned a
threshold or the underlying formula. Compare a real character's in-app Boss Clear % against
what MapleScouter's own site shows for the same character/boss. If they've diverged,
check `bossClearFormula.ts`'s header comment and the
`project_maplescouter_bosscut_formula_2026_07_28` writeup before changing any constant —
the numbers there are empirically fit against real characters, not arbitrary, and need
re-validating the same way if MapleScouter's formula itself moved.

### 3. Mastery%/Final Damage% baselines (`gen-stat-baselines.mjs`)
Re-evaluates every pinned class's Mastery%/Final Damage% skill formula against the
current manifest (`manifests/v270/skill-formulas.json`). **Throws a build-time error
naming the class/skill/id** if a pinned formula no longer evaluates to its last-known
value — this is intentional, not a bug in the script.

**If this fails:** the failure message names the exact class and skill. This means either
(a) a class got revamped and its skill ids/formula changed for real (see the Characters
CLAUDE.md's "Class revamps" section for the full re-derivation steps), or (b) the local
manifest is stale relative to what the error expects. Re-verify against a real,
currently-unbuffed level-30-ish character in-game before updating the pinned `expected`
value — never just accept the new number the script computes without checking it against
reality first.

## Needs a manifest bump (not covered by the script — only relevant on a real version bump)

These require a **fresh WZ manifest dump** (`manifests/v27X/`), which needs actual game
files extracted locally — not something a routine unattended script can do. Only run
these when MapleStory has shipped a real content patch that changes equipment, familiars,
or V Matrix nodes:

- `gen-equipment.mjs` — per-slot equipment catalog. Optional `EQUIP_ICON_DIR` env var
  (pointing at a local WZ image dump) enables icon-based dedup of look-alike reissues.
- `gen-familiars.mjs` — familiar catalog. Optional `FAMILIAR_DUMP_DIR` env var, same
  dedup purpose.
- `gen-vmatrix.mjs` — per-class V Matrix node catalog.
- Re-run `gen-stat-baselines.mjs` again *after* bumping the manifest version, not just
  once against the old one.

Before running any of these against a new version: grep `scripts/` for the old version
string (e.g. `v270`) and confirm every generator's hardcoded manifest path default gets
updated together — a generator silently reading the old manifest gives no error, it just
masks real data drift. See root `CLAUDE.md`'s "Bumping the version" section.

## New class / class revamp

Not a script at all — a manual, in-game verification checklist. See the Characters
feature's own `CLAUDE.md` ("Adding a new class" / "Class revamps" sections) for the exact
steps: `classSkillData.ts`, `classBranch.ts`, buff/hero-echo mapping, HEXA skill data,
character slot cap, and the Mastery%/Final Damage% baseline derivation above. This always
needs a human checking against a real character — nothing here substitutes for that.

## Other scrapers (own trigger, not patch-driven)

These have their own re-run conditions unrelated to a MapleStory patch — see root
`CLAUDE.md`'s "External Data Scrapers" section:
- `generate-bgm-guesser-data.mjs` — re-run only when the curated BGM answer list changes.
- `scrape-class-resources.mjs` / `scrape-class-skills.mjs` — one-shot scrapers of external
  wiki/community sites, re-run if those sites' content changes materially.
