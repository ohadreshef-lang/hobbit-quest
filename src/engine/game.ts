/**
 * Game orchestrator: parse -> resolve -> execute -> narrate, plus the world
 * tick (spec §6, §10). Holds the one piece of cross-turn UI state the parser
 * needs — a pending clarification question — and drives NPC agency so the
 * world keeps acting on its own.
 */
import type { GameState, LogLine } from '../world/types';
import { PLAYER_ID } from '../world/types';
import {
  carriedBy, contentsOf, currentLocation, entity,
} from '../world/entities';
import { parse, resolveClause } from '../parser';
import type { Ambiguity, Clause, ResolveFailure, SemanticAction } from '../parser';
import { execute } from '../actions/executor';
import { describeLocation } from '../narration/describe';
import { name, Name } from '../narration/events';
import { buildWorld } from '../content/m1';

interface Pending {
  clause: Clause;
  candidates: string[];
  remaining: Clause[];
}

export class Game {
  state: GameState;
  private pending: Pending | undefined;

  constructor() {
    this.state = buildWorld();
    this.state.log.push(...describeLocation(this.state));
  }

  /** Handle one line of player input; returns the lines to append. */
  submit(input: string): LogLine[] {
    const echo: LogLine = { kind: 'command', text: `> ${input}` };
    const out: LogLine[] = [echo];

    if (this.state.gameOver) {
      out.push(sys('The tale is over. Reload to begin again.'));
      return this.record(out);
    }

    if (this.pending) {
      out.push(...this.answerClarification(input));
      return this.record(out);
    }

    const clauses = parse(input);
    out.push(...this.runClauses(clauses));
    return this.record(out);
  }

  private runClauses(clauses: Clause[]): LogLine[] {
    const out: LogLine[] = [];
    for (let i = 0; i < clauses.length; i++) {
      const res = this.runClause(clauses[i]);
      out.push(...res);
      if (this.pending) {
        // Stash the not-yet-run clauses to resume after the answer.
        this.pending.remaining = clauses.slice(i + 1);
        break;
      }
    }
    return out;
  }

  private runClause(clause: Clause): LogLine[] {
    const resolution = resolveClause(this.state, clause);
    if (!resolution.ok) {
      if (resolution.issue.code === 'ambiguous') return this.askClarification(resolution.issue);
      return [this.narrateFailure(resolution.issue)];
    }
    return this.perform(resolution.action);
  }

  /** Run a fully-resolved action (meta verbs, movement, or the executor). */
  private perform(action: SemanticAction): LogLine[] {
    // Remember references for IT / THEM.
    if (action.directObjectIds.length === 1) this.state.lastSingularId = action.directObjectIds[0];
    if (action.directObjectIds.length > 1) this.state.lastPluralIds = action.directObjectIds;

    switch (action.verb) {
      case 'look': return this.tick(describeLocation(this.state), false);
      case 'inventory': return this.tick([this.listInventory()], false);
      case 'score': return this.tick([sys(`Your progress: ${this.state.score}%`)], false);
      case 'help': return this.tick([this.helpText()], false);
      case 'wait': return this.tick([action_line('Time passes.')], true);
      case 'go': return this.doGo(action);
      case 'say': return this.doSay(action);
      default: {
        const result = execute(this.state, action);
        return this.tick(result.lines, result.turnsConsumed > 0);
      }
    }
  }

  private doGo(action: SemanticAction): LogLine[] {
    if (!action.direction) return [err('Go where? Try a direction like "north".')];
    const dest = currentLocation(this.state).exits[action.direction];
    if (!dest) return [err(`You can't go ${action.direction} from here.`)];
    this.state.currentLocationId = dest;
    this.awardLocation(dest);
    return this.tick(describeLocation(this.state), true);
  }

  /** SAY TO <npc> "<command>" — the NPC decides whether to comply (spec §8, §11). */
  private doSay(action: SemanticAction): LogLine[] {
    const npc = entity(this.state, action.speechTargetId ?? '');
    if (!npc || !npc.agent) return [err('There is no one by that name to speak to.')];
    if (npc.locationId !== this.state.currentLocationId) return [err(`${Name(npc)} is not here.`)];
    if (!action.speech) return [err(`Say what to ${name(npc)}? Try: say to ${npc.names[0]} "take lamp".`)];

    const echoed: LogLine = { kind: 'action', text: `You say to ${name(npc)}: "${action.speech}".` };

    const [innerClause] = parse(action.speech);
    if (!innerClause || innerClause.verb === 'unknown') {
      return this.tick([echoed, event(`${Name(npc)} tilts their head, baffled.`)], true);
    }

    // Temperament: a valid request is not guaranteed to succeed (spec §8).
    const mood = (this.state.turn + npc.id.length) % 3;
    const friendly = (npc.agent.loyalty[PLAYER_ID] ?? 0) >= 0;
    if (!friendly || mood === 0) {
      return this.tick([echoed, event(`${Name(npc)} shakes their head and does as they please instead.`)], true);
    }

    const resolved = resolveClause(this.state, innerClause, npc.id);
    if (!resolved.ok) {
      return this.tick([echoed, event(`${Name(npc)} shrugs; that seems impossible to them.`)], true);
    }
    const result = execute(this.state, resolved.action);
    const reaction = result.success
      ? result.lines.map((l) => ({ ...l, kind: 'event' as const }))
      : [event(`${Name(npc)} tries, but cannot.`)];
    return this.tick([echoed, ...reaction], true);
  }

  // --- clarification -----------------------------------------------------

  private askClarification(amb: Ambiguity): LogLine[] {
    this.pending = { clause: amb.clause, candidates: amb.candidates.map((c) => c.id), remaining: [] };
    const options = amb.candidates.map((c) => c.display).join(' or ');
    return [sys(`Which do you mean: ${options}?`)];
  }

  private answerClarification(input: string): LogLine[] {
    const pending = this.pending!;
    const answer = input.trim().toLowerCase();
    const chosen = pending.candidates
      .map((id) => entity(this.state, id))
      .find((e) => e && (e.names.some((n) => answer.includes(n)) || e.adjectives.some((a) => answer.includes(a))));

    if (!chosen) {
      const opts = pending.candidates.map((id) => entity(this.state, id)?.display).filter(Boolean).join(' or ');
      return [sys(`I still don't know which you mean. ${opts}?`)];
    }

    const clause = injectAdjective(pending.clause, chosen.adjectives[0] ?? chosen.names[0]);
    const remaining = pending.remaining;
    this.pending = undefined;

    const out = this.runClause(clause);
    if (!this.pending) out.push(...this.runClauses(remaining));
    return out;
  }

  // --- world tick & scoring ---------------------------------------------

  /** Append lines, then advance the world if the action consumed a turn. */
  private tick(lines: LogLine[], tookTurn: boolean): LogLine[] {
    if (!tookTurn) return lines;
    this.state.turn += 1;
    return [...lines, ...this.tickNpcs()];
  }

  /** Every living NPC gets one behaviour step; only co-located ones narrate. */
  private tickNpcs(): LogLine[] {
    const out: LogLine[] = [];
    for (const e of Object.values(this.state.entities)) {
      if (!e.agent || !e.states.has('alive')) continue;
      const step = e.agent.behavior[e.agent.behaviorIndex % e.agent.behavior.length];
      e.agent.behaviorIndex += 1;
      if (e.locationId !== this.state.currentLocationId) continue;
      if (step === 'speak') out.push(event(npcFlavor(e.display, this.state.turn)));
      // (movement/other steps are simulated silently in M1's single room)
    }
    return out;
  }

  private awardLocation(locId: string): void {
    const loc = this.state.locations[locId];
    const evId = `enter:${locId}`;
    if (loc && !this.state.scoredEvents.has(evId)) {
      this.state.scoredEvents.add(evId);
      this.state.score = Math.min(100, this.state.score + 2.5);
    }
  }

  // --- helpers -----------------------------------------------------------

  private listInventory(): LogLine {
    const items = carriedBy(this.state, PLAYER_ID);
    if (!items.length) return action_line('You are carrying nothing.');
    const desc = items.map((i) => (i.states.has('worn') ? `${name(i)} (worn)` : name(i)));
    return action_line(`You are carrying: ${desc.join(', ')}.`);
  }

  private helpText(): LogLine {
    return sys([
      'Type commands in plain English. Examples:',
      '"take the brass lamp", "open chest", "put ring in chest",',
      '"take all except the sword", "examine it", "wear ring",',
      'and speak to others: say to rowan "take lamp".',
      'Also: look, inventory, score, wait, help.',
    ].join(' '));
  }

  private narrateFailure(issue: ResolveFailure): LogLine {
    switch (issue.code) {
      case 'unknown-word': return err(`I don't know the word "${issue.word}".`);
      case 'missing-object': return err(`${cap(issue.verb)} what?`);
      case 'not-visible': return err(`You can't see any ${issue.noun} here.`);
      case 'no-pronoun': return err(`I'm not sure what "${issue.pronoun}" refers to.`);
      case 'nothing-matches': return err('There is nothing suitable here.');
      default: return err("You can't do that.");
    }
  }

  private record(lines: LogLine[]): LogLine[] {
    this.state.log.push(...lines.slice(1)); // slice(1): echo already stands alone in UI
    if (this.state.log.length > 500) this.state.log.splice(0, this.state.log.length - 500);
    return lines;
  }
}

function injectAdjective(clause: Clause, adj: string): Clause {
  const target = clause.directObject ?? clause.speechTargetNoun ?? clause.indirectObject;
  if (target && target.kind === 'named' && !target.adjectives.includes(adj)) {
    target.adjectives = [adj, ...target.adjectives];
  }
  return clause;
}

function npcFlavor(display: string, turn: number): string {
  const lines = [
    `${cap(display)} hums an old road-song to no one in particular.`,
    `${cap(display)} rummages through their pack, then loses interest.`,
    `${cap(display)} glances at the door, as if expecting someone.`,
  ];
  return lines[turn % lines.length];
}

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const action_line = (text: string): LogLine => ({ kind: 'action', text });
const event = (text: string): LogLine => ({ kind: 'event', text });
const err = (text: string): LogLine => ({ kind: 'error', text });
const sys = (text: string): LogLine => ({ kind: 'system', text });

// keep tree-shakers from dropping a helper used only in some builds
void contentsOf;
