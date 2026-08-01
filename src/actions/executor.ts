/**
 * The shared action executor. Player actions and NPC actions enter here
 * through the SAME SemanticAction contract and are validated against the same
 * physical rules (spec §6, §11, §18). No verb-specific logic lives in the
 * parser; no parsing lives here.
 */
import type { Entity, GameState, LogLine } from '../world/types';
import { PLAYER_ID } from '../world/types';
import {
  carriedBy, contentsOf, currentLocation, entity, isNight, isOpen, isReachable, totalMass,
} from '../world/entities';
import * as ev from '../narration/events';

export interface ActionResult {
  success: boolean;
  turnsConsumed: number;
  lines: LogLine[];
  failureCode?: string;
}

const line = (kind: LogLine['kind'], text: string): LogLine => ({ kind, text });
const ok = (text: string, turns = 1): ActionResult =>
  ({ success: true, turnsConsumed: turns, lines: [line('action', text)] });
const fail = (code: string, text: string): ActionResult =>
  ({ success: false, turnsConsumed: 0, lines: [line('error', text)], failureCode: code });

function capacityLeft(state: GameState, actor: Entity): number {
  if (actor.capacityMass === undefined) return Infinity;
  const carried = contentsOf(state, actor.id).reduce((s, e) => s + totalMass(state, e.id), 0);
  return actor.capacityMass - carried;
}

export function execute(state: GameState, action: import('../parser').SemanticAction): ActionResult {
  const actor = entity(state, action.actorId);
  if (!actor) return fail('no-actor', 'Nothing happens.');

  switch (action.verb) {
    case 'take': return doTake(state, actor, action.directObjectIds);
    case 'drop': return doDrop(state, actor, action.directObjectIds);
    case 'put': return doPut(state, actor, action);
    case 'open': return doOpenClose(state, actor, action.directObjectIds[0], true);
    case 'close': return doOpenClose(state, actor, action.directObjectIds[0], false);
    case 'lock': return doLock(state, actor, action.directObjectIds[0], true);
    case 'unlock': return doLock(state, actor, action.directObjectIds[0], false);
    case 'examine': return doExamine(state, action.directObjectIds[0]);
    case 'read': return doRead(state, actor, action.directObjectIds[0]);
    case 'wear': return doWear(state, actor, action.directObjectIds[0]);
    case 'remove': return doRemove(state, actor, action.directObjectIds[0]);
    case 'give': return doGive(state, actor, action);
    case 'eat': return doEat(state, actor, action.directObjectIds[0]);
    case 'light': return doLight(state, actor, action.directObjectIds[0], true);
    case 'extinguish': return doLight(state, actor, action.directObjectIds[0], false);
    case 'break': return doBreak(state, actor, action);
    case 'tie': return doTie(state, actor, action);
    default:
      return fail('cant', `You can't do that here.`);
  }
}

function doTake(state: GameState, actor: Entity, ids: string[]): ActionResult {
  const lines: LogLine[] = [];
  let any = false;
  for (const id of ids) {
    const e = entity(state, id);
    if (!e) continue;
    if (e.locationId === actor.id) { lines.push(line('error', `${ev.Name(actor)} already ${actor.id === PLAYER_ID ? 'have' : 'has'} ${ev.name(e)}.`)); continue; }
    if (!e.capabilities.has('takeable') || e.states.has('fixed')) {
      lines.push(line('error', `${ev.Name(e)} can't be taken.`)); continue;
    }
    if (!isReachable(state, id)) { lines.push(line('error', `You can't reach ${ev.name(e)}.`)); continue; }
    if (totalMass(state, id) > capacityLeft(state, actor)) {
      lines.push(line('error', `${ev.Name(e)} is too heavy to carry.`)); continue;
    }
    e.locationId = actor.id;
    lines.push(line('action', ev.took(actor, e)));
    any = true;
  }
  return { success: any, turnsConsumed: any ? 1 : 0, lines };
}

function doDrop(state: GameState, actor: Entity, ids: string[]): ActionResult {
  const lines: LogLine[] = [];
  let any = false;
  for (const id of ids) {
    const e = entity(state, id);
    if (!e) continue;
    if (e.locationId !== actor.id) { lines.push(line('error', `${ev.Name(actor)} ${actor.id === PLAYER_ID ? "aren't" : "isn't"} carrying ${ev.name(e)}.`)); continue; }
    e.states.delete('worn');
    e.locationId = state.currentLocationId;
    lines.push(line('action', ev.dropped(actor, e)));
    any = true;
  }
  return { success: any, turnsConsumed: any ? 1 : 0, lines };
}

function doPut(state: GameState, actor: Entity, action: import('../parser').SemanticAction): ActionResult {
  // "put plank across ravine" — bridge a gap with a solid object (spec §13).
  if (action.preposition === 'across') {
    const gap = entity(state, action.indirectObjectId ?? '');
    if (!gap || !gap.capabilities.has('gap')) return fail('no-gap', 'There is nothing to bridge here.');
    const span = entity(state, action.directObjectIds[0] ?? '');
    if (!span) return fail('missing-object', 'Lay what across it?');
    if (span.locationId !== actor.id && !isReachable(state, span.id)) return fail('not-held', `You don't have ${ev.name(span)}.`);
    if (span.solidity < 5) return fail('too-flimsy', `${ev.Name(span)} is too flimsy to bear your weight.`);
    span.locationId = gap.id;
    if (gap.solveFlag) state.flags[gap.solveFlag] = true;
    return ok(`You lay ${ev.name(span)} across ${ev.name(gap)}, making a rough bridge.`);
  }

  const container = entity(state, action.indirectObjectId ?? '');
  if (!container) return fail('missing-container', 'Put it in what?');
  if (!container.capabilities.has('container')) return fail('not-container', `${ev.Name(container)} can't hold things.`);
  if (container.capabilities.has('openable') && !isOpen(container)) return fail('closed', `${ev.Name(container)} is closed.`);

  const lines: LogLine[] = [];
  let any = false;
  for (const id of action.directObjectIds) {
    const e = entity(state, id);
    if (!e || e.id === container.id) continue;
    if (e.locationId !== actor.id && !isReachable(state, id)) {
      lines.push(line('error', `You aren't holding ${ev.name(e)}.`)); continue;
    }
    const room = container.capacityMass === undefined ? Infinity
      : container.capacityMass - contentsOf(state, container.id).reduce((s, c) => s + totalMass(state, c.id), 0);
    if (totalMass(state, id) > room) { lines.push(line('error', `${ev.Name(e)} won't fit in ${ev.name(container)}.`)); continue; }
    e.locationId = container.id;
    lines.push(line('action', ev.putIn(actor, e, container)));
    any = true;
  }
  return { success: any, turnsConsumed: any ? 1 : 0, lines };
}

function doOpenClose(state: GameState, actor: Entity, id: string | undefined, open: boolean): ActionResult {
  const e = entity(state, id ?? '');
  if (!e) return fail('missing-object', `${open ? 'Open' : 'Close'} what?`);
  if (!e.capabilities.has('openable')) return fail('not-openable', `${ev.Name(e)} can't be ${open ? 'opened' : 'closed'}.`);
  if (open && e.states.has('locked')) return fail('locked', `${ev.Name(e)} is locked.`);
  if (open && e.states.has('open')) return fail('already', `${ev.Name(e)} is already open.`);
  if (!open && !e.states.has('open')) return fail('already', `${ev.Name(e)} is already closed.`);
  if (open) { e.states.add('open'); e.states.delete('closed'); } else { e.states.delete('open'); e.states.add('closed'); }
  const result = open ? ev.opened(actor, e) : ev.closed(actor, e);
  const lines = [line('action', result)];
  if (open) {
    const inside = contentsOf(state, e.id);
    if (inside.length) lines.push(line('action', `Inside ${ev.name(e)} ${inside.length === 1 ? 'is' : 'are'} ${inside.map(ev.name).join(', ')}.`));
  }
  return { success: true, turnsConsumed: 1, lines };
}

function doLock(state: GameState, actor: Entity, id: string | undefined, lock: boolean): ActionResult {
  const e = entity(state, id ?? '');
  if (!e) return fail('missing-object', `${lock ? 'Lock' : 'Unlock'} what?`);
  if (!e.capabilities.has('lockable')) return fail('not-lockable', `${ev.Name(e)} has no lock.`);
  const key = e.keyId ? carriedBy(state, actor.id).find((k) => k.id === e.keyId) : undefined;
  if (!key) return fail('no-key', `You don't have the right key for ${ev.name(e)}.`);
  if (lock && !e.states.has('open') === false) return fail('open', `Close ${ev.name(e)} first.`);
  e.states[lock ? 'add' : 'delete']('locked');
  return ok(`${ev.Name(actor)} ${lock ? 'lock' : 'unlock'}${actor.id === PLAYER_ID ? '' : 's'} ${ev.name(e)} with ${ev.name(key)}.`);
}

function doExamine(state: GameState, id: string | undefined): ActionResult {
  const e = entity(state, id ?? '');
  if (!e) return fail('missing-object', 'Examine what?');
  const parts: string[] = [e.description ?? `You see nothing special about ${ev.name(e)}.`];
  if (e.capabilities.has('container')) {
    const inside = isOpen(e) ? contentsOf(state, e.id) : [];
    if (!isOpen(e)) parts.push(`${ev.Name(e)} is closed.`);
    else if (inside.length) parts.push(`It holds ${inside.map(ev.name).join(', ')}.`);
    else parts.push('It is empty.');
  }
  return { success: true, turnsConsumed: 0, lines: [line('action', parts.join(' '))] };
}

function doRead(state: GameState, actor: Entity, id: string | undefined): ActionResult {
  const e = entity(state, id ?? '');
  if (!e) return fail('missing-object', 'Read what?');
  if (!e.capabilities.has('readable')) return fail('not-readable', `There's nothing to read on ${ev.name(e)}.`);

  // A runic map yields its hidden route only to a reader who knows the runes,
  // and only by moonlight (spec §13 map-reading; §10 day/night).
  if (e.states.has('runic')) {
    const knows = actor.agent?.knowledge.has('runes') ?? false;
    if (knows && isNight(state)) {
      state.flags['map-read'] = true;
      return { success: true, turnsConsumed: 1, lines: [line('action',
        `By moonlight the hidden runes on ${ev.name(e)} glimmer into view. ${ev.Name(actor)} traces a secret path east, over the shoulder of the mountains to a hidden vale.`)] };
    }
    if (knows) {
      return { success: true, turnsConsumed: 0, lines: [line('action',
        `${ev.Name(actor)} squints at ${ev.name(e)}. "There are moon-runes here — but they show only under a night sky. Come back by moonlight."`)] };
    }
    return { success: true, turnsConsumed: 0, lines: [line('action',
      `${ev.Name(e)} shows worn ink and a faint tracery you cannot read. Someone wiser might make more of it.`)] };
  }

  return { success: true, turnsConsumed: 0, lines: [line('action', e.description ?? `${ev.Name(e)} is blank.`)] };
}

function doWear(state: GameState, actor: Entity, id: string | undefined): ActionResult {
  const e = entity(state, id ?? '');
  if (!e) return fail('missing-object', 'Wear what?');
  if (!e.capabilities.has('wearable')) return fail('not-wearable', `You can't wear ${ev.name(e)}.`);
  if (e.states.has('worn')) return fail('already', `You're already wearing ${ev.name(e)}.`);
  e.locationId = actor.id;
  e.states.add('worn');
  // A ring of invisibility hides its wearer from perception (spec §13).
  if (e.capabilities.has('invisibility')) {
    actor.states.add('invisible');
    return ok(`${ev.wore(actor, e)} The world dims and slides sideways — you have faded from sight.`);
  }
  return ok(ev.wore(actor, e));
}

function doRemove(state: GameState, actor: Entity, id: string | undefined): ActionResult {
  const e = entity(state, id ?? '');
  if (!e) return fail('missing-object', 'Remove what?');
  if (!e.states.has('worn')) return fail('not-worn', `You aren't wearing ${ev.name(e)}.`);
  e.states.delete('worn');
  if (e.capabilities.has('invisibility')) {
    actor.states.delete('invisible');
    return ok(`${ev.removed(actor, e)} The world snaps back into focus; you are visible again.`);
  }
  return ok(ev.removed(actor, e));
}

function doGive(state: GameState, actor: Entity, action: import('../parser').SemanticAction): ActionResult {
  const recipient = entity(state, action.indirectObjectId ?? '');
  if (!recipient) return fail('missing-recipient', 'Give it to whom?');
  if (!recipient.agent) return fail('not-alive', `${ev.Name(recipient)} can't take that.`);
  const e = entity(state, action.directObjectIds[0] ?? '');
  if (!e) return fail('missing-object', 'Give what?');
  if (e.locationId !== actor.id) return fail('not-held', `You aren't holding ${ev.name(e)}.`);
  e.locationId = recipient.id;
  e.states.delete('worn');
  return ok(ev.gave(actor, e, recipient));
}

function doEat(state: GameState, actor: Entity, id: string | undefined): ActionResult {
  const e = entity(state, id ?? '');
  if (!e) return fail('missing-object', 'Eat what?');
  if (!e.capabilities.has('edible')) return fail('not-edible', `You can't eat ${ev.name(e)}.`);
  e.locationId = null;
  if (actor.agent) actor.agent.energy = Math.min(100, actor.agent.energy + 15);
  return ok(`${ev.Name(actor)} eat${actor.id === PLAYER_ID ? '' : 's'} ${ev.name(e)}.`);
}

function doLight(state: GameState, _actor: Entity, id: string | undefined, on: boolean): ActionResult {
  const e = entity(state, id ?? '');
  if (!e) return fail('missing-object', `${on ? 'Light' : 'Put out'} what?`);
  if (!(e.emitsLight && e.emitsLight > 0)) return fail('no-flame', `${ev.Name(e)} gives no light.`);
  if (!isReachable(state, e.id)) return fail('unreachable', `You can't reach ${ev.name(e)}.`);
  if (on && e.states.has('lit')) return fail('already', `${ev.Name(e)} is already lit.`);
  if (!on && !e.states.has('lit')) return fail('already', `${ev.Name(e)} isn't lit.`);
  if (on) e.states.add('lit'); else e.states.delete('lit');
  return ok(`${ev.Name(e)} ${on ? 'flares to life' : 'goes dark'}.`);
}

function doBreak(state: GameState, actor: Entity, action: import('../parser').SemanticAction): ActionResult {
  const target = entity(state, action.directObjectIds[0] ?? '');
  if (!target) return fail('missing-object', 'Break what?');
  if (target.agent) return fail('alive', `Try attacking ${ev.name(target)}, not breaking it.`);
  if (!target.capabilities.has('breakable')) return fail('not-breakable', `${ev.Name(target)} won't break.`);
  if (target.states.has('broken')) return fail('already', `${ev.Name(target)} is already broken.`);
  // Prefer a named weapon; else the best solid tool the actor holds.
  const tool = action.indirectObjectId
    ? entity(state, action.indirectObjectId)
    : carriedBy(state, actor.id).filter((t) => t.capabilities.has('weapon')).sort((a, b) => b.solidity - a.solidity)[0];
  if (!tool) return fail('no-tool', `You have nothing solid enough to break ${ev.name(target)}.`);
  if (tool.solidity < target.durability) {
    return fail('too-weak', `${ev.Name(tool)} isn't strong enough to break ${ev.name(target)}.`);
  }
  target.states.add('broken');
  if (target.capabilities.has('openable')) { target.states.add('open'); target.states.delete('closed'); }
  if (target.solveFlag) state.flags[target.solveFlag] = true;
  return ok(`${ev.Name(actor)} smash${actor.id === PLAYER_ID ? '' : 'es'} ${ev.name(target)} apart with ${ev.name(tool)}.`);
}

function doTie(state: GameState, actor: Entity, action: import('../parser').SemanticAction): ActionResult {
  const rope = entity(state, action.directObjectIds[0] ?? '');
  if (!rope) return fail('missing-object', 'Tie what?');
  if (!rope.names.includes('rope')) return fail('not-rope', `You can't tie ${ev.name(rope)}.`);
  if (rope.locationId !== actor.id) return fail('not-held', `You need to be holding ${ev.name(rope)}.`);
  const anchor = entity(state, action.indirectObjectId ?? '');
  if (!anchor) return fail('missing-anchor', `Tie ${ev.name(rope)} to what?`);
  if (!anchor.capabilities.has('anchor')) return fail('not-anchor', `You can't tie ${ev.name(rope)} to ${ev.name(anchor)}.`);
  rope.states.add('tied');
  rope.locationId = anchor.id;
  if (anchor.solveFlag) state.flags[anchor.solveFlag] = true;
  return ok(`${ev.Name(actor)} tie${actor.id === PLAYER_ID ? '' : 's'} ${ev.name(rope)} securely to ${ev.name(anchor)}.`);
}

// Silence unused import in builds that tree-shake currentLocation elsewhere.
void currentLocation;
