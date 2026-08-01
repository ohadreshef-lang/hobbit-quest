/**
 * The Inglish vocabulary. Word tables are data, not code — a localization or
 * a different content pack swaps these without touching the parser (spec §8,
 * §18). Every synonym maps to a canonical token the grammar understands.
 */
import type { Direction } from '../world/types';

/** Direction words and abbreviations -> canonical Direction. */
export const DIRECTION_WORDS: Record<string, Direction> = {
  n: 'north', north: 'north',
  s: 'south', south: 'south',
  e: 'east', east: 'east',
  w: 'west', west: 'west',
  ne: 'northeast', northeast: 'northeast',
  nw: 'northwest', northwest: 'northwest',
  se: 'southeast', southeast: 'southeast',
  sw: 'southwest', southwest: 'southwest',
  u: 'up', up: 'up',
  d: 'down', down: 'down',
  in: 'in', out: 'out',
};

/** Verb synonyms -> canonical verb. */
export const VERBS: Record<string, string> = {
  take: 'take', get: 'take', grab: 'take', 'pick': 'take',
  drop: 'drop', discard: 'drop',
  put: 'put', place: 'put', insert: 'put',
  open: 'open',
  close: 'close', shut: 'close',
  lock: 'lock',
  unlock: 'unlock',
  examine: 'examine', x: 'examine', inspect: 'examine', describe: 'examine',
  look: 'look', l: 'look',
  read: 'read',
  wear: 'wear', don: 'wear',
  remove: 'remove', doff: 'remove',
  give: 'give', offer: 'give',
  eat: 'eat',
  say: 'say', tell: 'say', ask: 'say',
  go: 'go', walk: 'go', move: 'go',
  inventory: 'inventory', i: 'inventory', inv: 'inventory',
  wait: 'wait', z: 'wait',
  score: 'score',
  help: 'help',
};

/** Special/meta commands that bypass the world (still valid verbs above). */
export const META_VERBS = new Set(['look', 'inventory', 'wait', 'score', 'help']);

export const PREPOSITIONS = new Set([
  'at', 'from', 'in', 'into', 'inside', 'off', 'on', 'onto',
  'out', 'through', 'to', 'up', 'with',
]);

/** Prepositions that mean "into a container" for PUT. */
export const IN_PREPOSITIONS = new Set(['in', 'into', 'inside']);

export const ADVERBS = new Set([
  'carefully', 'quickly', 'slowly', 'softly', 'viciously', 'quietly',
]);

export const DETERMINERS = new Set(['the', 'a', 'an', 'some', 'my', 'your']);

export const QUANTIFIERS = new Set(['all', 'everything']);
export const EXCEPT_WORDS = new Set(['except', 'but']);

export const PRONOUNS = new Set(['it', 'them', 'they']);

/** Words that join clauses (outside quotes). */
export const CONJUNCTIONS = new Set(['and', 'then']);

/** "pick up" folds the trailing "up" into TAKE; "say to X" keeps its shape. */
export function isVerb(word: string): boolean {
  return word in VERBS;
}
