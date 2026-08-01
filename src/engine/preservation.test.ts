import { describe, it, expect } from 'vitest';
import { Game } from './game';

const say = (g: Game, cmd: string): string => g.submit(cmd).map((l) => l.text).join('\n');

// The default deployed world uses the preservation name pack.
describe('preservation name pack', () => {
  it('applies the historical location titles', () => {
    const g = new Game();
    expect(g.state.locations['home'].title).toBe('Bag End');
    expect(g.state.locations['haven'].title).toBe('Rivendell');
    expect(g.state.locations['wood'].title).toBe('Mirkwood');
  });

  it('accepts the historical character names in commands', () => {
    const g = new Game();
    expect(say(g, 'examine gandalf')).not.toMatch(/can't see|understand/i);
    expect(say(g, 'examine thorin')).not.toMatch(/can't see|understand/i);
  });

  it('still accepts the original-world names too', () => {
    const g = new Game();
    expect(say(g, 'examine wizard')).not.toMatch(/can't see|understand/i);
  });

  it('names the characters in the opening briefing', () => {
    const g = new Game();
    const opening = g.state.log.map((l) => l.text).join('\n');
    expect(opening).toMatch(/Gandalf/);
    expect(opening).toMatch(/Smaug/);
  });
});
