/**
 * Renderer: the transcript is the authoritative view; the illustration is
 * atmospheric (spec §7). A full re-render each turn is cheap for a text game.
 */
import type { GameState, LogLine } from '../world/types';
import { currentLocation } from '../world/entities';
import { artFor } from './art';

export interface UIElements {
  title: HTMLElement;
  score: HTMLElement;
  sceneArt: HTMLElement;
  log: HTMLElement;
}

export function grabElements(): UIElements {
  const byId = (id: string): HTMLElement => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing #${id} in the DOM`);
    return el;
  };
  return {
    title: byId('loc-title'),
    score: byId('score'),
    sceneArt: byId('scene-art'),
    log: byId('log'),
  };
}

export function render(el: UIElements, state: GameState): void {
  const loc = currentLocation(state);
  el.title.textContent = loc.title;
  el.score.textContent = `Score ${state.score}%`;
  // artFor returns author-authored inline SVG (never user input).
  el.sceneArt.innerHTML = artFor(loc.art);

  el.log.replaceChildren(
    ...state.log.map((line: LogLine) => {
      const p = document.createElement('p');
      p.className = `line line--${line.kind}`;
      p.textContent = line.text;
      return p;
    }),
  );
  el.log.scrollTop = el.log.scrollHeight;
}
