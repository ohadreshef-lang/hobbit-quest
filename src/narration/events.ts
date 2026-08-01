/**
 * Event narration templates. Kept apart from action logic so wording (and
 * later, localization) changes without touching rules (spec §14). Templates
 * take entities and produce grammatical prose for unplanned combinations.
 */
import type { Entity } from '../world/types';

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const name = (e: Entity): string => e.display;
export const Name = (e: Entity): string => cap(e.display);

export const took = (actor: Entity, obj: Entity): string =>
  `${Name(actor)} take${actor.id === 'player' ? '' : 's'} ${name(obj)}.`;

export const dropped = (actor: Entity, obj: Entity): string =>
  `${Name(actor)} drop${actor.id === 'player' ? '' : 's'} ${name(obj)}.`;

export const putIn = (actor: Entity, obj: Entity, container: Entity): string =>
  `${Name(actor)} put${actor.id === 'player' ? '' : 's'} ${name(obj)} in ${name(container)}.`;

export const opened = (actor: Entity, obj: Entity): string =>
  `${Name(actor)} open${actor.id === 'player' ? '' : 's'} ${name(obj)}.`;

export const closed = (actor: Entity, obj: Entity): string =>
  `${Name(actor)} close${actor.id === 'player' ? '' : 's'} ${name(obj)}.`;

export const gave = (actor: Entity, obj: Entity, recipient: Entity): string =>
  `${Name(actor)} give${actor.id === 'player' ? '' : 's'} ${name(obj)} to ${name(recipient)}.`;

export const wore = (actor: Entity, obj: Entity): string =>
  `${Name(actor)} put${actor.id === 'player' ? '' : 's'} on ${name(obj)}.`;

export const removed = (actor: Entity, obj: Entity): string =>
  `${Name(actor)} take${actor.id === 'player' ? '' : 's'} off ${name(obj)}.`;

export const refusal = (npc: Entity, why: string): string => `${Name(npc)} ${why}.`;
