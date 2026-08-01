import type { Direction } from './types';

/** A verb the engine knows how to execute. */
export type Verb =
  | 'go'
  | 'look'
  | 'examine'
  | 'take'
  | 'drop'
  | 'inventory'
  | 'help'
  | 'wait'
  | 'unknown';

export interface ParsedCommand {
  verb: Verb;
  /** Normalised object phrase, e.g. "brass lantern" -> "lantern". */
  noun: string | null;
  /** Set when the command resolves to movement. */
  direction: Direction | null;
  /** The raw text as typed, for echoing and error messages. */
  raw: string;
}

const DIRECTION_WORDS: Record<string, Direction> = {
  north: 'north',
  n: 'north',
  south: 'south',
  s: 'south',
  east: 'east',
  e: 'east',
  west: 'west',
  w: 'west',
  up: 'up',
  u: 'up',
  down: 'down',
  d: 'down',
  in: 'in',
  inside: 'in',
  out: 'out',
  outside: 'out',
};

const VERB_SYNONYMS: Record<string, Verb> = {
  go: 'go',
  walk: 'go',
  move: 'go',
  run: 'go',
  look: 'look',
  l: 'look',
  examine: 'examine',
  x: 'examine',
  inspect: 'examine',
  read: 'examine',
  take: 'take',
  get: 'take',
  grab: 'take',
  pick: 'take',
  drop: 'drop',
  leave: 'drop',
  inventory: 'inventory',
  i: 'inventory',
  inv: 'inventory',
  help: 'help',
  '?': 'help',
  wait: 'wait',
  z: 'wait',
};

/** Filler words the parser strips before matching. */
const NOISE = new Set(['the', 'a', 'an', 'at', 'to', 'my', 'up', 'with', 'on']);

/**
 * Turn a raw line of input into a structured command. The grammar is
 * deliberately forgiving: a bare direction ("west") means "go west", and
 * unknown verbs fall through to `unknown` for the engine to explain.
 */
export function parse(input: string): ParsedCommand {
  const raw = input.trim();
  const tokens = raw
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return { verb: 'unknown', noun: null, direction: null, raw };
  }

  // A lone direction word is an implicit "go".
  const firstAsDir = DIRECTION_WORDS[tokens[0]];
  if (firstAsDir && tokens.length === 1) {
    return { verb: 'go', noun: null, direction: firstAsDir, raw };
  }

  const verb = VERB_SYNONYMS[tokens[0]] ?? 'unknown';
  const rest = tokens.slice(1).filter((t) => !NOISE.has(t));

  if (verb === 'go') {
    const dir = rest.map((t) => DIRECTION_WORDS[t]).find(Boolean) ?? null;
    return { verb, noun: null, direction: dir, raw };
  }

  const noun = rest.length > 0 ? rest.join(' ') : null;
  return { verb, noun, direction: null, raw };
}
