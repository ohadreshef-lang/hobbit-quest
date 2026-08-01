import './styles.css';
import { createGame, execute } from './engine/engine';
import { grabElements, render } from './ui/render';

const state = createGame();
const el = grabElements();

function run(command: string): void {
  execute(state, command);
  render(el, state, run);
  focusInput();
}

const form = document.getElementById('command-form') as HTMLFormElement;
const input = document.getElementById('command-input') as HTMLInputElement;

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  input.value = '';
  run(value);
});

function focusInput(): void {
  input.focus();
}

// First paint.
render(el, state, run);
focusInput();
