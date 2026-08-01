import { describe, expect, it } from 'vitest';
import { createGame, execute, inventory } from './engine';

describe('engine', () => {
  it('starts in the comfortable hall', () => {
    const game = createGame();
    expect(game.currentRoomId).toBe('hall');
    expect(game.log.some((l) => l.text.includes('comfortable tunnel-like hall'))).toBe(true);
  });

  it('moves between rooms via a direction word', () => {
    const game = createGame();
    execute(game, 'east');
    expect(game.currentRoomId).toBe('front-door');
  });

  it('refuses impossible exits without taking a turn', () => {
    const game = createGame();
    const before = game.turn;
    const result = execute(game, 'go north');
    expect(game.currentRoomId).toBe('hall');
    expect(game.turn).toBe(before);
    expect(result.lines.some((l) => l.kind === 'error')).toBe(true);
  });

  it('takes an item from the room into the inventory', () => {
    const game = createGame();
    execute(game, 'take key');
    expect(inventory(game).some((i) => i.id === 'key')).toBe(true);
    expect(game.items.key.location).toBe('inventory');
  });

  it('ticks the world only on turn-consuming commands', () => {
    const game = createGame();
    execute(game, 'look');
    expect(game.turn).toBe(0);
    execute(game, 'wait');
    expect(game.turn).toBe(1);
  });
});
