import { describe, it, expect } from 'vitest';
import { Game } from './game';

const say = (g: Game, cmd: string): string => g.submit(cmd).map((l) => l.text).join('\n');

describe('the ring of invisibility', () => {
  it('wearing the ring turns you invisible', () => {
    const g = new Game();
    g.state.entities['ring'].locationId = 'player';
    say(g, 'wear ring');
    expect(g.state.entities['player'].states.has('invisible')).toBe(true);
  });

  it('a hunter cannot find an invisible player', () => {
    const g = new Game();
    g.state.entities['ring'].locationId = 'player';
    say(g, 'wear ring');
    g.state.currentLocationId = 'tunnels'; // the cave-creature lurks here
    const out = say(g, 'wait');
    expect(out).toMatch(/cannot find you/i);
    expect(g.state.entities['player'].agent!.energy).toBe(100);
  });

  it('removing the ring makes you visible again', () => {
    const g = new Game();
    g.state.entities['ring'].locationId = 'player';
    say(g, 'wear ring');
    say(g, 'remove ring');
    expect(g.state.entities['player'].states.has('invisible')).toBe(false);
  });
});

describe('the dragon', () => {
  it('kills a visible intruder in its hall', () => {
    const g = new Game();
    g.state.currentLocationId = 'lair'; // visible, no ring
    for (let i = 0; i < 3 && !g.state.gameOver; i++) say(g, 'wait');
    expect(g.state.outcome).toBe('lose');
  });

  it('ignores an invisible intruder', () => {
    const g = new Game();
    g.state.entities['ring'].locationId = 'player';
    say(g, 'wear ring');
    g.state.currentLocationId = 'lair';
    for (let i = 0; i < 3; i++) say(g, 'wait');
    expect(g.state.gameOver).toBe(false);
    expect(g.state.entities['player'].agent!.energy).toBe(100);
  });
});

describe("the mountain's secret door", () => {
  it('stays shut until the moon-runes have been read', () => {
    const g = new Game();
    g.state.currentLocationId = 'mountainfoot';
    expect(say(g, 'go east')).toMatch(/moon-runes|hidden door|sheer cliff/i);
    expect(g.state.currentLocationId).toBe('mountainfoot');
  });

  it('opens once the map has been read', () => {
    const g = new Game();
    g.state.currentLocationId = 'mountainfoot';
    g.state.flags['map-read'] = true;
    say(g, 'go east');
    expect(g.state.currentLocationId).toBe('lair');
  });
});

describe('the endgame', () => {
  it('lifting the hoard wakes the dragon, and the archer slays it off-screen', () => {
    const g = new Game();
    // Archer is armed with the black arrow back in the town.
    g.state.entities['arrow'].locationId = 'archer';
    // Sneak in, invisible, and take the gold.
    g.state.entities['ring'].locationId = 'player';
    say(g, 'wear ring');
    g.state.currentLocationId = 'lair';
    say(g, 'take gold');
    expect(g.state.flags['dragon-roused']).toBe(true);
    expect(g.state.entities['dragon'].states.has('dead')).toBe(true);
    expect(g.state.flags['dragon-slain']).toBe(true);
  });

  it('is won by putting the hoard in the chest back home (spec §5)', () => {
    const g = new Game();
    g.state.entities['treasure'].locationId = 'player';
    g.state.currentLocationId = 'hollow';
    say(g, 'put gold in chest');
    expect(g.state.entities['treasure'].locationId).toBe('chest');
    expect(g.state.outcome).toBe('win');
    expect(g.state.gameOver).toBe(true);
  });

  // Spec §20 acceptance #1: the complete primary objective is achievable
  // from a clean start via one canonical route.
  it('can be completed end-to-end from a clean start', () => {
    const g = new Game();
    const cmds = [
      'take map', 'take lamp', 'take apple', 'light lamp',
      // out to the haven
      'go east', 'go east', 'go east', 'go east', 'go east', 'go east',
      // wait for moonlight, have the map read
      'wait', 'wait', 'wait', 'wait', 'wait',
      'say to sage "read map"',
      // into the mountains and the dark
      'go east', 'go east',
      'take ring', 'wear ring', 'eat apple',
      // on to the lake-town; arm the archer
      'go east', 'go east', 'go east', 'go east',
      'take arrow', 'give arrow to archer',
      // through the secret door to the hoard
      'go east', 'go east',
      'take gold',
      // all the way home (lair → … → hollow is 14 rooms west)
      'go west', 'go west', 'go west', 'go west', 'go west', 'go west', 'go west',
      'go west', 'go west', 'go west', 'go west', 'go west', 'go west', 'go west',
      'put gold in chest',
    ];
    for (const c of cmds) { if (!g.state.gameOver) say(g, c); }
    expect(g.state.outcome).toBe('win');
    expect(g.state.flags['dragon-slain']).toBe(true);
  });
});
