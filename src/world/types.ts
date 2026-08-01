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
  | 'fixed';

export type Capability =
  | 'takeable'    // can be picked up
  | 'container'   // can hold other entities
  | 'openable'    // open/close toggles
  | 'lockable'    // lock/unlock with keyId
  | 'wearable'    // can be worn
  | 'readable'    // has text to read
  | 'weapon'      // usable to attack
  | 'edible';     // can be eaten

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

/** A place. Locations form a directed graph; exits need not be symmetric. */
export interface Location {
  id: string;
  title: string;
  description: string;
  exits: Partial<Record<Direction, string>>;
  /** Ambient light 0..1. < LIGHT_THRESHOLD reads as dark. */
  ambientLight: number;
  /** Optional key into the illustration table. */
  art?: string;
}

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
  /** Parser reference memory (spec §8 reference resolution). */
  lastSingularId?: string | undefined;
  lastPluralIds?: string[] | undefined;
}
