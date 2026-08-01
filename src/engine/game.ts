/**
 * Game orchestrator: parse -> resolve -> execute -> narrate, plus the world
 * tick (spec §6, §10). Holds the one piece of cross-turn UI state the parser
 * needs — a pending clarification question — and drives NPC agency so the
 * world keeps acting on its own.
 */
import type { GameState, LogLine } from '../world/types';
import { PLAYER_ID } from '../world/types';
import {
  carriedBy, contentsOf, currentLocation, entity, isNight,
} from '../world/entities';
import { DAY_LENGTH } from '../world/types';
import { parse, resolveClause } from '../parser';
import type { Ambiguity, Clause, ResolveFailure, SemanticAction } from '../parser';
import { execute } from '../actions/executor';
import { strike } from '../actions/combat';
import { describeLocation } from '../narration/describe';
import { name, Name } from '../narration/events';
import { buildWorld } from '../content/preservation';
import { serialize, deserialize } from '../persistence/save';
import { DIRECTIONS } from '../world/types';
import { randInt } from '../world/rng';

interface Pending {
  clause: Clause;
  candidates: string[];
  remaining: Clause[];
}

export class Game {
  state: GameState;
  private pending: Pending | undefined;
  /** Serialized snapshots for Guided-mode undo (spec §16). */
  private undoStack: string[] = [];

  constructor(build: () => GameState = buildWorld) {
    this.state = build();
    this.state.discovered.add(this.state.currentLocationId);
    this.state.log.push(...describeLocation(this.state));
    if (this.state.intro) this.state.log.push(...this.state.intro);
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

    // Snapshot before applying, so Guided-mode undo can step back a move.
    if (!/^\s*undo\b/i.test(input)) this.pushUndo();

    const clauses = parse(input);
    out.push(...this.runClauses(clauses));
    return this.record(out);
  }

  private pushUndo(): void {
    this.undoStack.push(serialize(this.state));
    if (this.undoStack.length > 25) this.undoStack.shift();
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
      case 'cross': return this.doCross();
      case 'say': return this.doSay(action);
      case 'kill': return this.doKill(action);
      case 'save': return [this.doSave()];
      case 'load': return [this.doLoad()];
      case 'mode': return [this.doMode(action)];
      case 'undo': return [this.doUndo()];
      case 'hint': return [this.doHint()];
      case 'map': return [this.doMap()];
      case 'listen': return this.doListen();
      case 'hide': return this.doHide();
      default: {
        const result = execute(this.state, action);
        return this.tick(result.lines, result.turnsConsumed > 0);
      }
    }
  }

  /** Attack an NPC; a companion may help, it may strike back, you can die. */
  private doKill(action: SemanticAction): LogLine[] {
    const target = entity(this.state, action.directObjectIds[0] ?? '');
    if (!target) return [err('Attack what?')];
    const player = entity(this.state, PLAYER_ID)!;
    const weapon = action.indirectObjectId ? entity(this.state, action.indirectObjectId) : undefined;
    const here = this.state.currentLocationId;
    const lines: LogLine[] = [];

    const blow = strike(this.state, player, target, weapon);
    lines.push(...blow.lines.map((t) => action_line(t)));
    let killed = blow.killed;

    // A sworn companion fighting at your side lends a blow of their own.
    if (!killed) {
      const ally = Object.values(this.state.entities).find(
        (e) => e.id !== PLAYER_ID && e.agent && e.states.has('alive') &&
          e.agent.knowledge.has('follow') && e.locationId === here,
      );
      if (ally) {
        const help = strike(this.state, ally, target);
        lines.push(...help.lines.map((t) => event(t)));
        killed = killed || help.killed;
      }
    }

    // Survivors of an unfriendly nature hit back.
    if (!killed && target.agent && (target.agent.aggression ?? 0) > 30) {
      const back = strike(this.state, target, player);
      lines.push(...back.lines.map((t) => event(t)));
    }
    return this.tick(lines, true);
  }

  /** Cross the room's gated obstacle if a way now exists. */
  private doCross(): LogLine[] {
    const loc = currentLocation(this.state);
    const dir = DIRECTIONS.find((d) => loc.gatedExits?.[d]);
    if (!dir) return [err('There is nothing to cross here.')];
    return this.doGo({ actorId: PLAYER_ID, verb: 'go', directObjectIds: [], direction: dir, raw: 'cross' });
  }

  private doGo(action: SemanticAction): LogLine[] {
    if (!action.direction) return [err('Go where? Try a direction like "north".')];
    const loc = currentLocation(this.state);
    const pre: LogLine[] = [];

    let dest = loc.exits[action.direction];
    if (!dest) {
      // Maybe it's a gated exit (a door to break, a ravine to bridge).
      const gate = loc.gatedExits?.[action.direction];
      if (!gate) return [err(`You can't go ${action.direction} from here.`)];
      if (this.state.flags[gate.flag]) {
        dest = gate.to;
      } else if (this.friendlyCompanionHere()) {
        // Solution 3: a strong, friendly companion helps you across.
        const c = this.friendlyCompanionHere()!;
        pre.push(event(`${Name(c)} braces against the far side and helps you across.`));
        dest = gate.to;
      } else {
        return [err(gate.blocked)];
      }
    }

    this.state.currentLocationId = dest;
    this.state.discovered.add(dest);
    this.awardLocation(dest);
    return this.tick([...pre, ...describeLocation(this.state)], true);
  }

  private friendlyCompanionHere() {
    return Object.values(this.state.entities).find(
      (e) => e.agent && e.states.has('alive') && e.locationId === this.state.currentLocationId &&
        (e.agent.loyalty[PLAYER_ID] ?? 0) > 0,
    );
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

    const wasNight = isNight(this.state);
    this.state.timeOfDay = (this.state.timeOfDay + 1) % DAY_LENGTH;
    const daynight: LogLine[] = [];
    if (isNight(this.state) && !wasNight) daynight.push(event('The sun sets; night falls over the land.'));
    else if (!isNight(this.state) && wasNight) daynight.push(event('Dawn breaks, pale and cold.'));

    const npc = this.tickNpcs();
    const story = this.checkStory();
    const end = this.checkEnd();
    return [...lines, ...daynight, ...npc, ...story, ...end];
  }

  /** Award progress and drive scripted story beats (spec §5, §13). */
  private checkStory(): LogLine[] {
    const s = this.state;
    const out: LogLine[] = [];

    if (s.flags['map-read'] && !s.scoredEvents.has('map-read')) {
      this.award('map-read', 2.5);
      out.push(sys('(You have uncovered the moon-runes. +2.5%)'));
    }

    // Trolls are creatures of the night: caught by daylight, they turn to
    // stone — but only once you've reached them (else they petrify unseen).
    if (!isNight(s)) {
      for (const e of Object.values(s.entities)) {
        if (e.names.includes('troll') && e.states.has('alive') && e.locationId && s.discovered.has(e.locationId)) {
          e.states.delete('alive'); e.states.add('dead');
          if (e.agent) e.agent.energy = 0;
          out.push(event(`Grey daylight touches ${e.display}, and with a groan it stiffens into cold stone.`));
        }
      }
    }

    const dragon = entity(s, 'dragon');
    if (dragon && dragon.states.has('alive')) {
      const treasure = entity(s, 'treasure');
      // Lifting the hoard wakes the dragon; it storms off to the town.
      if (!s.flags['dragon-roused'] && treasure && treasure.locationId === PLAYER_ID) {
        s.flags['dragon-roused'] = true;
        dragon.locationId = 'laketown';
        this.award('rouse', 2.5);
        out.push(event('A roar shakes the mountain! The dragon wakes, bursts from its lair, and hurls itself toward the lake-town below. (+2.5%)'));
      }
      // At the town, an archer with the black arrow can bring it down — even
      // off-screen, while you are elsewhere (spec §11). Where a thrush exists,
      // the archer must first learn of the bare patch (spec §13).
      if (s.flags['dragon-roused'] && !s.flags['dragon-slain'] && dragon.locationId === 'laketown') {
        const archer = entity(s, 'archer');
        const arrow = entity(s, 'arrow');
        const needsWeakspot = Object.values(s.entities).some((e) => e.names.includes('thrush'));
        const knowsWeakspot = !needsWeakspot || Boolean(s.flags['weakspot-known']);
        if (knowsWeakspot && archer && archer.states.has('alive') && archer.locationId === 'laketown' && arrow && arrow.locationId === 'archer') {
          s.flags['dragon-slain'] = true;
          dragon.states.delete('alive'); dragon.states.add('dead');
          dragon.agent && (dragon.agent.energy = 0);
          this.award('slay', 5);
          out.push(event('Far off, a single black arrow finds the dragon\'s bare heart. The great beast falls from the sky into the lake, and is still. (+5%)'));
        }
      }
    }

    return out;
  }

  private award(id: string, pct: number): void {
    if (this.state.scoredEvents.has(id)) return;
    this.state.scoredEvents.add(id);
    this.state.score = Math.min(100, this.state.score + pct);
  }

  /**
   * Every living NPC takes one behaviour step whether or not the player is
   * watching — moves persist off-screen (spec §11). Only events in the
   * player's room are narrated.
   */
  private tickNpcs(): LogLine[] {
    const out: LogLine[] = [];
    const here = this.state.currentLocationId;
    for (const e of Object.values(this.state.entities)) {
      if (e.id === PLAYER_ID || !e.agent || !e.states.has('alive')) continue;

      // A sworn companion keeps pace with you wherever you go.
      if (e.agent.knowledge.has('follow')) {
        if (e.locationId !== here) { e.locationId = here; out.push(event(`${Name(e)} keeps close at your side.`)); }
        continue;
      }

      const step = e.agent.behavior[e.agent.behaviorIndex % e.agent.behavior.length];
      e.agent.behaviorIndex += 1;
      const wasHere = e.locationId === here;

      if (step === 'move') {
        const loc = this.state.locations[e.locationId ?? ''];
        const exits = loc ? DIRECTIONS.map((d) => loc.exits[d]).filter((x): x is string => Boolean(x)) : [];
        if (exits.length) e.locationId = exits[randInt(this.state, 0, exits.length - 1)];
      } else if (step === 'hunt' && e.locationId === here && (e.agent.aggression ?? 0) > 30) {
        const player = entity(this.state, PLAYER_ID)!;
        if (player.states.has('invisible')) {
          out.push(event(`${Name(e)} sniffs the air, uneasy, but cannot find you.`));
        } else {
          out.push(...strike(this.state, e, player).lines.map((t) => event(t)));
        }
      } else if (step === 'speak' && e.locationId === here) {
        out.push(event(npcFlavor(e.display, this.state.turn)));
      }

      const nowHere = e.locationId === here;
      if (wasHere && !nowHere) out.push(event(`${Name(e)} wanders off.`));
      else if (!wasHere && nowHere) out.push(event(`${Name(e)} arrives.`));
    }
    return out;
  }

  /** End the tale on death or on satisfying the world's victory (spec §5, §20). */
  private checkEnd(): LogLine[] {
    if (this.state.gameOver) return [];
    const player = entity(this.state, PLAYER_ID)!;
    if (player.agent && player.agent.energy <= 0) {
      this.state.gameOver = true; this.state.outcome = 'lose';
      return [sys('Your strength fails and the dark closes in. You have died.')];
    }
    const v = this.state.victory;
    if (v) {
      const item = entity(this.state, v.itemId);
      const won = item && (v.containerId
        ? item.locationId === v.containerId
        : item.locationId === PLAYER_ID);
      if (won) {
        this.state.gameOver = true; this.state.outcome = 'win';
        this.state.score = Math.min(100, this.state.score + 10);
        return [sys(v.containerId
          ? 'You set the hoard-gold safe in the chest, home at last. Your quest is complete — you win!'
          : 'You lift the hoard-gold free. Your quest is complete — you win!')];
      }
    }
    return [];
  }

  private doSave(): LogLine {
    try {
      const data = serialize(this.state);
      if (typeof localStorage !== 'undefined') localStorage.setItem('hq-save', data);
      return sys('Game saved.');
    } catch { return err('Could not save the game.'); }
  }

  private doLoad(): LogLine {
    if (typeof localStorage === 'undefined') return err('No saved game is available here.');
    const data = localStorage.getItem('hq-save');
    if (!data) return err('No saved game found.');
    try {
      this.state = deserialize(data);
      return sys('Game restored.');
    } catch { return err('That save could not be read.'); }
  }

  private doMode(action: SemanticAction): LogLine {
    const arg = action.arg;
    if (arg === 'guided' || arg === 'classic') {
      this.state.mode = arg;
      return sys(arg === 'guided'
        ? 'Guided mode: undo, hints, and a travel map are available.'
        : 'Classic mode: terse, fragile, and unforgiving — as it was.');
    }
    return sys(`Mode is ${this.state.mode}. Switch with "mode guided" or "mode classic".`);
  }

  private doUndo(): LogLine {
    if (this.state.mode !== 'guided') return err('Undo is only available in Guided mode (try: mode guided).');
    const snap = this.undoStack.pop();
    if (!snap) return err('There is nothing to undo.');
    this.state = deserialize(snap);
    return sys('You take back your last move.');
  }

  private doHint(): LogLine {
    if (this.state.mode !== 'guided') return err('Hints are only available in Guided mode (try: mode guided).');
    const s = this.state;
    const carryingMap = contentsOf(s, PLAYER_ID).some((e) => e.states.has('runic'));
    const atHaven = s.currentLocationId === 'haven';
    if (!s.flags['map-read']) {
      if (atHaven && !isNight(s)) return sys('Hint: the sage can read your map — but moon-runes only show at night. Wait for nightfall, then: say to sage "read map".');
      if (atHaven && isNight(s)) return sys('Hint: it is night and the sage is here. Ask them to read the map: say to sage "read map".');
      if (!carryingMap) return sys('Hint: that old map matters. Make sure you are carrying it before you travel on.');
      return sys('Hint: seek out someone wise enough to read the map — follow the road east toward the haven.');
    }
    return sys('Hint: the hidden path east is open to you now. Press on.');
  }

  private doMap(): LogLine {
    if (this.state.mode !== 'guided') return err('You keep no map of your travels in Classic mode (try: mode guided).');
    const visited = [...this.state.discovered]
      .map((id) => this.state.locations[id]?.title)
      .filter(Boolean);
    return sys(`Places you have seen: ${visited.join(' · ')}.`);
  }

  /** Listen: a thrush at the mountain reveals the dragon's bare patch. */
  private doListen(): LogLine[] {
    const thrush = Object.values(this.state.entities).find(
      (e) => e.names.includes('thrush') && e.locationId === this.state.currentLocationId,
    );
    if (!thrush) return this.tick([action_line('You listen. Wind, and your own breath.')], true);
    this.state.flags['weakspot-known'] = true;
    return this.tick([action_line(
      'The old thrush trills, slow and deliberate, and somehow you understand: the dragon has one bare patch on its left breast, above the heart. Anyone who could tell the archer...')], true);
  }

  /** Hide: climbing into an empty barrel opens the river route out. */
  private doHide(): LogLine[] {
    const barrel = Object.values(this.state.entities).find(
      (e) => e.names.includes('barrel') && e.locationId === this.state.currentLocationId,
    );
    if (!barrel) return [err('There is nothing here to hide in.')];
    this.state.flags['in-barrel'] = true;
    return this.tick([action_line(
      'You curl into the empty barrel and pull the lid half-shut. It rocks, tips, and with a splash the current takes you — out and away down the dark river.')], true);
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
      'Type commands in plain English. Try:',
      '"take map", "go east", "read map", "wear ring", "light lamp",',
      '"give arrow to archer", "take gold", "put gold in chest", "eat apple".',
      'Speak to others: say to sage "read map".',
      'Also: look, inventory, score, wait, save, load, help,',
      'and "mode guided" to unlock undo, hint, and map.',
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
