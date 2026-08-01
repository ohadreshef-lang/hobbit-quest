import type { GameState, LogLine } from '../engine/types';
import { DIRECTIONS } from '../engine/types';
import { currentRoom, inventory, itemsInRoom } from '../engine/engine';
import { artFor } from './art';

export interface UIElements {
  sceneArt: HTMLElement;
  roomName: HTMLElement;
  log: HTMLElement;
  exits: HTMLElement;
  inventory: HTMLElement;
  roomItems: HTMLElement;
}

/** Callback the UI fires when the player clicks an exit or object. */
export type Intent = (command: string) => void;

export function grabElements(): UIElements {
  const byId = (id: string): HTMLElement => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing #${id} in the DOM`);
    return el;
  };
  return {
    sceneArt: byId('scene-art'),
    roomName: byId('room-name'),
    log: byId('log'),
    exits: byId('exits'),
    inventory: byId('inventory'),
    roomItems: byId('room-items'),
  };
}

/** Full re-render. Cheap enough for a text game; called after every turn. */
export function render(el: UIElements, state: GameState, onIntent: Intent): void {
  const room = currentRoom(state);

  // artFor returns author-authored inline SVG (never user input), so
  // assigning innerHTML here is safe and lets the vignette render.
  el.sceneArt.innerHTML = artFor(room.art);
  el.roomName.textContent = room.name;

  renderLog(el.log, state.log);
  renderExits(el.exits, state, onIntent);
  renderList(el.inventory, inventory(state), 'drop', 'Nothing yet.', onIntent);
  renderList(el.roomItems, itemsInRoom(state), 'take', 'Nothing of note.', onIntent);
}

function renderLog(container: HTMLElement, lines: LogLine[]): void {
  container.replaceChildren(
    ...lines.map((line) => {
      const p = document.createElement('p');
      p.className = `line line--${line.kind}`;
      p.textContent = line.text;
      return p;
    }),
  );
  container.scrollTop = container.scrollHeight;
}

function renderExits(container: HTMLElement, state: GameState, onIntent: Intent): void {
  const room = currentRoom(state);
  const available = DIRECTIONS.filter((d) => room.exits[d]);
  container.replaceChildren(
    ...available.map((dir) => {
      const btn = document.createElement('button');
      btn.className = 'exit-btn';
      btn.type = 'button';
      btn.textContent = dir;
      btn.addEventListener('click', () => onIntent(`go ${dir}`));
      return btn;
    }),
  );
}

function renderList(
  container: HTMLElement,
  items: { id: string; name: string }[],
  verb: 'take' | 'drop',
  emptyText: string,
  onIntent: Intent,
): void {
  if (items.length === 0) {
    const li = document.createElement('li');
    li.className = 'list-empty';
    li.textContent = emptyText;
    container.replaceChildren(li);
    return;
  }
  container.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement('li');
      const name = document.createElement('button');
      name.type = 'button';
      name.className = 'item-name';
      name.textContent = item.name;
      name.title = 'Examine';
      name.addEventListener('click', () => onIntent(`examine ${item.id}`));

      const act = document.createElement('button');
      act.type = 'button';
      act.className = 'item-action';
      act.textContent = verb;
      act.addEventListener('click', () => onIntent(`${verb} ${item.id}`));

      li.append(name, act);
      return li;
    }),
  );
}
