import { describe, it, expect } from 'vitest';
import { Game } from './game';

import { buildWorld as buildM5 } from '../content/m5';
const say = (g: Game, cmd: string): string => g.submit(cmd).map((l) => l.text).join('\n');
const newGame = (): Game => new Game(buildM5);

describe('the quest framing', () => {
  it('opens with the wizard-and-dwarf briefing', () => {
    const g = newGame();
    const opening = g.state.log.map((l) => l.text).join('\n');
    expect(opening).toMatch(/burglar/i);
    expect(opening).toMatch(/dragon/i);
  });
});

describe('the dwarf companion', () => {
  it('follows you from room to room', () => {
    const g = newGame();
    expect(g.state.entities['dwarf'].locationId).toBe('home');
    say(g, 'go east');
    expect(g.state.entities['dwarf'].locationId).toBe('lane');
  });

  it('lends a blow in a fight at your side', () => {
    const g = newGame();
    g.state.entities['staff'].locationId = 'player';
    g.state.entities['dwarf'].locationId = 'undergate';
    g.state.currentLocationId = 'undergate'; // a goblin lurks here
    const out = say(g, 'kill goblin with staff');
    expect(out).toMatch(/dwarf-leader/i);
  });
});

describe('the trolls', () => {
  it('turn to stone once daylight reaches them', () => {
    const g = newGame();
    g.state.discovered.add('trolls'); // you have reached the clearing
    g.state.timeOfDay = 0;            // day
    say(g, 'wait');
    expect(g.state.entities['troll'].states.has('dead')).toBe(true);
  });
});

describe('the thrush and the dragon', () => {
  it('the archer will not fell the dragon until the bare patch is known', () => {
    const g = newGame();
    g.state.entities['ring'].locationId = 'player';
    say(g, 'wear ring');
    g.state.currentLocationId = 'lair';
    say(g, 'take gold'); // wakes the dragon, but no one knows the weak spot
    expect(g.state.flags['dragon-roused']).toBe(true);
    expect(g.state.flags['dragon-slain']).toBeUndefined();
  });

  it('once the thrush reveals the bare patch, the archer fells it', () => {
    const g = newGame();
    g.state.flags['weakspot-known'] = true;
    g.state.entities['ring'].locationId = 'player';
    say(g, 'wear ring');
    g.state.currentLocationId = 'lair';
    say(g, 'take gold');
    expect(g.state.flags['dragon-slain']).toBe(true);
  });

  it('listening to the thrush reveals the bare patch', () => {
    const g = newGame();
    g.state.currentLocationId = 'mountfoot';
    say(g, 'listen');
    expect(g.state.flags['weakspot-known']).toBe(true);
  });
});

describe('the barrel escape', () => {
  it('the cellars are sealed until you ride a barrel down the river', () => {
    const g = newGame();
    g.state.currentLocationId = 'cellars';
    expect(say(g, 'go east')).toMatch(/barrel|river|barred/i);
    say(g, 'hide in barrel');
    expect(g.state.flags['in-barrel']).toBe(true);
    say(g, 'go east');
    expect(g.state.currentLocationId).toBe('laketown');
  });
});

describe('the whole tale', () => {
  // Spec §20 acceptance #1: the complete objective, from a clean start.
  it('can be completed end-to-end, dragon slain and dwarf alive', () => {
    const g = newGame();
    const cmds = [
      'take map', 'take lamp', 'take staff', 'take apple', 'light lamp',
      'go east', 'go east', 'go east', 'go east', 'go east',            // → haven
      'take bread', 'wait', 'wait', 'wait', 'wait', 'say to sage "read map"',
      'go east', 'go east',                                            // pass, tunnels
      'take ring', 'wear ring', 'eat apple', 'eat bread',
      'go east', 'go east', 'go east', 'go down',                      // undergate, wood, elf-halls, cellars
      'hide in barrel', 'go east',                                    // → lake-town
      'go east', 'listen', 'go east',                                 // mountain-foot, thrush, lair
      'take gold',
      'go west', 'go west', 'go west', 'go up',
      'go west', 'go west', 'go west', 'go west', 'go west', 'go west',
      'go west', 'go west', 'go west', 'go west',
      'put gold in chest',
    ];
    for (const c of cmds) { if (!g.state.gameOver) say(g, c); }
    expect(g.state.outcome).toBe('win');
    expect(g.state.flags['dragon-slain']).toBe(true);
    expect(g.state.entities['dwarf'].states.has('alive')).toBe(true);
  });
});
