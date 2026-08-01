/**
 * Milestone 4 content pack — the COMPLETE WORLD and endgame, an
 * ORIGINAL-WORLD arc (spec §3 clean-room: no names, prose, or artwork from
 * the 1982 game). It extends the M3 region onward to the dragon's hoard and
 * home again:
 *
 *   …haven → eaves → tunnels(ring) → undergate → greatwood → elfhold →
 *   laketown(archer) → mountainfoot → [secret door] → lair(dragon, hoard)
 *
 * Endgame beats:
 * - a ring found in the dark tunnels turns its wearer INVISIBLE — the only
 *   safe way past the cave-creature and, later, the dragon;
 * - the mountain's SECRET DOOR opens only once the moon-runes have been read
 *   (the M3 `map-read` flag) — the payoff of the first journey;
 * - lifting the hoard WAKES the dragon; it flies to the lake-town, where an
 *   archer with the black arrow brings it down — off-screen if need be;
 * - the primary objective (spec §5): carry the hoard home and PUT IT IN THE
 *   CHEST at the start.
 *
 * Built by extending the M3 world, cloning its locations so the M3 pack is
 * never mutated. Content is data only.
 */
import type { Entity, GameState, Location } from '../world/types';
import { PLAYER_ID } from '../world/types';
import { buildWorld as buildM3 } from './m3';

type Caps = Entity['capabilities'] extends Set<infer C> ? C : never;
type St = Entity['states'] extends Set<infer S> ? S : never;

interface Spec {
  id: string; names: string[]; adjectives?: string[]; display: string;
  locationId: string | null; mass?: number; capacityMass?: number;
  solidity?: number; durability?: number; strength?: number;
  states?: St[]; capabilities?: Caps[]; emitsLight?: number; description?: string;
  agent?: Entity['agent'];
}

function make(s: Spec): Entity {
  return {
    id: s.id, names: s.names, adjectives: s.adjectives ?? [], display: s.display,
    locationId: s.locationId, mass: s.mass ?? 1, volume: 1,
    capacityMass: s.capacityMass, solidity: s.solidity ?? 5, durability: s.durability ?? 5,
    strength: s.strength, states: new Set(s.states ?? []), capabilities: new Set(s.capabilities ?? []),
    emitsLight: s.emitsLight, description: s.description, agent: s.agent,
  };
}

const NEW_LOCATIONS: Location[] = [
  { id: 'eaves', title: 'The Mountain Eaves', ambientLight: 0.8, outdoor: true, art: 'pass',
    description: 'Bare slopes at the roots of grey peaks. The haven lies west; a black cave-mouth gapes east.',
    exits: { west: 'haven', east: 'tunnels' } },
  { id: 'tunnels', title: 'The Under-tunnels', ambientLight: 0, art: 'cellar',
    description: 'A maze of lightless tunnels, wet and cold. Ways lead back west and deeper east.',
    exits: { west: 'eaves', east: 'undergate' } },
  { id: 'undergate', title: 'The Under-gate', ambientLight: 0.5, art: 'cellar',
    description: 'A broken gate where the tunnels open on the far side of the range. West is dark; east, a wood.',
    exits: { west: 'tunnels', east: 'greatwood' } },
  { id: 'greatwood', title: 'The Great Wood', ambientLight: 0.4, art: 'wood',
    description: 'An old wood of black trunks and heavy silence. The gate is west; a hall gleams east.',
    exits: { west: 'undergate', east: 'elfhold' } },
  { id: 'elfhold', title: 'The Forest Hall', ambientLight: 1, art: 'haven',
    description: 'A lamplit hall among the trees, its folk wary but not unkind. The wood is west; a lake lies east.',
    exits: { west: 'greatwood', east: 'laketown' } },
  { id: 'laketown', title: 'The Lake-town', ambientLight: 0.9, outdoor: true, art: 'ford',
    description: 'A town of wooden wharves on a long grey lake, under the shadow of a lonely mountain. The hall is west; the mountain-foot east.',
    exits: { west: 'elfhold', east: 'mountainfoot' } },
  { id: 'mountainfoot', title: 'The Mountain-foot', ambientLight: 0.8, outdoor: true, art: 'pass',
    description: 'A shoulder of bare rock beneath the lonely mountain. The town lies west. A sheer cliff bars the way east.',
    exits: { west: 'laketown' },
    gatedExits: { east: { to: 'lair', flag: 'map-read', blocked: 'A sheer cliff bars the way. The map\'s moon-runes told of a hidden door here — had you but read them.' } } },
  { id: 'lair', title: "The Dragon's Hall", ambientLight: 0.4, art: 'fire',
    description: 'A vast hall heaped with gold, hot and reeking of smoke. The only way out is back west.',
    exits: { west: 'mountainfoot' } },
];

export function buildWorld(): GameState {
  const state = buildM3();
  // Clone locations so we never mutate the shared M3 table.
  state.locations = structuredClone(state.locations);
  // Open the haven eastward into the mountains.
  state.locations['haven'].exits = { ...state.locations['haven'].exits, east: 'eaves' };
  for (const loc of NEW_LOCATIONS) state.locations[loc.id] = loc;

  const extras: Entity[] = [
    // The return-goal: a chest back home.
    make({ id: 'chest', names: ['chest', 'box'], adjectives: ['stout', 'wooden'], display: 'a stout wooden chest',
      locationId: 'hollow', capacityMass: 100, solidity: 6, states: ['open'],
      capabilities: ['container', 'openable'],
      description: 'The family chest by the round door — a fit place for a hoard.' }),

    // The ring in the dark.
    make({ id: 'ring', names: ['ring', 'band'], adjectives: ['plain', 'gold'], display: 'a plain gold ring',
      locationId: 'tunnels', mass: 0.1, capabilities: ['takeable', 'wearable', 'invisibility'],
      description: 'A plain gold ring, oddly heavy. It seems to beg to be worn.' }),
    make({ id: 'creature', names: ['creature', 'thing', 'gollum'], adjectives: ['pale', 'cave'], display: 'a pale cave-creature',
      locationId: 'tunnels', mass: 20, solidity: 3, states: ['alive'],
      description: 'A pale, clammy creature with lamp-like eyes, hunting by sound in the dark.',
      agent: { energy: 30, aggression: 55, courage: 30, loyalty: {}, knowledge: new Set(), behavior: ['hunt'], behaviorIndex: 0 } }),

    // The lake-town's archer and the one arrow that can kill the dragon.
    make({ id: 'archer', names: ['archer', 'bowman', 'guardian'], display: 'a grim archer',
      locationId: 'laketown', mass: 60, states: ['alive'],
      description: 'A grim archer of the lake-town, keen-eyed, with a great black bow.',
      agent: { energy: 100, aggression: 20, courage: 90, loyalty: { [PLAYER_ID]: 5 }, knowledge: new Set(), behavior: ['idle', 'speak'], behaviorIndex: 0 } }),
    make({ id: 'arrow', names: ['arrow', 'shaft', 'dart'], adjectives: ['black'], display: 'a black arrow',
      locationId: 'laketown', mass: 0.3, solidity: 6, capabilities: ['takeable'],
      description: 'A long black arrow, heirloom-forged — said to never miss its mark.' }),

    // The dragon and its hoard.
    make({ id: 'dragon', names: ['dragon', 'worm', 'serpent', 'beast'], adjectives: ['great', 'red'], display: 'the great dragon',
      locationId: 'lair', mass: 4000, solidity: 12, durability: 20, strength: 40, states: ['alive'],
      description: 'A vast red dragon coiled on the gold, smoke curling from its nostrils. There is a bare patch on its breast.',
      agent: { energy: 200, aggression: 85, courage: 100, loyalty: {}, knowledge: new Set(), behavior: ['hunt'], behaviorIndex: 0 } }),
    make({ id: 'treasure', names: ['gold', 'treasure', 'hoard'], adjectives: ['glittering'], display: 'the glittering hoard-gold',
      locationId: 'lair', mass: 12, capabilities: ['takeable'],
      description: 'A king\'s ransom of ancient gold and gems.' }),
  ];

  for (const e of extras) state.entities[e.id] = e;

  state.victory = { itemId: 'treasure', containerId: 'chest' };
  return state;
}
