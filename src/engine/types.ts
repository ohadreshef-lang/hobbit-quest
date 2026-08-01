/** The eight canonical movement directions of the original game. */
export type Direction =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'up'
  | 'down'
  | 'in'
  | 'out';

export const DIRECTIONS: readonly Direction[] = [
  'north',
  'south',
  'east',
  'west',
  'up',
  'down',
  'in',
  'out',
];

/** A location in the world. */
export interface Room {
  id: string;
  name: string;
  /** Prose shown when the player looks at / enters the room. */
  description: string;
  /** Sparse map of direction -> destination room id. */
  exits: Partial<Record<Direction, string>>;
  /** Optional key into an art/emoji table for the scene panel. */
  art?: string;
}

/** A thing the player can look at, take, drop or use. */
export interface Item {
  id: string;
  name: string;
  /** Extra words the parser should accept for this item. */
  aliases?: string[];
  description: string;
  /** Whether the item can be picked up. */
  portable: boolean;
  /**
   * Where the item starts. Either a room id, `INVENTORY`, or `NOWHERE`
   * (off-stage until some event places it).
   */
  location: string;
}

export const INVENTORY = 'inventory' as const;
export const NOWHERE = 'nowhere' as const;

/** A non-player character in the living-world simulation. */
export interface NPC {
  id: string;
  name: string;
  location: string;
  /** Whether the character is currently able to act. */
  alive: boolean;
}

/** The full mutable game state. Everything the engine reads or writes. */
export interface GameState {
  currentRoomId: string;
  rooms: Record<string, Room>;
  items: Record<string, Item>;
  npcs: Record<string, NPC>;
  /** Arbitrary named booleans/numbers driving story branches. */
  flags: Record<string, boolean | number>;
  turn: number;
  /** Rolling transcript the UI renders; newest last. */
  log: LogLine[];
  gameOver: boolean;
}

export interface LogLine {
  kind: 'room' | 'action' | 'event' | 'error' | 'system';
  text: string;
}

/** The result of running one command through the engine. */
export interface CommandResult {
  /** Lines to append to the transcript for this turn. */
  lines: LogLine[];
  /** Whether the command consumed a turn (and thus ticks the world). */
  tookTurn: boolean;
}
