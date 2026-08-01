import type { Item } from '../engine/types';
import { INVENTORY } from '../engine/types';

/**
 * The starting objects. `location` is a room id, `INVENTORY`, or `NOWHERE`.
 * Aliases let the parser accept natural phrasings ("light" for the lamp).
 */
export const ITEMS: Record<string, Item> = {
  map: {
    id: 'map',
    name: "Thror's map",
    aliases: ['map'],
    description:
      'A worn parchment map marked with a red rune. It shows a lonely mountain far to the east, and a side door into its roots.',
    portable: true,
    location: INVENTORY,
  },
  key: {
    id: 'key',
    name: 'a small silver key',
    aliases: ['key', 'silver key'],
    description: 'A small silver key, cold to the touch. It fits no lock you know of — yet.',
    portable: true,
    location: 'hall',
  },
  lamp: {
    id: 'lamp',
    name: 'a brass lamp',
    aliases: ['lamp', 'light', 'lantern'],
    description: 'A dented brass lamp. Give it a shake and it might still hold oil.',
    portable: true,
    location: 'cellar',
  },
  rope: {
    id: 'rope',
    name: 'a coil of rope',
    aliases: ['rope', 'coil'],
    description: 'A sturdy coil of elven rope, light and strong. Always useful.',
    portable: true,
    location: 'road',
  },
  sword: {
    id: 'sword',
    name: 'an old sword',
    aliases: ['sword', 'blade', 'sting'],
    description:
      'An old short-sword in a battered leather sheath. Its blade glimmers faintly blue near the clearing.',
    portable: true,
    location: 'trolls-clearing',
  },
};
