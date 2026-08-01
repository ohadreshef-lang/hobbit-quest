/**
 * Save / restore (spec §15). The whole GameState — including the RNG state —
 * round-trips, so a restored game reproduces the exact next random event.
 * Sets are encoded so JSON can carry them losslessly.
 */
import type { GameState } from '../world/types';

interface SetBox { __set: unknown[] }

export function serialize(state: GameState): string {
  return JSON.stringify(state, (_k, v) =>
    v instanceof Set ? ({ __set: [...v] } as SetBox) : v,
  );
}

export function deserialize(json: string): GameState {
  return JSON.parse(json, (_k, v) => {
    if (v && typeof v === 'object' && Array.isArray((v as SetBox).__set)) {
      return new Set((v as SetBox).__set);
    }
    return v;
  }) as GameState;
}

/**
 * A stable hash of the simulation-relevant state (ignores the transcript).
 * Two runs with the same seed and command log must produce equal hashes
 * (spec §20 acceptance #8).
 */
export function hashState(state: GameState): string {
  const canonical = {
    loc: state.currentLocationId,
    turn: state.turn,
    score: state.score,
    rng: state.rngState,
    time: state.timeOfDay,
    mode: state.mode,
    outcome: state.outcome ?? null,
    flags: Object.keys(state.flags).sort().map((k) => [k, state.flags[k]]),
    entities: Object.keys(state.entities).sort().map((id) => {
      const e = state.entities[id];
      return [
        id,
        e.locationId,
        [...e.states].sort().join(','),
        e.agent ? e.agent.energy : null,
        e.agent ? e.agent.behaviorIndex : null,
      ];
    }),
  };
  return djb2(JSON.stringify(canonical));
}

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}
