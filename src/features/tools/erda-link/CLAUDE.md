# Erda Link

The SHINE classes' (Sia Astelle, Erel Light) replacement for the HEXA Matrix. There is no
route of its own: `HexaSkillsWorkspace` swaps in `ErdaLinkSummary` + `ErdaLinkTracker` when
`erdaLinkClassKey(className)` is non-null, and the levels persist inside the character's
`hexaSkills` tool blob under `erdaLink` (a `Record<nodeKey, level>`).

**Every Erda Link write also rewrites the blob's `levels`** (the HEXA tracker's shape, which
the character overview and the Scouter read) through `erdaLinkToHexaLevels`, using
`ERDA_LINK_HEXA_SLOTS` to place each stone: the ultimate stones are the two mastery slots, the
four skill stones the enhancement slots (a split pair sums), Sol Janus / Sol Hecate / Tree of
Stars the common slots. The reverse runs when the tracker loads a character
(`parseHexaSkills`): if `levels` disagrees with the stones, it was edited elsewhere (setup, the
overview's edit pencil, a MapleScouter import) and `erdaLinkFromHexaLevels` folds it back,
splitting a paired stone by filling (1) first on a raise and cutting (2) first on a drop.

**The upgrade order is hand-maintained data**, not WZ data. `erda-link-order.ts` holds one
entry per single level-up per class: node key, target level, erda, frags, FD gain as a fraction.
Shinestone fragment costs are RNG-averaged expectations (fractional); FD totals are a plain sum
of the steps, not a compound.

**Node keys** are upper-case names ("IGNORE DEFENSE 3", "M1", "SHINESTONE 2", "SOL JANUS").
`erda-link-data.ts` declares every slot once with a key per class, so the two trees share one
layout: same positions and edges, different stones in a few slots. Every key used in the order
must be declared there, or that step has no stone in the tree.

**Progress is derived, not stored.** A step is done when its node's level is at or past the
step's target (so steps can complete out of order); "next" is the first undone step; spent/total
are sums over done/all steps. `computeErdaLinkProgress` is the one place this lives. Clicking the
highlighted stone applies the next step; any other click selects the stone for manual editing.
Nodes absent from the order (locked slot, Tree of Stars, spare shinestones, some drop/meso
stones) are still levelable but carry no cost or FD.

**Layout units** are a lattice scaled by `COL_W`/`ROW_H` on the canvas. Edges are drawn as
V-H-V elbows so a stone feeding several neighbours renders as one junction bar. Ultimate
(M1/M2), boost and shinestone slots unlock on conditions, so they have no edges.

**Icons** come from the `erda-skill` resource type with a per-class `outerId` folder
(18112 Erel, 18212 Sia), through `erdaLinkIconUrl`: the in-game `iconDisabled.png` until the
stone is activated, `icon.png` after (Origin/Ascent have no disabled art, so they dim instead).
Only Erel's folder has the full rush-stone set; Sia borrows Erel's generic stat art and uses its
own for LUK/INT/Magic ATT/Summon Duration. Sol Janus, Sol Hecate and Tree of Stars live under
Erel's folder for both classes. Fragment of Distorted Time uses Fruits of Mastery's boost icon,
as in game (not the item). Shinestones draw the slot art from `ui/erdalink/runestone`
(`erdaLinkShinestoneUrl`), a tier by level: 0 locked, 1 at levels 1-9, 2 at 10-14, 3 at
15-20; the core draws a glyph, and the locked slot under the core is not drawn at all (it only
anchors the line down to the DEX/LUK stone).
