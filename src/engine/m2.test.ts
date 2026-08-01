import { describe, it, expect } from 'vitest';
import { Game } from './game';
import { serialize, deserialize, hashState } from '../persistence/save';
import { buildWorld as buildM2 } from '../content/m2';

const say = (g: Game, cmd: string): string => g.submit(cmd).map((l) => l.text).join('\n');
const newM2 = (): Game => new Game(buildM2);

/** Put the player in the tunnel with a lit lamp, goblin neutralized. */
function inTunnel(g: Game, ...hold: string[]): void {
  const s = g.state;
  s.entities['lamp'].locationId = 'player';
  s.entities['lamp'].states.add('lit');
  for (const id of hold) s.entities[id].locationId = 'player';
  s.entities['goblin'].states.delete('alive');
  s.entities['goblin'].states.add('dead');
  s.currentLocationId = 'tunnel';
}

describe('darkness & light', () => {
  it('the tunnel is unusable without a light source', () => {
    const g = newM2();
    say(g, 'take staff'); say(g, 'go east'); say(g, 'go east');
    say(g, 'break door with staff');
    const dark = say(g, 'go down');
    expect(dark).toMatch(/pitch dark/i);
    expect(say(g, 'examine goblin')).toMatch(/can't see|dark/i);
  });

  it('a lit lamp reveals the tunnel and its contents', () => {
    const g = newM2();
    say(g, 'take lamp'); say(g, 'light lamp'); say(g, 'take staff');
    say(g, 'go east'); say(g, 'go east'); say(g, 'break door with staff');
    const lit = say(g, 'go down');
    expect(lit).toMatch(/ravine|goblin/i);
  });
});

describe('breakable door', () => {
  it('breaks with a solid tool and opens the way down', () => {
    const g = newM2();
    say(g, 'take staff'); say(g, 'go east'); say(g, 'go east');
    expect(say(g, 'break door with staff')).toMatch(/smash|apart/i);
    expect(g.state.flags['door-broken']).toBe(true);
  });

  it('refuses a tool that is too weak', () => {
    const g = newM2();
    say(g, 'take rope'); say(g, 'go east'); say(g, 'go east');
    expect(say(g, 'break door with rope')).toMatch(/strong enough|nothing solid/i);
    expect(g.state.flags['door-broken']).toBeUndefined();
  });
});

describe('combat', () => {
  it('a goblin can be fought down with a weapon', () => {
    const g = newM2();
    g.state.entities['staff'].locationId = 'player';
    g.state.entities['lamp'].locationId = 'player';
    g.state.entities['lamp'].states.add('lit');
    g.state.currentLocationId = 'tunnel';
    for (let i = 0; i < 12 && g.state.entities['goblin'].states.has('alive') && !g.state.gameOver; i++) {
      say(g, 'kill goblin with staff');
    }
    expect(g.state.entities['goblin'].states.has('dead')).toBe(true);
  });
});

describe('the ravine — one obstacle, three solutions', () => {
  it('solution 1: tie the rope to the stone outcrop', () => {
    const g = newM2();
    inTunnel(g, 'rope');
    say(g, 'tie rope to stump');
    expect(g.state.flags['ravine-bridged']).toBe(true);
    say(g, 'go east');
    expect(g.state.currentLocationId).toBe('ledge');
  });

  it('solution 2: lay the plank across the ravine', () => {
    const g = newM2();
    inTunnel(g, 'plank');
    say(g, 'put plank across ravine');
    expect(g.state.flags['ravine-bridged']).toBe(true);
    say(g, 'go east');
    expect(g.state.currentLocationId).toBe('ledge');
  });

  it('solution 3: a friendly companion helps you across', () => {
    const g = newM2();
    inTunnel(g);
    g.state.entities['rowan'].locationId = 'tunnel';
    const out = say(g, 'go east');
    expect(out).toMatch(/helps you across/i);
    expect(g.state.currentLocationId).toBe('ledge');
  });

  it('taking the hoard-gold wins the game', () => {
    const g = newM2();
    inTunnel(g, 'plank');
    say(g, 'put plank across ravine');
    say(g, 'go east');
    say(g, 'take gold');
    expect(g.state.outcome).toBe('win');
    expect(g.state.gameOver).toBe(true);
  });
});

describe('living world & determinism', () => {
  it('an NPC moves on its own, off-screen', () => {
    const g = newM2(); // Rowan starts on the slope; player is in the hall
    say(g, 'wait');
    expect(g.state.entities['rowan'].locationId).not.toBe('slope');
  });

  it('same seed + same commands replay to an identical state hash', () => {
    const cmds = ['take lamp', 'light lamp', 'take staff', 'go east', 'go east', 'break door with staff', 'go down', 'wait', 'wait'];
    const play = (): string => {
      const g = newM2();
      for (const c of cmds) g.submit(c);
      return hashState(g.state);
    };
    expect(play()).toBe(play());
  });

  it('a restored save reproduces the exact next random events', () => {
    const prefix = ['take lamp', 'light lamp', 'take staff', 'go east', 'go east', 'break door with staff', 'go down'];
    const suffix = ['wait', 'wait', 'wait'];

    const g = newM2();
    for (const c of prefix) g.submit(c);
    const snapshot = serialize(g.state);
    for (const c of suffix) g.submit(c);
    const hashA = hashState(g.state);

    const g2 = newM2();
    g2.state = deserialize(snapshot);
    for (const c of suffix) g2.submit(c);
    const hashB = hashState(g2.state);

    expect(hashB).toBe(hashA);
  });
});
