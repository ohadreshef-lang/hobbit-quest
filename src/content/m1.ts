/**
 * Milestone 1 content pack — an ORIGINAL-WORLD scene (spec §3 clean-room:
 * no names, prose, or artwork from the 1982 game). One lit room furnished to
 * exercise every parser feature: two lamps and two keys (adjective
 * disambiguation), a locked chest + an open pack (containers, lock/unlock,
 * reveal-on-open), a wearable ring, a readable note, and one NPC to command.
 *
 * Content is data only; the engine holds no knowledge of these specifics.
 */
import type { Entity, GameState, Location } from '../world/types';
import { PLAYER_ID } from '../world/types';

type Caps = Entity['capabilities'] extends Set<infer C> ? C : never;

interface Spec {
  id: string;
  names: string[];
  adjectives?: string[];
  display: string;
  locationId: string | null;
  mass?: number;
  volume?: number;
  capacityMass?: number;
  solidity?: number;
  durability?: number;
  states?: Entity['states'] extends Set<infer S> ? S[] : never;
  capabilities?: Caps[];
  keyId?: string;
  emitsLight?: number;
  description?: string;
  agent?: Entity['agent'];
}

function make(s: Spec): Entity {
  return {
    id: s.id,
    names: s.names,
    adjectives: s.adjectives ?? [],
    display: s.display,
    locationId: s.locationId,
    mass: s.mass ?? 1,
    volume: s.volume ?? 1,
    capacityMass: s.capacityMass,
    solidity: s.solidity ?? 5,
    durability: s.durability ?? 5,
    states: new Set(s.states ?? []),
    capabilities: new Set(s.capabilities ?? []),
    keyId: s.keyId,
    emitsLight: s.emitsLight,
    description: s.description,
    agent: s.agent,
  };
}

const HALL: Location = {
  id: 'hall',
  title: 'A Comfortable Hall',
  description:
    'You stand in a snug, tunnel-like hall with a round door to the east. ' +
    'Lamplight and the smell of woodsmoke make it feel lived-in.',
  exits: {},
  ambientLight: 1,
  art: 'hall',
};

export function buildWorld(): GameState {
  const entities: Entity[] = [
    make({
      id: PLAYER_ID, names: ['me', 'self'], display: 'you',
      locationId: 'hall', mass: 60, capacityMass: 25,
      states: ['alive'],
    }),

    // Two lamps — "take lamp" is ambiguous; "take the brass lamp" is not.
    make({ id: 'brass-lamp', names: ['lamp', 'lantern'], adjectives: ['brass'], display: 'a brass lamp',
      locationId: 'hall', mass: 3, capabilities: ['takeable'], emitsLight: 3,
      description: 'A dented brass lamp with a little oil still sloshing inside.' }),
    make({ id: 'copper-lamp', names: ['lamp', 'lantern'], adjectives: ['copper'], display: 'a copper lamp',
      locationId: 'hall', mass: 3, capabilities: ['takeable'], emitsLight: 3,
      description: 'A slender copper lamp, its wick trimmed and ready.' }),

    // Two keys — the iron one opens the chest.
    make({ id: 'silver-key', names: ['key'], adjectives: ['silver', 'small'], display: 'a small silver key',
      locationId: 'hall', mass: 0.2, capabilities: ['takeable'],
      description: 'A small silver key. It fits no lock you have found.' }),
    make({ id: 'iron-key', names: ['key'], adjectives: ['iron', 'heavy'], display: 'a heavy iron key',
      locationId: 'hall', mass: 0.5, capabilities: ['takeable'],
      description: 'A heavy iron key, notched and old.' }),

    make({ id: 'rope', names: ['rope', 'coil'], adjectives: ['hempen'], display: 'a coil of rope',
      locationId: 'hall', mass: 2, capabilities: ['takeable'],
      description: 'A sturdy coil of hempen rope.' }),
    make({ id: 'staff', names: ['staff', 'stick'], adjectives: ['wooden', 'gnarled'], display: 'a gnarled staff',
      locationId: 'hall', mass: 4, solidity: 7, capabilities: ['takeable', 'weapon'],
      description: 'A gnarled walking staff, hard as oak.' }),
    make({ id: 'apple', names: ['apple'], adjectives: ['red'], display: 'a red apple',
      locationId: 'hall', mass: 0.3, capabilities: ['takeable', 'edible'], states: ['edible'],
      description: 'A crisp red apple.' }),
    make({ id: 'cloak', names: ['cloak', 'coat'], adjectives: ['woolen', 'grey'], display: 'a grey cloak',
      locationId: 'hall', mass: 2, capabilities: ['takeable', 'wearable'],
      description: 'A travel-worn grey cloak of thick wool.' }),

    // Containers.
    make({ id: 'chest', names: ['chest', 'box'], adjectives: ['oak'], display: 'an oak chest',
      locationId: 'hall', mass: 15, capacityMass: 20, solidity: 8, durability: 9,
      capabilities: ['container', 'openable', 'lockable'],
      states: ['closed', 'locked', 'opaque'], keyId: 'iron-key',
      description: 'A stout oak chest bound with iron.' }),
    make({ id: 'pack', names: ['pack', 'bag', 'satchel'], adjectives: ['leather'], display: 'a leather pack',
      locationId: 'hall', mass: 1, capacityMass: 8,
      capabilities: ['takeable', 'container', 'openable'], states: ['open'],
      description: 'A soft leather pack, its flap open.' }),

    // Contents.
    make({ id: 'ring', names: ['ring', 'band'], adjectives: ['plain', 'gold'], display: 'a plain gold ring',
      locationId: 'chest', mass: 0.1, capabilities: ['takeable', 'wearable'],
      description: 'A plain gold ring, warm to the touch.' }),
    make({ id: 'note', names: ['note', 'letter'], adjectives: ['folded'], display: 'a folded note',
      locationId: 'pack', mass: 0.1, capabilities: ['takeable', 'readable'],
      description: 'The note reads: "Take the iron key. What it opens is yours."' }),

    // The one NPC — carries a cup so you can command it around.
    make({ id: 'rowan', names: ['rowan', 'tinker', 'traveler'], adjectives: [], display: 'Rowan',
      locationId: 'hall', mass: 55, states: ['alive'],
      description: 'Rowan, a road-worn tinker with quick eyes and a crooked grin.',
      agent: {
        energy: 100, aggression: 10, courage: 50,
        loyalty: { [PLAYER_ID]: 5 }, knowledge: new Set(),
        behavior: ['speak', 'idle', 'idle'], behaviorIndex: 0,
      } }),
    make({ id: 'cup', names: ['cup', 'mug'], adjectives: ['tin'], display: 'a tin cup',
      locationId: 'rowan', mass: 0.4, capabilities: ['takeable'],
      description: 'A battered tin cup.' }),
  ];

  const byId: Record<string, Entity> = {};
  for (const e of entities) byId[e.id] = e;

  return {
    locations: { hall: HALL },
    entities: byId,
    currentLocationId: 'hall',
    turn: 0,
    score: 0,
    scoredEvents: new Set(),
    flags: {},
    log: [],
    gameOver: false,
    rngSeed: 0x0badf00d,
    rngState: 0x0badf00d,
  };
}
