/**
 * Milestone 5 content pack — THE FULL JOURNEY, an ORIGINAL-WORLD retelling
 * whose *plot beats* follow the classic there-and-back quest arc, told in
 * entirely original prose with original names (spec §3 clean-room: evoke the
 * story shape, never reproduce protected names, text, or artwork).
 *
 *   home(briefing) → lane → wild → troll-clearing → ford → haven(moon-runes)
 *   → high pass → goblin-tunnels(ring) → under-gate → dark-wood(spiders)
 *   → wood-elf halls → cellars(barrel escape) → lake-town(archer)
 *   → mountain-foot(thrush, secret door) → dragon's hall → …home → the chest
 *
 * Beats mapped to engine systems:
 * - a wizard and a dwarf-leader set the quest; the dwarf follows and fights
 *   at your side (secondary objective: keep him alive);
 * - trolls prowl by night and turn to stone at dawn (day/night);
 * - an elder reads the map's moon-runes by moonlight, opening the secret door;
 * - a ring found in the dark turns you invisible past goblins, a cave-thing,
 *   and spiders;
 * - captured by wood-elves, you escape by hiding in a river barrel;
 * - a thrush reveals the dragon's bare patch so the lake-town archer can fell
 *   it; then carry the hoard home and put it in the chest.
 *
 * Content is data only; the engine knows none of these specifics.
 */
import type { Entity, GameState, Location, LogLine } from '../world/types';
import { PLAYER_ID } from '../world/types';

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

const ally = (energy: number) =>
  ({ energy, aggression: 25, courage: 80, loyalty: { [PLAYER_ID]: 5 }, knowledge: new Set(['follow']), behavior: ['idle'], behaviorIndex: 0 });
const foe = (energy: number, aggression: number) =>
  ({ energy, aggression, courage: 50, loyalty: {}, knowledge: new Set<string>(), behavior: ['hunt'], behaviorIndex: 0 });

const LOCATIONS: Record<string, Location> = {
  home: { id: 'home', title: 'A Comfortable Hall', ambientLight: 1, art: 'hall',
    description: 'A snug, tunnel-like hall of round doors and warm hearths — your home, and the last quiet place for many a mile. A stout chest stands by the door. The lane runs east.',
    exits: { east: 'lane' } },
  lane: { id: 'lane', title: 'The Green Lane', ambientLight: 0.9, outdoor: true, art: 'road',
    description: 'A hedged lane leaving the tilled lands behind. Home is west; the wild rises east.',
    exits: { west: 'home', east: 'wild' } },
  wild: { id: 'wild', title: 'The Lone-lands', ambientLight: 0.8, outdoor: true, art: 'road',
    description: 'Empty moorland under a wide sky. A ring of firelight flickers east after dark.',
    exits: { west: 'lane', east: 'trolls' } },
  trolls: { id: 'trolls', title: "The Trolls' Fire", ambientLight: 0.6, outdoor: true, art: 'fire',
    description: 'A clearing round a rough fire, littered with gnawed bones. Great shapes move here after dark. A ford lies east.',
    exits: { west: 'wild', east: 'ford' } },
  ford: { id: 'ford', title: 'The Stony Ford', ambientLight: 0.85, outdoor: true, art: 'ford',
    description: 'A cold river over flat stones. Beyond the water, eastward, lamps glimmer in a hidden valley.',
    exits: { west: 'trolls', east: 'haven' } },
  haven: { id: 'haven', title: 'The Hidden Haven', ambientLight: 1, art: 'haven',
    description: 'A green vale of lamplit halls and falling water, safe under the stars — the last homely refuge before the mountains. The pass climbs east.',
    exits: { west: 'ford', east: 'pass' } },
  pass: { id: 'pass', title: 'The High Pass', ambientLight: 0.8, outdoor: true, art: 'pass',
    description: 'A cold saddle between grey peaks, loud with thunder. A cave-mouth gapes east.',
    exits: { west: 'haven', east: 'tunnels' } },
  tunnels: { id: 'tunnels', title: 'The Goblin-tunnels', ambientLight: 0, art: 'cellar',
    description: 'Black, winding tunnels that reek of goblin. Ways lead back west and down east.',
    exits: { west: 'pass', east: 'undergate' } },
  undergate: { id: 'undergate', title: 'The Under-gate', ambientLight: 0.5, art: 'cellar',
    description: 'A guttering gate on the mountains\' far side. West is dark; a black wood waits east.',
    exits: { west: 'tunnels', east: 'wood' } },
  wood: { id: 'wood', title: 'The Dark Wood', ambientLight: 0, outdoor: false, art: 'wood',
    description: 'A vast wood of black trunks and clinging web, where no daylight reaches. Paths lead west and east.',
    exits: { west: 'undergate', east: 'elfhalls' } },
  elfhalls: { id: 'elfhalls', title: 'The Wood-elf Halls', ambientLight: 1, art: 'haven',
    description: 'Torchlit caverns of the wood-elves, who took you for a spy. Guards bar every door. The wood is west; a stair goes down to the cellars.',
    exits: { west: 'wood', down: 'cellars' } },
  cellars: { id: 'cellars', title: 'The Cellars', ambientLight: 0.5, art: 'cellar',
    description: 'Cool cellars stacked with empty wine-barrels. A hatch in the floor lets the barrels out onto the river. Stairs climb up.',
    exits: { up: 'elfhalls' },
    gatedExits: { east: { to: 'laketown', flag: 'in-barrel', blocked: 'Every door is barred. Only the river-hatch, where the empty barrels tumble out, offers a way — if you could ride one. (try: hide in barrel)' } } },
  laketown: { id: 'laketown', title: 'The Lake-town', ambientLight: 0.9, outdoor: true, art: 'ford',
    description: 'A town on wooden piles upon a long grey lake, under the shadow of a lonely mountain. Cellars lie west; the mountain-foot east.',
    exits: { west: 'cellars', east: 'mountfoot' } },
  mountfoot: { id: 'mountfoot', title: 'The Mountain-foot', ambientLight: 0.8, outdoor: true, art: 'pass',
    description: 'A shoulder of bare rock beneath the lonely mountain. An old thrush sits on a grey stone. The town is west; a sheer cliff bars the east.',
    exits: { west: 'laketown' },
    gatedExits: { east: { to: 'lair', flag: 'map-read', blocked: 'A blank cliff-face. Only the map\'s moon-runes could show the hidden door.' } } },
  lair: { id: 'lair', title: "The Dragon's Hall", ambientLight: 0.4, art: 'fire',
    description: 'A vast hall heaped with gold, hot and reeking of smoke, where a great worm keeps its stolen hoard. The only way out is west.',
    exits: { west: 'mountfoot' } },
};

const INTRO: LogLine[] = [
  { kind: 'event', text: 'A grey-cloaked wanderer stoops at your round door and scratches a small secret mark upon it.' },
  { kind: 'event', text: 'By evening your hall is full of dwarves. Their leader lays a worn map on your table and taps it.' },
  { kind: 'action', text: '"Long ago a dragon drove our people from the mountain and took all our gold," he says. "We mean to win it back — and we need a burglar. You."' },
  { kind: 'action', text: '"The map shows a hidden door, and moon-runes only the right eyes can read. Go east, over the mountains, to the lonely mountain. Bring the hoard home — and put it where it belongs."' },
  { kind: 'event', text: 'The wanderer nods. "I will set you on the road, then go where I am needed. Keep the map close." Then the work begins.' },
  { kind: 'system', text: 'Type "help" for commands. Try: take map · take lamp · go east. (Try "mode guided" for undo, hints, and a map.)' },
];

export function buildWorld(): GameState {
  const entities: Entity[] = [
    make({ id: PLAYER_ID, names: ['me', 'self'], display: 'you', locationId: 'home',
      mass: 55, capacityMass: 30, states: ['alive'],
      agent: { energy: 100, aggression: 0, courage: 100, loyalty: {}, knowledge: new Set(), behavior: [], behaviorIndex: 0 } }),

    // The quest-givers.
    make({ id: 'wizard', names: ['wizard', 'wanderer', 'stranger'], adjectives: ['grey'], display: 'the grey wanderer',
      locationId: 'home', mass: 60, states: ['alive'],
      description: 'A tall wanderer in a grey cloak and a pointed hat, with eyes that miss nothing.',
      agent: { energy: 100, aggression: 0, courage: 100, loyalty: { [PLAYER_ID]: 5 }, knowledge: new Set(), behavior: ['idle', 'speak'], behaviorIndex: 0 } }),
    make({ id: 'dwarf', names: ['dwarf', 'leader', 'companion'], adjectives: ['stout'], display: 'the dwarf-leader',
      locationId: 'home', mass: 60, solidity: 6, strength: 6, states: ['alive'],
      description: 'A stout, grim dwarf with a forked beard and a heavy axe — leader of the company, and your comrade on the road.',
      agent: ally(120) }),

    // The starting kit.
    make({ id: 'map', names: ['map', 'chart'], adjectives: ['old', 'worn'], display: 'the old map',
      locationId: 'home', mass: 0.1, capabilities: ['takeable', 'readable'], states: ['runic'],
      description: 'An old map of the mountains, its margins crowded with faded marks.' }),
    make({ id: 'lamp', names: ['lamp', 'lantern'], adjectives: ['brass'], display: 'a brass lamp',
      locationId: 'home', mass: 2, emitsLight: 3, capabilities: ['takeable'],
      description: 'A brass lamp with oil enough for the deep places. It is not lit.' }),
    make({ id: 'staff', names: ['staff', 'stick', 'sword'], adjectives: ['stout'], display: 'a stout staff',
      locationId: 'home', mass: 4, solidity: 7, capabilities: ['takeable', 'weapon'],
      description: 'A stout staff, hard and heavy — a fair club at need.' }),
    make({ id: 'rope', names: ['rope', 'coil'], adjectives: ['hempen'], display: 'a coil of rope',
      locationId: 'home', mass: 2, capabilities: ['takeable'], description: 'A long, strong coil of rope.' }),
    make({ id: 'apple', names: ['apple', 'food'], adjectives: ['red'], display: 'a red apple',
      locationId: 'home', mass: 0.3, capabilities: ['takeable', 'edible'], states: ['edible'],
      description: 'A crisp red apple — a bite of strength.' }),
    make({ id: 'bread', names: ['bread', 'loaf', 'food'], adjectives: ['elven'], display: 'a loaf of waybread',
      locationId: 'haven', mass: 0.3, capabilities: ['takeable', 'edible'], states: ['edible'],
      description: 'A loaf of pale elven waybread — a little goes a long way.' }),
    make({ id: 'chest', names: ['chest', 'box'], adjectives: ['stout', 'wooden'], display: 'a stout chest',
      locationId: 'home', capacityMass: 100, solidity: 6, states: ['open'], capabilities: ['container', 'openable'],
      description: 'The family chest by the round door — a fit place for a hoard.' }),

    // Trolls by the fire (petrify at dawn).
    make({ id: 'troll', names: ['troll', 'ogre'], adjectives: ['huge'], display: 'a huge troll',
      locationId: 'trolls', mass: 500, solidity: 9, strength: 14, states: ['alive'],
      description: 'A huge, slow troll with arms like tree-trunks. It cannot abide the light of day.',
      agent: foe(80, 60) }),

    // The elder who reads the moon-runes.
    make({ id: 'sage', names: ['sage', 'elder', 'lord', 'host'], adjectives: ['elven'], display: 'the elven elder',
      locationId: 'haven', mass: 60, states: ['alive'],
      description: 'A fair, ageless elven elder, keeper of the haven and reader of hidden things.',
      agent: { energy: 100, aggression: 0, courage: 90, loyalty: { [PLAYER_ID]: 5 }, knowledge: new Set(['runes']), behavior: ['idle', 'speak'], behaviorIndex: 0 } }),

    // Goblins, the ring, and the pale thing in the dark.
    make({ id: 'goblin', names: ['goblin', 'orc'], adjectives: ['snarling'], display: 'a snarling goblin',
      locationId: 'undergate', mass: 40, solidity: 4, states: ['alive'],
      description: 'A snarling goblin with a rusty blade.', agent: foe(45, 60) }),
    make({ id: 'creature', names: ['creature', 'thing', 'gollum'], adjectives: ['pale', 'clammy'], display: 'a pale creature',
      locationId: 'tunnels', mass: 20, solidity: 3, states: ['alive'],
      description: 'A pale, clammy thing with cold lamp-like eyes, whispering to itself in the dark.',
      agent: foe(30, 55) }),
    make({ id: 'ring', names: ['ring', 'band'], adjectives: ['plain', 'gold'], display: 'a plain gold ring',
      locationId: 'tunnels', mass: 0.1, capabilities: ['takeable', 'wearable', 'invisibility'],
      description: 'A plain gold ring, oddly heavy — it seems to beg to be worn.' }),

    // Spiders in the dark wood.
    make({ id: 'spider', names: ['spider', 'thing'], adjectives: ['great', 'black'], display: 'a great black spider',
      locationId: 'wood', mass: 30, solidity: 4, states: ['alive'],
      description: 'A great black spider, big as a hound, dropping on a thread of cold silk.',
      agent: foe(35, 60) }),

    // The barrel out of the cellars.
    make({ id: 'barrel', names: ['barrel', 'cask', 'tub'], adjectives: ['empty', 'wooden'], display: 'an empty barrel',
      locationId: 'cellars', mass: 20, capacityMass: 80, states: ['open'], capabilities: ['container', 'openable'],
      description: 'A big empty wine-barrel by the river-hatch, just large enough to hide in.' }),

    // The lake-town archer and the black arrow.
    make({ id: 'archer', names: ['archer', 'bowman', 'guardian'], adjectives: ['grim'], display: 'a grim archer',
      locationId: 'laketown', mass: 60, states: ['alive'],
      description: 'A grim archer of the lake-town, keen-eyed, with a great black bow and one last black arrow.',
      agent: { energy: 100, aggression: 20, courage: 90, loyalty: { [PLAYER_ID]: 5 }, knowledge: new Set(), behavior: ['idle', 'speak'], behaviorIndex: 0 } }),
    make({ id: 'arrow', names: ['arrow', 'shaft'], adjectives: ['black'], display: 'a black arrow',
      locationId: 'archer', mass: 0.3, solidity: 6, capabilities: ['takeable'],
      description: 'A long black arrow, heirloom-forged, said never to miss.' }),

    // The thrush who knows the dragon's secret.
    make({ id: 'thrush', names: ['thrush', 'bird'], adjectives: ['old'], display: 'an old thrush',
      locationId: 'mountfoot', mass: 0.2, states: ['alive'],
      description: 'An old thrush with a knowing eye, hopping on a grey stone. It seems to be listening.',
      agent: { energy: 10, aggression: 0, courage: 20, loyalty: {}, knowledge: new Set(['weakspot']), behavior: ['idle'], behaviorIndex: 0 } }),

    // The dragon and its hoard.
    make({ id: 'dragon', names: ['dragon', 'worm', 'serpent', 'beast'], adjectives: ['great', 'red'], display: 'the great dragon',
      locationId: 'lair', mass: 4000, solidity: 12, durability: 20, strength: 40, states: ['alive'],
      description: 'A vast red dragon coiled on the gold, smoke curling from its nostrils. There is a bare patch on its left breast.',
      agent: foe(200, 85) }),
    make({ id: 'treasure', names: ['gold', 'treasure', 'hoard'], adjectives: ['glittering'], display: 'the glittering hoard-gold',
      locationId: 'lair', mass: 12, capabilities: ['takeable'],
      description: 'A king\'s ransom of ancient gold and gems — the dwarves\' stolen hoard.' }),
  ];

  const byId: Record<string, Entity> = {};
  for (const e of entities) byId[e.id] = e;

  const seed = 0x0b17b0;
  return {
    locations: LOCATIONS,
    entities: byId,
    currentLocationId: 'home',
    turn: 0, score: 0, scoredEvents: new Set(), flags: {}, log: [],
    gameOver: false, rngSeed: seed, rngState: seed,
    mode: 'classic', timeOfDay: 0, discovered: new Set(),
    victory: { itemId: 'treasure', containerId: 'chest' },
    intro: INTRO,
  };
}
