/**
 * Deterministic PRNG (mulberry32). The generator's whole state is a single
 * integer that lives in GameState and is saved verbatim, so a restored save
 * reproduces the exact next random event (spec §10, §15, §20). No use of
 * Math.random anywhere in the simulation.
 */
import type { GameState } from './types';

/** Advance the generator and return a float in [0, 1). Mutates state.rngState. */
export function nextFloat(state: GameState): number {
  state.rngState = (state.rngState + 0x6d2b79f5) | 0;
  let t = state.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Inclusive integer in [min, max]. */
export function randInt(state: GameState, min: number, max: number): number {
  return min + Math.floor(nextFloat(state) * (max - min + 1));
}

/** True with probability p. */
export function chance(state: GameState, p: number): boolean {
  return nextFloat(state) < p;
}
