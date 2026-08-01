import { describe, it, expect } from 'vitest';
import { Game } from './game';
import { contentsOf } from '../world/entities';
import { buildWorld as buildM1 } from '../content/m1';

/** Concatenate the visible text of a submit() result. */
const say = (g: Game, cmd: string): string =>
  g.submit(cmd).map((l) => l.text).join('\n');

/** M1 playground world (the default is now the M2 slice). */
const newM1 = (): Game => new Game(buildM1);

describe('physics', () => {
  it('take then drop moves an entity between the room and inventory', () => {
    const g = newM1();
    say(g, 'take the brass lamp');
    expect(g.state.entities['brass-lamp'].locationId).toBe('player');
    say(g, 'drop the brass lamp');
    expect(g.state.entities['brass-lamp'].locationId).toBe('hall');
  });

  it('will not take a non-takeable fixture', () => {
    const g = newM1();
    const out = say(g, 'take chest');
    expect(out).toMatch(/can't be taken/i);
    expect(g.state.entities['chest'].locationId).toBe('hall');
  });

  it('cannot access the contents of a closed container', () => {
    const g = newM1();
    const out = say(g, 'take ring');
    expect(out).toMatch(/can't see/i);
    expect(g.state.entities['ring'].locationId).toBe('chest');
  });

  it('an oversized object will not fit in a small container', () => {
    const g = newM1();
    const out = say(g, 'put chest in pack');
    expect(out).toMatch(/won't fit/i);
  });

  it('a locked chest opens only after unlocking with the right key', () => {
    const g = newM1();
    expect(say(g, 'open chest')).toMatch(/locked/i);
    say(g, 'take the iron key');
    expect(say(g, 'unlock chest')).toMatch(/unlock/i);
    const opened = say(g, 'open chest');
    expect(opened).toMatch(/ring/i); // reveal-on-open
    say(g, 'take ring');
    expect(g.state.entities['ring'].locationId).toBe('player');
  });

  it('an item never exists in two places at once', () => {
    const g = newM1();
    say(g, 'take the red apple');
    const inHall = contentsOf(g.state, 'hall').map((e) => e.id);
    expect(inHall).not.toContain('apple');
    expect(g.state.entities['apple'].locationId).toBe('player');
  });
});

describe('reference memory', () => {
  it('resolves IT to the last thing handled', () => {
    const g = newM1();
    say(g, 'take the brass lamp');
    expect(g.state.lastSingularId).toBe('brass-lamp');
    say(g, 'drop it');
    expect(g.state.entities['brass-lamp'].locationId).toBe('hall');
  });
});

describe('clarification flow', () => {
  it('asks, then acts on the disambiguating answer', () => {
    const g = newM1();
    const ask = say(g, 'take lamp');
    expect(ask).toMatch(/which do you mean/i);
    say(g, 'brass');
    expect(g.state.entities['brass-lamp'].locationId).toBe('player');
  });
});

describe('NPC agency', () => {
  it('an NPC carries out a valid spoken command', () => {
    const g = newM1();
    // turn 0 mood is cooperative for Rowan; the rope should move to Rowan.
    say(g, 'say to rowan "take rope"');
    expect(g.state.entities['rope'].locationId).toBe('rowan');
  });

  it('player and NPC actions go through the same executor rules', () => {
    const g = newM1();
    // Rowan cannot take the chest (not takeable) — same rule as the player.
    const out = say(g, 'say to rowan "take chest"');
    expect(out).toMatch(/tries, but cannot|as they please/i);
    expect(g.state.entities['chest'].locationId).toBe('hall');
  });
});
