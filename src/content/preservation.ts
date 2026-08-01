/**
 * Preservation name pack (spec §3). Overlays the historical character and
 * place NAMES onto the original-world M5 journey. Only proper nouns are
 * changed — every line of prose remains the project's own original writing;
 * no text or artwork from the book or the 1982 game is reproduced here.
 *
 * This pack is intended to be used only where the appropriate rights are held
 * (spec §3, §23). The clean-room original-world pack (content/m5.ts) is left
 * untouched and remains available as the default lawful option.
 */
import type { GameState, LogLine } from '../world/types';
import { buildWorld as buildOriginal } from './m5';

/** Entity id -> display name. */
const DISPLAY: Record<string, string> = {
  wizard: 'Gandalf',
  dwarf: 'Thorin',
  sage: 'Elrond',
  creature: 'Gollum',
  archer: 'Bard',
  dragon: 'Smaug',
  map: "Thrór's map",
  ring: 'the Ring',
};

/** Entity id -> names the parser should also accept (proper noun first). */
const ADD_NAMES: Record<string, string[]> = {
  player: ['bilbo'],
  wizard: ['gandalf'],
  dwarf: ['thorin'],
  sage: ['elrond'],
  creature: ['gollum'],
  archer: ['bard'],
  dragon: ['smaug'],
  map: ['thror'],
};

/** Location id -> title. */
const TITLES: Record<string, string> = {
  home: 'Bag End',
  lane: 'The Hill',
  wild: 'The Lone-lands',
  trolls: "The Trolls' Clearing",
  ford: 'The Ford of Bruinen',
  haven: 'Rivendell',
  pass: 'The High Pass',
  tunnels: 'Goblin-town',
  undergate: 'The Back Gate',
  wood: 'Mirkwood',
  elfhalls: "The Elvenking's Halls",
  cellars: "The Elvenking's Cellars",
  laketown: 'Lake-town',
  mountfoot: 'The Lonely Mountain',
  lair: "Smaug's Lair",
};

// Original briefing prose (this project's own wording), with the names filled in.
const INTRO: LogLine[] = [
  { kind: 'event', text: 'Gandalf the Grey stoops at your round green door and scratches a small secret mark upon it.' },
  { kind: 'event', text: 'By evening Bag End is full of dwarves. Their leader, Thorin, lays a worn map on your table and taps it.' },
  { kind: 'action', text: '"Long ago the dragon Smaug drove our people from the Lonely Mountain and took all our gold," he says. "We mean to win it back — and we need a burglar. You."' },
  { kind: 'action', text: '"The map shows a hidden door, and moon-runes only the right eyes can read. Go east, over the Misty Mountains, to the Lonely Mountain. Bring the hoard home — and put it where it belongs."' },
  { kind: 'event', text: 'Gandalf nods. "I will set you on the road, then go where I am needed. Keep the map close." Then the work begins.' },
  { kind: 'system', text: 'Type "help" for commands. Try: take map · take lamp · go east. (Try "mode guided" for undo, hints, and a map.)' },
];

export function buildWorld(): GameState {
  const s = buildOriginal();
  // Clone locations so the shared M5 table is never mutated.
  s.locations = structuredClone(s.locations);

  for (const [id, title] of Object.entries(TITLES)) {
    const loc = s.locations[id];
    if (loc) loc.title = title;
  }
  for (const [id, display] of Object.entries(DISPLAY)) {
    const e = s.entities[id];
    if (e) e.display = display;
  }
  for (const [id, names] of Object.entries(ADD_NAMES)) {
    const e = s.entities[id];
    if (e) e.names = [...names, ...e.names.filter((n) => !names.includes(n))];
  }
  s.intro = INTRO;
  return s;
}
