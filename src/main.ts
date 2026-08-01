/**
 * Wiring: form input -> Game.submit -> re-render. The engine owns all state;
 * the UI is a thin view plus command history (spec §7 command entry).
 */
import './styles.css';
import { Game } from './engine/game';
import { grabElements, render } from './ui/render';

const game = new Game();
const el = grabElements();
render(el, game.state);

const form = document.getElementById('command-form') as HTMLFormElement;
const input = document.getElementById('command-input') as HTMLInputElement;

const history: string[] = [];
let historyPos = -1;

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  history.push(text);
  historyPos = history.length;
  game.submit(text);
  render(el, game.state);
  input.value = '';
  input.focus();
});

// Up/Down cycle command history; Escape clears the field.
input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    if (historyPos > 0) { historyPos -= 1; input.value = history[historyPos]; }
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    if (historyPos < history.length - 1) { historyPos += 1; input.value = history[historyPos]; }
    else { historyPos = history.length; input.value = ''; }
    e.preventDefault();
  } else if (e.key === 'Escape') {
    input.value = '';
  }
});
