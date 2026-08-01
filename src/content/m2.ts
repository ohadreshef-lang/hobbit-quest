/**
 * Milestone 2 content pack — an ORIGINAL-WORLD vertical slice (spec §3
 * clean-room: no names, prose, or artwork from the 1982 game). Five directed
 * rooms exercising the whole simulation:
 *
 *   hall → slope → cave → [barred door] → dark tunnel → [ravine] → ledge
 *
 * - the tunnel is pitch dark; a lit lamp is required to see or act there;
 * - the barred door must be broken with something solid (durability vs solidity);
 * - a goblin hunts in the tunnel — combat, energy, and food matter;
 * - the ravine is ONE obstacle with THREE valid crossings: tie the rope to the
 *   stump, lay the plank across, or have a friendly companion help you over.
 *
 * Content is data only; the engine knows none of these specifics.
 */
import type { Entity, GameState, Location } from '../world/types';
import { PLAYER_ID } from '../world/types';

type Caps = Entity['capabilities'] extends Set<infer C> ? C : never;
type St = Entity['states'] extends Set<infer S> ? S : never;

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
  states?: St[];
  capabilities?: Caps[];
  keyId?: string;
  emitsLight?: number;
  solveFlag?: string;
  description?: string;
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
  hall: {
    id: 'hall', title: 'A Comfortable Hall', ambientLight: 1, art: 'hall',
    description: 'A snug, tunnel-like hall. A round door opens east onto a green slope.',
    exits: { east: 'slope' },
  },
  slope: {
    id: 'slope', title: 'The Green Slope', ambientLight: 0.9, art: 'road',
    description: 'A grassy slope falls away eastward toward a dark hillside cave. The hall lies west.',
    exits: { west: 'hall', east: 'cave' },
  },
  cave: {
    id: 'cave', title: 'The Cave Mouth', ambientLight: 0.5, art: 'cellar',
    description: 'A cold cave mouth. A heavy barred door blocks a stair leading down; the slope is west.',
    exits: { west: 'slope' },
    gatedExits: {
      down: { to: 'tunnel', flag: 'door-broken', blocked: 'The barred door blocks the stair down. It is stout, but not unbreakable.' },
    },
  },
  tunnel: {
    id: 'tunnel', title: 'A Dark Tunnel', ambientLight: 0, art: 'fire',
    description: 'A low tunnel of damp stone. A ravine splits the floor to the east; the stair climbs up.',
    exits: { up: 'cave' },
    gatedExits: {
      east: { to: 'ledge', flag: 'ravine-bridged', blocked: 'A deep ravine splits the passage. You need a way across.' },
    },
  },
  ledge: {
    id: 'ledge', title: 'The Treasure Ledge', ambientLight: 0.6, art: 'door',
    description: 'A narrow ledge beyond the ravine. Something glints in a crack in the rock. The tunnel is back west.',
    exits: { west: 'tunnel' },
  },
};

export function buildWorld(): GameState {
  const entities: Entity[] = [
    make({ id: PLAYER_ID, names: ['me', 'self'], display: 'you', locationId: 'hall',
      mass: 60, capacityMass: 30, states: ['alive'],
      agent: { energy: 100, aggression: 0, courage: 100, loyalty: {}, knowledge: new Set(), behavior: [], behaviorIndex: 0 } }),

    // Hall — the starting kit.
    make({ id: 'lamp', names: ['lamp', 'lantern'], adjectives: ['brass'], display: 'a brass lamp',
      locationId: 'hall', mass: 2, emitsLight: 3, capabilities: ['takeable'],
      description: 'A brass lamp, oil sloshing inside. It is not lit.' }),
    make({ id: 'staff', names: ['staff', 'stick'], adjectives: ['gnarled', 'oak'], display: 'a gnarled staff',
      locationId: 'hall', mass: 4, solidity: 7, capabilities: ['takeable', 'weapon'],
      description: 'A gnarled oak staff, hard and heavy — a fair club.' }),
    make({ id: 'rope', names: ['rope', 'coil'], adjectives: ['hempen'], display: 'a coil of rope',
      locationId: 'hall', mass: 2, capabilities: ['takeable'],
      description: 'A long, strong coil of hempen rope.' }),
    make({ id: 'apple', names: ['apple'], adjectives: ['red'], display: 'a red apple',
      locationId: 'hall', mass: 0.3, capabilities: ['takeable', 'edible'], states: ['edible'],
      description: 'A crisp red apple — a bite of strength.' }),

    // Slope — the companion and the plank.
    make({ id: 'plank', names: ['plank', 'board'], adjectives: ['long', 'wooden'], display: 'a long plank',
      locationId: 'slope', mass: 6, solidity: 6, capabilities: ['takeable'],
      description: 'A long, solid plank — long enough to span a gap.' }),
    make({ id: 'rowan', names: ['rowan', 'tinker', 'companion'], display: 'Rowan',
      locationId: 'slope', mass: 55, states: ['alive'],
      description: 'Rowan, a strong, road-worn tinker and a loyal friend.',
      agent: { energy: 100, aggression: 10, courage: 60, loyalty: { [PLAYER_ID]: 5 }, knowledge: new Set(), behavior: ['move', 'idle', 'speak'], behaviorIndex: 0 } }),

    // Cave — the barred door.
    make({ id: 'door', names: ['door', 'gate'], adjectives: ['barred', 'heavy'], display: 'the barred door',
      locationId: 'cave', mass: 40, solidity: 8, durability: 6,
      capabilities: ['breakable'], states: ['closed', 'fixed'], solveFlag: 'door-broken',
      description: 'A heavy door barred with old iron. Stout — but a strong blow could shatter it.' }),

    // Tunnel — darkness, an enemy, food, and the ravine's near side.
    make({ id: 'goblin', names: ['goblin', 'creature'], adjectives: ['snarling'], display: 'a snarling goblin',
      locationId: 'tunnel', mass: 40, solidity: 4, states: ['alive'],
      description: 'A snarling goblin with a rusty knife and worse manners.',
      agent: { energy: 45, aggression: 65, courage: 40, loyalty: {}, knowledge: new Set(), behavior: ['hunt', 'hunt'], behaviorIndex: 0 } }),
    make({ id: 'mushroom', names: ['mushroom', 'fungus'], adjectives: ['pale'], display: 'a pale mushroom',
      locationId: 'tunnel', mass: 0.2, capabilities: ['takeable', 'edible'], states: ['edible'],
      description: 'A pale cave mushroom. Edible, if you are hungry enough.' }),
    make({ id: 'stump', names: ['stump', 'rock', 'outcrop'], adjectives: ['stone'], display: 'a stone outcrop',
      locationId: 'tunnel', mass: 400, capabilities: ['anchor'], states: ['fixed'], solveFlag: 'ravine-bridged',
      description: 'A jutting stone outcrop at the ravine’s edge — solid enough to anchor a rope.' }),
    make({ id: 'ravine', names: ['ravine', 'gap', 'chasm'], adjectives: ['deep'], display: 'the ravine',
      locationId: 'tunnel', mass: 0, solidity: 0, capabilities: ['gap'], states: ['fixed'], solveFlag: 'ravine-bridged',
      description: 'A deep ravine, too wide to leap. You would need a bridge, a rope, or a helping hand.' }),

    // Ledge — the prize.
    make({ id: 'treasure', names: ['gold', 'treasure', 'hoard'], adjectives: ['glittering'], display: 'the glittering hoard-gold',
      locationId: 'ledge', mass: 8, capabilities: ['takeable'],
      description: 'A glittering hoard of ancient gold, wedged in the rock.' }),
  ];

  const byId: Record<string, Entity> = {};
  for (const e of entities) byId[e.id] = e;

  const seed = 0x1a2b3c4d;
  return {
    locations: LOCATIONS,
    entities: byId,
    currentLocationId: 'hall',
    turn: 0, score: 0, scoredEvents: new Set(), flags: {}, log: [],
    gameOver: false, rngSeed: seed, rngState: seed,
    mode: 'classic', timeOfDay: 0, discovered: new Set(),
  };
}
