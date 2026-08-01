/**
 * Shared world types. Everything physical — rooms aside — is an Entity.
 * Characters are Entities with agency, not a privileged separate category
 * (spec §9). Keep this file free of behaviour; it is pure data shape.
 */

export type Direction =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'northeast'
  | 'northwest'
  | 'southeast'
  | 'southwest'
  | 'up'
  | 'down'
  | 'in'
  | 'out';

export const DIRECTIONS: readonly Direction[] = [
  'north', 'south', 'east', 'west',
  'northeast', 'northwest', 'southeast', 'southwest',
  'up', 'down', 'in', 'out',
];

/** Where an entity lives: a location id, another entity's id, or nowhere. */
export type Placement = string | null;

/** A physical thing. Containment is expressed via `locationId` (the parent). */
export interface Entity {
  id: string;
  /** Nouns the parser accepts for this thing (lowercase). */
  names: string[];
  /** Adjectives that distinguish it from similar things (lowercase). */
  adjectives: string[];
  /** Human-facing display name, e.g. "the brass lamp". */
  display: string;
  /** Parent: a room id, a container/actor entity id, or null (off-stage). */
  locationId: Placement;
  mass: number;
  volume: number;
  capacityMass?: number | undefined;
  capacityVolume?: number | undefined;
  strength?: number | undefined;
  solidity: number;
  durability: number;
  states: Set<EntityState>;
  capabilities: Set<Capability>;
  /** Entity id of the key that locks/unlocks this, if lockable. */
  keyId?: string | undefined;
  emitsLight?: number | undefined;
  scoreEventId?: string | undefined;
  /** Flag set when this entity is broken, tied to, or bridged (spec §13). */
  solveFlag?: string | undefined;
  /** Present only for living, acting entities. */
  agent?: Agent | undefined;
  /** Prose shown on EXAMINE. */
  description?: string | undefined;
}

export type EntityState =
  | 'open' | 'closed' | 'locked'
  | 'broken' | 'lit' | 'worn'
  | 'tied' | 'transparent' | 'opaque'
  | 'liquid' | 'edible' | 'alive' | 'dead'
  | 'fixed' | 'runic';

export type Capability =
  | 'takeable'    // can be picked up
  | 'container'   // can hold other entities
  | 'openable'    // open/close toggles
  | 'lockable'    // lock/unlock with keyId
  | 'wearable'    // can be worn
  | 'readable'    // has text to read
  | 'weapon'      // usable to attack
  | 'edible'      // can be eaten
  | 'breakable'   // can be smashed with a solid tool
  | 'anchor'      // a fixture a rope can be tied to
  | 'gap';        // an obstacle a solid object can bridge

/** Agency layered on top of an Entity (spec §11). */
export interface Agent {
  energy: number;
  aggression: number;
  courage: number;
  /** Feelings toward other entity ids; higher is friendlier. */
  loyalty: Record<string, number>;
  knowledge: Set<string>;
  /** Short reusable behaviour loop; index cycles each idle turn. */
  behavior: string[];
  behaviorIndex: number;
}

/** An exit that only opens once a world flag is set (spec §9 directed edges). */
export interface GatedExit {
  to: string;
  /** Flag that must be truthy to pass. */
  flag: string;
  /** Shown when the way is still blocked. */
  blocked: string;
}

/** A place. Locations form a directed graph; exits need not be symmetric. */
export interface Location {
  id: string;
  title: string;
  description: string;
  exits: Partial<Record<Direction, string>>;
  /** Exits gated behind a flag (a door to break, a ravine to bridge, …). */
  gatedExits?: Partial<Record<Direction, GatedExit>> | undefined;
  /** Ambient light 0..1. < LIGHT_THRESHOLD reads as dark. */
  ambientLight: number;
  /** Outdoor places go dark at night unless the player carries a light. */
  outdoor?: boolean | undefined;
  /** Optional key into the illustration table. */
  art?: string | undefined;
}

export type Mode = 'classic' | 'guided';

/** Length of a full day in turns; the back half is night. */
export const DAY_LENGTH = 10;

export const PLAYER_ID = 'player';
export const LIGHT_THRESHOLD = 0.3;

/** A line in the transcript. */
export interface LogLine {
  kind: 'title' | 'room' | 'command' | 'action' | 'event' | 'error' | 'system';
  text: string;
}

/** Full mutable game state (spec §15 save shape is derived from this). */
export interface GameState {
  locations: Record<string, Location>;
  entities: Record<string, Entity>;
  currentLocationId: string;
  turn: number;
  score: number;
  scoredEvents: Set<string>;
  flags: Record<string, boolean | number>;
  log: LogLine[];
  gameOver: boolean;
  /** 'win' | 'lose' once the tale ends; undefined while in play. */
  outcome?: 'win' | 'lose' | undefined;
  /** Seed the run was created with (recorded for replay). */
  rngSeed: number;
  /** Live generator state — mutated on each draw, saved verbatim. */
  rngState: number;
  /** Classic (fragile, terse) vs Guided (undo/hints/map). */
  mode: Mode;
  /** Turns since dawn, wrapping at DAY_LENGTH; back half is night. */
  timeOfDay: number;
  /** Locations the player has visited (for the Guided-mode map). */
  discovered: Set<string>;
  /** Parser reference memory (spec §8 reference resolution). */
  lastSingularId?: string | undefined;
  lastPluralIds?: string[] | undefined;
}
