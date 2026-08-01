import { describe, it, expect } from 'vitest';
import { Game } from './game';

import { buildWorld as buildM3 } from '../content/m3';
const say = (g: Game, cmd: string): string => g.submit(cmd).map((l) => l.text).join('\n');
const newGame = (): Game => new Game(buildM3);

describe('day / night', () => {
  it('advances time and falls to night at mid-cycle', () => {
    const g = newGame();
    let last = '';
    for (let i = 0; i < 5; i++) last = say(g, 'wait');
    expect(g.state.timeOfDay).toBe(5);
    expect(last).toMatch(/night falls/i);
  });

  it('an outdoor place goes dark at night without a light', () => {
    const g = newGame();
    say(g, 'go east'); // to the lane (outdoor), time = 1
    for (let i = 0; i < 4; i++) say(g, 'wait'); // time = 5 → night
    expect(say(g, 'look')).toMatch(/pitch dark/i);
  });

  it('a carried, lit lamp keeps an outdoor place usable at night', () => {
    const g = newGame();
    say(g, 'take lamp'); say(g, 'light lamp');
    say(g, 'go east');
    for (let i = 0; i < 4; i++) say(g, 'wait'); // night
    const look = say(g, 'look');
    expect(look).not.toMatch(/pitch dark/i);
    expect(look).toMatch(/lane/i);
  });
});

describe('the runic map', () => {
  it('the player alone cannot read the moon-runes', () => {
    const g = newGame();
    say(g, 'take map');
    expect(say(g, 'read map')).toMatch(/cannot read|someone wiser/i);
    expect(g.state.flags['map-read']).toBeUndefined();
  });

  it('the sage refuses to read it by day', () => {
    const g = newGame();
    g.state.entities['map'].locationId = 'player';
    g.state.currentLocationId = 'haven';
    g.state.timeOfDay = 0; // day
    const out = say(g, 'say to sage "read map"');
    expect(out).toMatch(/moonlight|night sky|come back/i);
    expect(g.state.flags['map-read']).toBeUndefined();
  });

  it('the sage reads the hidden path by moonlight, and it scores', () => {
    const g = newGame();
    g.state.entities['map'].locationId = 'player';
    g.state.currentLocationId = 'haven';
    g.state.timeOfDay = 6; // night
    const out = say(g, 'say to sage "read map"');
    expect(out).toMatch(/hidden runes|secret path|moonlight/i);
    expect(g.state.flags['map-read']).toBe(true);
    expect(g.state.score).toBeGreaterThanOrEqual(2.5);
  });
});

describe('score events', () => {
  it('rises 2.5% per newly discovered location', () => {
    const g = newGame();
    say(g, 'go east'); // lane
    expect(g.state.score).toBe(2.5);
    say(g, 'go east'); // ford
    expect(g.state.score).toBe(5);
  });
});

describe('classic vs guided modes', () => {
  it('Classic refuses undo, hint, and the travel map', () => {
    const g = newGame();
    expect(say(g, 'undo')).toMatch(/guided/i);
    expect(say(g, 'hint')).toMatch(/guided/i);
    expect(say(g, 'map')).toMatch(/classic|no map/i);
  });

  it('Guided undo steps a move back', () => {
    const g = newGame();
    say(g, 'mode guided');
    say(g, 'go east');
    expect(g.state.currentLocationId).toBe('lane');
    expect(say(g, 'undo')).toMatch(/take back/i);
    expect(g.state.currentLocationId).toBe('hollow');
  });

  it('Guided offers a contextual hint and a discovered map', () => {
    const g = newGame();
    say(g, 'mode guided');
    expect(say(g, 'hint')).toMatch(/hint:/i);
    say(g, 'go east');
    expect(say(g, 'map')).toMatch(/Green Lane/i);
  });
});
