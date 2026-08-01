/**
 * Resolver: bind noun phrases to entities against the player's current scope
 * (spec §8 pipeline steps 6–8, reference resolution). Produces SemanticActions
 * or a typed failure the caller can narrate — never a bare "I don't understand".
 */
import type { Direction, Entity, GameState } from '../world/types';
import { PLAYER_ID } from '../world/types';
import { scope } from '../world/entities';
import type { Clause, NounPhrase } from './grammar';

export interface SemanticAction {
  actorId: string;
  verb: string;
  directObjectIds: string[];
  indirectObjectId?: string | undefined;
  preposition?: string | undefined;
  adverb?: string | undefined;
  direction?: Direction | undefined;
  speech?: string | undefined;
  speechTargetId?: string | undefined;
  raw: string;
}

export type ResolveFailure =
  | { code: 'unknown-word'; word: string; raw: string }
  | { code: 'missing-object'; verb: string; raw: string }
  | { code: 'not-visible'; noun: string; raw: string }
  | { code: 'no-pronoun'; pronoun: string; raw: string }
  | { code: 'nothing-matches'; raw: string };

export interface Ambiguity {
  code: 'ambiguous';
  verb: string;
  candidates: Entity[];
  /** The unresolved clause, kept so the game can retry with the answer. */
  clause: Clause;
  slot: 'direct' | 'indirect' | 'speech-target';
  raw: string;
}

export type Resolution = { ok: true; action: SemanticAction } | { ok: false; issue: ResolveFailure | Ambiguity };

function matchesNoun(e: Entity, np: NounPhrase): boolean {
  if (!np.noun) return false;
  const nounHit = e.names.includes(np.noun) || e.display.toLowerCase().includes(np.noun);
  if (!nounHit) return false;
  return np.adjectives.every(
    (adj) => e.adjectives.includes(adj) || e.names.includes(adj),
  );
}

/** Resolve a single noun phrase to entity ids. */
function resolveNP(
  state: GameState,
  np: NounPhrase,
  clause: Clause,
  slot: 'direct' | 'indirect' | 'speech-target',
): { ids: string[] } | { issue: ResolveFailure | Ambiguity } {
  const inScope = scope(state).filter((e) => e.id !== PLAYER_ID);

  if (np.kind === 'quantifier') {
    // ALL: every takeable thing in scope, minus EXCEPT and fixed things.
    let ids = inScope
      .filter((e) => e.capabilities.has('takeable') && !e.states.has('fixed'))
      .map((e) => e.id);
    if (np.except) {
      const ex = resolveNP(state, np.except, clause, slot);
      if ('ids' in ex) ids = ids.filter((id) => !ex.ids.includes(id));
    }
    if (ids.length === 0) return { issue: { code: 'nothing-matches', raw: clause.raw } };
    return { ids };
  }

  if (np.kind === 'pronoun') {
    if (np.pronoun === 'it') {
      const id = state.lastSingularId;
      if (!id || !inScope.some((e) => e.id === id)) {
        return { issue: { code: 'no-pronoun', pronoun: 'it', raw: clause.raw } };
      }
      return { ids: [id] };
    }
    const ids = (state.lastPluralIds ?? []).filter((id) => inScope.some((e) => e.id === id));
    if (ids.length === 0) return { issue: { code: 'no-pronoun', pronoun: np.pronoun!, raw: clause.raw } };
    return { ids };
  }

  // Named phrase.
  const candidates = inScope.filter((e) => matchesNoun(e, np));
  if (candidates.length === 0) {
    return { issue: { code: 'not-visible', noun: np.noun ?? '(nothing)', raw: clause.raw } };
  }
  if (candidates.length > 1) {
    return {
      issue: { code: 'ambiguous', verb: clause.verb, candidates, clause, slot, raw: clause.raw },
    };
  }
  return { ids: [candidates[0].id] };
}

/** Resolve a full clause into a SemanticAction for the given actor. */
export function resolveClause(state: GameState, clause: Clause, actorId = PLAYER_ID): Resolution {
  if (clause.verb === 'unknown') {
    return { ok: false, issue: { code: 'unknown-word', word: clause.unknownWord ?? clause.raw, raw: clause.raw } };
  }

  const base: SemanticAction = {
    actorId, verb: clause.verb, directObjectIds: [],
    adverb: clause.adverb, direction: clause.direction, raw: clause.raw,
  };

  // Movement & meta verbs need no object.
  if (['go', 'look', 'inventory', 'wait', 'score', 'help'].includes(clause.verb)) {
    return { ok: true, action: base };
  }

  // Speech: SAY TO <npc> "<quoted>"
  if (clause.verb === 'say') {
    if (!clause.speechTargetNoun) {
      return { ok: false, issue: { code: 'missing-object', verb: 'say', raw: clause.raw } };
    }
    const target = resolveNP(state, clause.speechTargetNoun, clause, 'speech-target');
    if ('issue' in target) return { ok: false, issue: target.issue };
    return {
      ok: true,
      action: { ...base, speechTargetId: target.ids[0], speech: clause.speech },
    };
  }

  // Everything else needs a direct object.
  if (!clause.directObject) {
    return { ok: false, issue: { code: 'missing-object', verb: clause.verb, raw: clause.raw } };
  }
  const dobj = resolveNP(state, clause.directObject, clause, 'direct');
  if ('issue' in dobj) return { ok: false, issue: dobj.issue };
  base.directObjectIds = dobj.ids;

  if (clause.indirectObject) {
    const iobj = resolveNP(state, clause.indirectObject, clause, 'indirect');
    if ('issue' in iobj) return { ok: false, issue: iobj.issue };
    base.indirectObjectId = iobj.ids[0];
    base.preposition = clause.preposition;
  }

  return { ok: true, action: base };
}
