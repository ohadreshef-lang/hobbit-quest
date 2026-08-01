# The Hobbit — Quest

A modern web port of the classic 1982 Melbourne House text adventure,
*The Hobbit*. It keeps the soul of the original — a typed parser and a
living world where characters act on their own — while wrapping it in a
modern, touch-friendly UI shell.

> This is an original re-implementation inspired by the 1982 game. It ships
> none of the original's code, text, or artwork.

## Play style: hybrid

- **Type commands** the classic way: `go west`, `take rope`, `examine map`.
- **Or click** — exits, inventory items, and objects in the room are all
  interactive buttons that issue the same commands under the hood.

## Tech

- **Vite + TypeScript**, no runtime framework — the engine is plain,
  strongly-typed modules.
- **Vitest** for engine tests.
- Builds to a static site (`dist/`) deployable anywhere.

## Getting started

```bash
cd hobbit-quest
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
npm test           # run the engine test suite
```

## Architecture

The codebase follows the module layout of the rebuild spec: a deterministic,
rule-based parser feeding a shared action executor over an entity-component
world. **Characters are entities with agency, not a privileged category** —
player and NPC actions run through the *same* executor and the same physical
rules.

```
src/
  world/
    types.ts       entity-component data model (Entity, Agent, Location, GameState)
    entities.ts    containment, scope/visibility, light, mass, reachability
  parser/          # deterministic Inglish parser (no LLM in the command path)
    vocabulary.ts    verb/preposition/adverb/quantifier word tables (data)
    lexer.ts         tokenize; preserve quoted NPC speech
    grammar.ts       clause segmentation + noun-phrase parsing
    resolver.ts      bind phrases to entities: adjectives, IT/THEM, ALL/EXCEPT, ambiguity
  actions/
    executor.ts    one rule-checked executor for player AND NPC actions
  narration/
    describe.ts    location description assembly (text is authoritative)
    events.ts      event-narration templates
  content/
    m1.ts          declarative, original-world content pack (no 1982 text/art)
  engine/
    game.ts        parse -> resolve -> execute -> narrate + world tick + clarification
  ui/              # thin view + command history
  main.ts          # wiring
```

The **engine knows nothing about the content** — swap the `content/` pack and
the same parser and simulation play a different game (spec §3, §18).

## Status & roadmap

**Milestone 1 (parser playground) — done.** Every parser feature end to end:
adjectives, pronouns (`it`/`them`), `ALL`/`EXCEPT`, multi-command input,
ambiguity clarification, and `SAY TO <npc> "…"`.

**Milestone 2 (simulation vertical slice) — done.** A five-room journey
(`hall → slope → cave → [barred door] → dark tunnel → [ravine] → ledge`) with:

- **Darkness + light** — the tunnel is pitch dark; a lit lamp is required to
  see *or interact* there.
- **A breakable door** — forced open with a solid enough tool (durability vs
  solidity).
- **Combat + energy + food** — a goblin hunts you; `kill goblin with staff`,
  `eat apple` to recover, death is possible.
- **One obstacle, three valid solutions** — cross the ravine by tying the rope
  to the outcrop, laying the plank across, *or* a friendly companion's help.
  None is the "scripted" one; each is a physically valid world-state.
- **A living world** — the companion and the goblin act on their own,
  off-screen, and it persists.
- **Seeded RNG + save/restore** — deterministic: same seed + commands replay to
  an identical state hash, and a restored save reproduces the exact next random
  events.

**Milestone 3 (first journey region) — done.** An eight-room original-world
region — `hollow → lane → ford → wildwood → stones → pass → haven` (with a
side dell) — adding the story systems:

- **Day / night cycle** — time advances each turn; outdoor places fall dark at
  night, so travelling after dusk needs a carried, lit lamp.
- **The runic map** — a map whose hidden route only appears when read by
  someone who knows the runes, **and only by moonlight**: reach the haven,
  wait for night, then `say to sage "read map"`.
- **Score events** — progress rises in 2.5% steps on discoveries and key
  locations; `score` reports it.
- **New illustrations** — ford, wildwood, high pass, and the lamplit haven.
- **Classic vs Guided modes** — same simulation, different scaffolding.
  Guided unlocks `undo`, tiered `hint`, and a discovered-locations `map`;
  Classic refuses them and stays terse. `mode guided` / `mode classic`.

Backed by **42 tests** across the parser, physics, combat, determinism,
save-fidelity, day/night, map-reading, scoring, and the mode features.

Next milestones (from the rebuild spec §21):

- [ ] **M4** — the full world, endgame, and victory
- [ ] **M5** — emergence testing (10k seeded runs), accessibility, save migrations
```
