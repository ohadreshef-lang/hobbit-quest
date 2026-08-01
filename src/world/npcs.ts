import type { NPC } from '../engine/types';

/**
 * The characters who share the world. In the 1982 original these acted on
 * their own each turn ("Thorin sits down and starts singing about gold").
 * This is the seed set; their behaviour lives in the simulation module.
 */
export const NPCS: Record<string, NPC> = {
  thorin: {
    id: 'thorin',
    name: 'Thorin',
    location: 'hall',
    alive: true,
  },
  gandalf: {
    id: 'gandalf',
    name: 'Gandalf',
    location: 'hall',
    alive: true,
  },
};
