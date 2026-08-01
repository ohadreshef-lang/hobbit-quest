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

```
src/
  engine/        # world-agnostic game engine
    types.ts       core data model (Room, Item, NPC, GameState)
    parser.ts      forgiving verb/noun/direction parser
    engine.ts      command dispatch + turn loop
    simulation.ts  the living-world tick (NPCs act each turn)
  world/         # the content: what makes THIS game The Hobbit
    rooms.ts       the map
    items.ts       objects
    npcs.ts        characters
  ui/            # DOM rendering + the hybrid interactions
    render.ts      full re-render after each turn
    art.ts         scene-art table (emoji placeholders for now)
  main.ts        # wiring: form input + click intents -> engine -> render
  styles.css     # parchment theme, light/dark aware
```

The **engine knows nothing about The Hobbit** — swap the `world/` data and
it plays a different game. That separation is deliberate.

## Status & roadmap

This is the initial scaffold: a small, fully-playable slice (Bag End out to
the trolls' clearing) that exercises every system end to end. Next up:

- [ ] Flesh out the full map and objects from the original quest
- [ ] Deepen the NPC simulation (goals, combat, the "burglar" mechanic)
- [ ] Real scene art in place of emoji placeholders
- [ ] Save/restore, and an autosave to `localStorage`
- [ ] Win/lose conditions and the Lonely Mountain endgame
```
