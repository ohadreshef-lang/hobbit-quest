import type { GameState, LogLine, NPC } from './types';
import { DIRECTIONS } from './types';

/**
 * The living-world tick. Every character that shares the player's location
 * gets a chance to do something of its own accord. This is intentionally a
 * small, deterministic-ish seed of the original's emergent behaviour —
 * expand each NPC's `act` as the world grows.
 */
export function tickWorld(state: GameState): LogLine[] {
  const lines: LogLine[] = [];

  for (const npc of Object.values(state.npcs)) {
    if (!npc.alive) continue;
    const line = act(npc, state);
    if (line) lines.push({ kind: 'event', text: line });
  }

  return lines;
}

function act(npc: NPC, state: GameState): string | null {
  // Characters only narrate when they're in the room with the player.
  if (npc.location !== state.currentRoomId) {
    wander(npc, state);
    return null;
  }

  switch (npc.id) {
    case 'thorin':
      return pick(state, [
        'Thorin sits down and starts singing about gold.',
        'Thorin says: "Now it is time for our esteemed burglar to do his job."',
        'Thorin gazes wistfully to the east, toward the mountain.',
      ]);
    case 'gandalf':
      return pick(state, [
        'Gandalf arrives and says he has business elsewhere.',
        'Gandalf mutters something about a ring and looks at you sharply.',
        'Gandalf lights his pipe and blows a smoke-ring that drifts east.',
      ]);
    default:
      return null;
  }
}

/** Idle NPCs drift between connected rooms so the world feels alive. */
function wander(npc: NPC, state: GameState): void {
  const room = state.rooms[npc.location];
  if (!room) return;
  const exits = DIRECTIONS.map((d) => room.exits[d]).filter(
    (id): id is string => Boolean(id),
  );
  if (exits.length === 0) return;
  // Deterministic drift keyed on turn count keeps behaviour reproducible
  // (and testable) without a random-number generator.
  const choice = exits[(state.turn + npc.id.length) % exits.length];
  npc.location = choice;
}

function pick(state: GameState, options: string[]): string {
  return options[state.turn % options.length];
}
