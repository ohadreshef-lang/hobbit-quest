import type { Room } from '../engine/types';

/**
 * The opening slice of Middle-earth. This is a foundation, not the full
 * map — enough connected rooms to exercise movement, description, and the
 * scene panel. Extend by adding entries and wiring their `exits`.
 */
export const ROOMS: Record<string, Room> = {
  hall: {
    id: 'hall',
    name: 'A Comfortable Hall',
    description:
      'You are in a comfortable tunnel-like hall. To the east there is the round green door of Bag End. Smoke curls from a long-dead pipe on the mantel.',
    exits: { east: 'front-door', down: 'cellar' },
    art: 'hall',
  },
  cellar: {
    id: 'cellar',
    name: 'The Cellar',
    description:
      'A snug cellar lined with barrels of ale and shelves of provisions. A single lamp bracket juts from the wall. Stairs lead up.',
    exits: { up: 'hall' },
    art: 'cellar',
  },
  'front-door': {
    id: 'front-door',
    name: 'Bag End, Front Step',
    description:
      'You stand on the front step of Bag End. The round green door is behind you to the west. A gravel path winds down the hill to the north.',
    exits: { west: 'hall', north: 'road' },
    art: 'door',
  },
  road: {
    id: 'road',
    name: 'The Great East Road',
    description:
      'A dusty road runs east into the gathering dark. The lights of Hobbiton fall away behind you to the south. Ahead, the land grows wild.',
    exits: { south: 'front-door', east: 'trolls-clearing' },
    art: 'road',
  },
  'trolls-clearing': {
    id: 'trolls-clearing',
    name: 'A Clearing in the Woods',
    description:
      'The road opens into a clearing. The embers of a large fire glow at its centre, and the air smells of roast mutton. Something very large shifts in the shadows to the east.',
    exits: { west: 'road' },
    art: 'fire',
  },
};

export const STARTING_ROOM = 'hall';
