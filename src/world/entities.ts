/**
 * Entity queries and mutations over GameState. `locationId` (the parent) is
 * the single source of truth for containment; contents are derived, so a
 * container and its contents can never disagree. Moving a container moves
 * its contents implicitly, since they still point at the container.
 */
import type { Entity, GameState, Location } from './types';
import { LIGHT_THRESHOLD, PLAYER_ID } from './types';

export function entity(state: GameState, id: string): Entity | undefined {
  return state.entities[id];
}

export function player(state: GameState): Entity {
  return state.entities[PLAYER_ID];
}

export function location(state: GameState, id: string): Location | undefined {
  return state.locations[id];
}

export function currentLocation(state: GameState): Location {
  return state.locations[state.currentLocationId];
}

/** Direct children of a container/location/actor. */
export function contentsOf(state: GameState, parentId: string): Entity[] {
  return Object.values(state.entities).filter((e) => e.locationId === parentId);
}

export function isOpen(e: Entity): boolean {
  // Non-containers and non-openables are treated as "open" for reachability.
  if (!e.capabilities.has('openable')) return true;
  return e.states.has('open');
}

/** Contents visible when looking at/through a container from outside. */
export function visibleContents(state: GameState, container: Entity): Entity[] {
  const opaque = container.states.has('opaque') && !container.states.has('transparent');
  if (container.capabilities.has('openable') && !isOpen(container) && opaque) {
    return [];
  }
  return contentsOf(state, container.id);
}

/** Is `id` inside `ancestorId` at any depth? Guards against cycles. */
export function isWithin(state: GameState, id: string, ancestorId: string): boolean {
  const seen = new Set<string>();
  let cur = state.entities[id]?.locationId ?? null;
  while (cur) {
    if (cur === ancestorId) return true;
    if (seen.has(cur)) return false;
    seen.add(cur);
    cur = state.entities[cur]?.locationId ?? null;
  }
  return false;
}

/** Total mass of an entity including everything nested inside it. */
export function totalMass(state: GameState, id: string): number {
  const e = state.entities[id];
  if (!e) return 0;
  return contentsOf(state, id).reduce((sum, c) => sum + totalMass(state, c.id), e.mass);
}

/** Whether the current location is lit enough for the player to see. */
export function isLit(state: GameState): boolean {
  const loc = currentLocation(state);
  if (loc.ambientLight >= LIGHT_THRESHOLD) return true;
  // A lit light-source you carry or that sits in the room illuminates it.
  const near = [...contentsOf(state, PLAYER_ID), ...contentsOf(state, state.currentLocationId)];
  return near.some((e) => e.states.has('lit') && (e.emitsLight ?? 0) > 0);
}

/**
 * Everything the player can currently refer to: what's in the room, what
 * they carry, and the exposed contents of open/transparent containers among
 * those — recursively. In the dark you can only refer to what you carry (and
 * any lit thing), so light gates interaction, not just description (spec §9).
 */
export function scope(state: GameState): Entity[] {
  const lit = isLit(state);
  const roomRoots = lit
    ? contentsOf(state, state.currentLocationId)
    : contentsOf(state, state.currentLocationId).filter((e) => e.states.has('lit'));
  const roots = [
    ...roomRoots,
    ...contentsOf(state, PLAYER_ID),
  ];
  const out: Entity[] = [];
  const seen = new Set<string>();
  const walk = (list: Entity[]): void => {
    for (const e of list) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push(e);
      if (e.capabilities.has('container')) walk(visibleContents(state, e));
    }
  };
  walk(roots);
  return out;
}

/** Is the entity reachable to be manipulated (in scope and not sealed away)? */
export function isReachable(state: GameState, id: string): boolean {
  const e = state.entities[id];
  if (!e) return false;
  if (!scope(state).some((s) => s.id === id)) return false;
  // Unreachable if any ancestor container is closed.
  let cur = e.locationId;
  const seen = new Set<string>();
  while (cur && cur !== state.currentLocationId && cur !== PLAYER_ID) {
    if (seen.has(cur)) break;
    seen.add(cur);
    const parent = state.entities[cur];
    if (parent && parent.capabilities.has('openable') && !isOpen(parent)) return false;
    cur = parent?.locationId ?? null;
  }
  return true;
}

export function carriedBy(state: GameState, actorId: string): Entity[] {
  return contentsOf(state, actorId);
}

/** Move an entity to a new parent. Caller is responsible for validation. */
export function place(state: GameState, id: string, parentId: string | null): void {
  const e = state.entities[id];
  if (e) e.locationId = parentId;
}
