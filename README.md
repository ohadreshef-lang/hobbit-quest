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

**Milestone 1 (parser playground) — done.** One lit room, an original-world
cast of objects, two containers, and one commandable NPC, exercising every
parser feature end to end: adjectives, pronouns (`it`/`them`), `ALL`/`EXCEPT`,
multi-command input, ambiguity clarification, and `SAY TO <npc> "…"`. Backed
by 20 parser + physics tests.

Next milestones (from the rebuild spec §21):

- [ ] **M2** — simulation vertical slice: 5 rooms, darkness+light, rope/breakage,
      food/energy, combat, one autonomous companion + one enemy, save/restore,
      deterministic seeded replay, one obstacle with three valid solutions
- [ ] **M3** — first journey region, day/night, score events, illustrations,
      Classic vs Guided modes
- [ ] **M4** — the full world, endgame, and victory
- [ ] **M5** — emergence testing (10k seeded runs), accessibility, save migrations
```
