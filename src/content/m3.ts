/**
 * Milestone 3 content pack — the FIRST JOURNEY REGION, an ORIGINAL-WORLD
 * opening (spec §3 clean-room: no names, prose, or artwork from the 1982
 * game). Eight directed rooms carry the player from home to a hidden haven:
 *
 *   hollow → lane → ford → wildwood → stones(danger) → pass → haven
 *                                └→ dell (a side larder)
 *
 * Signature interactions:
 * - a RUNIC map whose hidden route only shows when read by someone who knows
 *   the runes, and only by MOONLIGHT — so day/night matters (spec §10, §13);
 * - outdoor rooms fall dark at night (carry a lit lamp to travel then);
 * - a prowling wolf in the stones — travel is not always safe.
 *
 * Content is data only; the engine knows none of these specifics.
 */
import type { Entity, GameState, Location } from '../world/types';
import { PLAYER_ID } from '../world/types';

type Caps = Entity['capabilities'] extends Set<infer C> ? C : never;
type St = Entity['states'] extends Set<infer S> ? S : never;

interface Spec {
  id: string; names: string[]; adjectives?: string[]; display: string;
  locationId: string | null; mass?: number; volume?: number; capacityMass?: number;
  solidity?: number; durability?: number; states?: St[]; capabilities?: Caps[];
  keyId?: string; emitsLight?: number; solveFlag?: string; description?: string;
  agent?: Entity['agent'];
}

function make(s: Spec): Entity {
  return {
    id: s.id, names: s.names, adjectives: s.adjectives ?? [], display: s.display,
    locationId: s.locationId, mass: s.mass ?? 1, volume: s.volume ?? 1,
    capacityMass: s.capacityMass, solidity: s.solidity ?? 5, durability: s.durability ?? 5,
    states: new Set(s.states ?? []), capabilities: new Set(s.capabilities ?? []),
    keyId: s.keyId, emitsLight: s.emitsLight, solveFlag: s.solveFlag,
    description: s.description, agent: s.agent,
  };
}

const LOCATIONS: Record<string, Location> = {
  hollow: {
    id: 'hollow', title: 'The Home Hollow', ambientLight: 1, art: 'hall',
    description: 'A warm burrow of a home, round-doored and snug. The lane runs east into the morning.',
    exits: { east: 'lane' },
  },
  lane: {
    id: 'lane', title: 'The Green Lane', ambientLight: 0.9, outdoor: true, art: 'road',
    description: 'A hedged green lane between tidy gardens. Home lies west; the land opens east toward a ford.',
    exits: { west: 'hollow', east: 'ford' },
  },
  ford: {
    id: 'ford', title: 'The Stony Ford', ambientLight: 0.85, outdoor: true, art: 'ford',
    description: 'A shallow river chatters over flat stones. The lane is west; a dark wood waits east.',
    exits: { west: 'lane', east: 'wildwood' },
  },
  wildwood: {
    id: 'wildwood', title: 'The Wildwood', ambientLight: 0.5, outdoor: true, art: 'wood',
    description: 'Close-grown trees swallow the light. Paths lead west to the ford, north to a dell, and east among stones.',
    exits: { west: 'ford', north: 'dell', east: 'stones' },
  },
  dell: {
    id: 'dell', title: 'A Sheltered Dell', ambientLight: 0.6, outdoor: true, art: 'wood',
    description: 'A green pocket in the wood, quiet and out of the wind. The wood lies back south.',
    exits: { south: 'wildwood' },
  },
  stones: {
    id: 'stones', title: 'The Hollow of Stones', ambientLight: 0.5, outdoor: true, art: 'wood',
    description: 'A boulder-strewn hollow where something has been feeding. The wood is west; a pass climbs east.',
    exits: { west: 'wildwood', east: 'pass' },
  },
  pass: {
    id: 'pass', title: 'The High Pass', ambientLight: 0.8, outdoor: true, art: 'pass',
    description: 'A cold saddle between grey peaks. The hollow falls away west; a cleft opens east.',
    exits: { west: 'stones', east: 'haven' },
  },
  haven: {
    id: 'haven', title: 'The Hidden Haven', ambientLight: 1, art: 'haven',
    description: 'A green vale of lamplit halls and falling water, safe under the stars. The pass lies back west.',
    exits: { west: 'pass' },
  },
};

export function buildWorld(): GameState {
  const entities: Entity[] = [
    make({ id: PLAYER_ID, names: ['me', 'self'], display: 'you', locationId: 'hollow',
      mass: 60, capacityMass: 30, states: ['alive'],
      agent: { energy: 100, aggression: 0, courage: 100, loyalty: {}, knowledge: new Set(), behavior: [], behaviorIndex: 0 } }),

    // The starting kit — the map matters most.
    make({ id: 'map', names: ['map', 'chart'], adjectives: ['old', 'worn'], display: 'an old map',
      locationId: 'hollow', mass: 0.1, capabilities: ['takeable', 'readable'], states: ['runic'],
      description: 'An old map of the wild lands east, its margins crowded with faded marks.' }),
    make({ id: 'lamp', names: ['lamp', 'lantern'], adjectives: ['brass'], display: 'a brass lamp',
      locationId: 'hollow', mass: 2, emitsLight: 3, capabilities: ['takeable'],
      description: 'A brass lamp with oil enough for the road. It is not lit.' }),
    make({ id: 'staff', names: ['staff', 'stick'], adjectives: ['gnarled', 'oak'], display: 'a gnarled staff',
      locationId: 'hollow', mass: 4, solidity: 7, capabilities: ['takeable', 'weapon'],
      description: 'A gnarled oak staff — a fair walking-stick and a fairer club.' }),
    make({ id: 'rope', names: ['rope', 'coil'], adjectives: ['hempen'], display: 'a coil of rope',
      locationId: 'hollow', mass: 2, capabilities: ['takeable'],
      description: 'A long coil of hempen rope.' }),

    // Food along the way.
    make({ id: 'apple', names: ['apple'], adjectives: ['red'], display: 'a red apple',
      locationId: 'hollow', mass: 0.3, capabilities: ['takeable', 'edible'], states: ['edible'],
      description: 'A crisp red apple.' }),
    make({ id: 'berries', names: ['berries', 'fruit'], adjectives: ['wild'], display: 'a handful of wild berries',
      locationId: 'dell', mass: 0.2, capabilities: ['takeable', 'edible'], states: ['edible'],
      description: 'Sweet dark berries, good for a hungry traveller.' }),

    // The danger in the stones.
    make({ id: 'wolf', names: ['wolf', 'beast'], adjectives: ['grey', 'prowling'], display: 'a prowling grey wolf',
      locationId: 'stones', mass: 45, solidity: 4, states: ['alive'],
      description: 'A lean grey wolf with hungry eyes.',
      agent: { energy: 40, aggression: 60, courage: 45, loyalty: {}, knowledge: new Set(), behavior: ['hunt', 'move'], behaviorIndex: 0 } }),

    // The sage who can read the moon-runes.
    make({ id: 'sage', names: ['sage', 'elder', 'host'], display: 'the grey sage',
      locationId: 'haven', mass: 60, states: ['alive'],
      description: 'A grey-cloaked elder with knowing eyes, keeper of the haven.',
      agent: { energy: 100, aggression: 0, courage: 80, loyalty: { [PLAYER_ID]: 5 }, knowledge: new Set(['runes']), behavior: ['idle', 'speak'], behaviorIndex: 0 } }),
  ];

  const byId: Record<string, Entity> = {};
  for (const e of entities) byId[e.id] = e;

  const seed = 0x51ede5;
  return {
    locations: LOCATIONS,
    entities: byId,
    currentLocationId: 'hollow',
    turn: 0, score: 0, scoredEvents: new Set(), flags: {}, log: [],
    gameOver: false, rngSeed: seed, rngState: seed,
    mode: 'classic', timeOfDay: 0, discovered: new Set(),
  };
}
