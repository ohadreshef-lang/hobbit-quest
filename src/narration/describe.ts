/**
 * Location description assembly (spec §14). Text is the authoritative view of
 * world state; the illustration is atmospheric only. Assembly order:
 * title, light, exits, loose entities, containers/contents, characters.
 */
import type { GameState, LogLine } from '../world/types';
import { DIRECTIONS } from '../world/types';
import {
  contentsOf, currentLocation, isLit, isOpen, visibleContents,
} from '../world/entities';
import { name } from './events';

export function describeLocation(state: GameState): LogLine[] {
  const loc = currentLocation(state);
  const lines: LogLine[] = [{ kind: 'title', text: loc.title }];

  if (!isLit(state)) {
    lines.push({ kind: 'room', text: 'It is pitch dark. You can see nothing.' });
    return lines;
  }

  lines.push({ kind: 'room', text: loc.description });

  const exits = DIRECTIONS.filter((d) => loc.exits[d]);
  if (exits.length) {
    lines.push({ kind: 'room', text: `Exits: ${exits.join(', ')}.` });
  }

  const here = contentsOf(state, loc.id);
  const things = here.filter((e) => !e.agent);
  const folk = here.filter((e) => e.agent);

  for (const t of things) {
    lines.push({ kind: 'room', text: `There is ${name(t)} here.` });
    if (t.capabilities.has('container') && isOpen(t)) {
      const inside = visibleContents(state, t);
      if (inside.length) {
        lines.push({ kind: 'room', text: `${cap(name(t))} holds ${inside.map(name).join(', ')}.` });
      }
    }
  }

  for (const f of folk) {
    const carried = contentsOf(state, f.id).filter((e) => !e.states.has('worn'));
    const carriesText = carried.length ? ` ${subjectPronoun(f)} is carrying ${carried.map(name).join(', ')}.` : '';
    lines.push({ kind: 'room', text: `${cap(name(f))} is here.${carriesText}` });
  }

  return lines;
}

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const subjectPronoun = (_e: { id: string }): string => 'They';
