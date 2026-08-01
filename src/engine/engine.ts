import type { CommandResult, GameState, Item, LogLine, Room } from './types';
import { INVENTORY } from './types';
import { parse } from './parser';
import type { ParsedCommand } from './parser';
import { tickWorld } from './simulation';
import { ROOMS, STARTING_ROOM } from '../world/rooms';
import { ITEMS } from '../world/items';
import { NPCS } from '../world/npcs';

/** Build a fresh game state. Deep-clones the world data so a new game is clean. */
export function createGame(): GameState {
  const state: GameState = {
    currentRoomId: STARTING_ROOM,
    rooms: structuredClone(ROOMS),
    items: structuredClone(ITEMS),
    npcs: structuredClone(NPCS),
    flags: {},
    turn: 0,
    log: [],
    gameOver: false,
  };
  state.log.push(...describeRoom(state));
  return state;
}

export function currentRoom(state: GameState): Room {
  return state.rooms[state.currentRoomId];
}

export function itemsInRoom(state: GameState): Item[] {
  return Object.values(state.items).filter(
    (i) => i.location === state.currentRoomId,
  );
}

export function inventory(state: GameState): Item[] {
  return Object.values(state.items).filter((i) => i.location === INVENTORY);
}

/**
 * Run one line of player input. Mutates `state` and returns the lines the UI
 * should append. Turn-consuming commands also advance the world simulation.
 */
export function execute(state: GameState, input: string): CommandResult {
  if (state.gameOver) {
    return { lines: [sys('The tale is over. Refresh to begin again.')], tookTurn: false };
  }

  const cmd = parse(input);
  const result = dispatch(state, cmd);

  if (result.tookTurn) {
    state.turn += 1;
    result.lines.push(...tickWorld(state));
  }

  state.log.push(...result.lines);
  return result;
}

function dispatch(state: GameState, cmd: ParsedCommand): CommandResult {
  switch (cmd.verb) {
    case 'go':
      return doGo(state, cmd);
    case 'look':
      return { lines: describeRoom(state), tookTurn: false };
    case 'examine':
      return doExamine(state, cmd);
    case 'take':
      return doTake(state, cmd);
    case 'drop':
      return doDrop(state, cmd);
    case 'inventory':
      return { lines: [listInventory(state)], tookTurn: false };
    case 'wait':
      return { lines: [action('Time passes.')], tookTurn: true };
    case 'help':
      return { lines: [helpText()], tookTurn: false };
    case 'unknown':
    default:
      return {
        lines: [err(`I don't understand "${cmd.raw}". Try "help".`)],
        tookTurn: false,
      };
  }
}

function doGo(state: GameState, cmd: ParsedCommand): CommandResult {
  if (!cmd.direction) {
    return { lines: [err('Go where? Try a direction like "north".')], tookTurn: false };
  }
  const dest = currentRoom(state).exits[cmd.direction];
  if (!dest) {
    return { lines: [err(`You can't go ${cmd.direction} from here.`)], tookTurn: false };
  }
  state.currentRoomId = dest;
  return { lines: describeRoom(state), tookTurn: true };
}

function doExamine(state: GameState, cmd: ParsedCommand): CommandResult {
  if (!cmd.noun) {
    return { lines: [err('Examine what?')], tookTurn: false };
  }
  const item = findVisibleItem(state, cmd.noun);
  if (!item) {
    return { lines: [err(`You see no ${cmd.noun} here.`)], tookTurn: false };
  }
  return { lines: [action(item.description)], tookTurn: false };
}

function doTake(state: GameState, cmd: ParsedCommand): CommandResult {
  if (!cmd.noun) {
    return { lines: [err('Take what?')], tookTurn: false };
  }
  const item = itemsInRoom(state).find((i) => matches(i, cmd.noun!));
  if (!item) {
    return { lines: [err(`There is no ${cmd.noun} here to take.`)], tookTurn: false };
  }
  if (!item.portable) {
    return { lines: [err(`You can't carry ${item.name}.`)], tookTurn: false };
  }
  item.location = INVENTORY;
  return { lines: [action(`You take ${item.name}.`)], tookTurn: true };
}

function doDrop(state: GameState, cmd: ParsedCommand): CommandResult {
  if (!cmd.noun) {
    return { lines: [err('Drop what?')], tookTurn: false };
  }
  const item = inventory(state).find((i) => matches(i, cmd.noun!));
  if (!item) {
    return { lines: [err(`You aren't carrying ${cmd.noun}.`)], tookTurn: false };
  }
  item.location = state.currentRoomId;
  return { lines: [action(`You drop ${item.name}.`)], tookTurn: true };
}

// --- helpers -------------------------------------------------------------

export function describeRoom(state: GameState): LogLine[] {
  const room = currentRoom(state);
  const lines: LogLine[] = [
    { kind: 'room', text: room.name },
    { kind: 'room', text: room.description },
  ];
  const here = itemsInRoom(state);
  if (here.length > 0) {
    lines.push(action(`You can see ${here.map((i) => i.name).join(', ')}.`));
  }
  return lines;
}

function findVisibleItem(state: GameState, noun: string): Item | undefined {
  return [...itemsInRoom(state), ...inventory(state)].find((i) => matches(i, noun));
}

function matches(item: Item, noun: string): boolean {
  const needle = noun.toLowerCase();
  if (item.id === needle) return true;
  if (item.name.toLowerCase().includes(needle)) return true;
  return (item.aliases ?? []).some((a) => a.toLowerCase() === needle);
}

function listInventory(state: GameState): LogLine {
  const items = inventory(state);
  if (items.length === 0) return action('You are carrying nothing.');
  return action(`You are carrying: ${items.map((i) => i.name).join(', ')}.`);
}

function helpText(): LogLine {
  return sys(
    [
      'Commands: go <direction> (or just "north"), look, examine <thing>,',
      'take <thing>, drop <thing>, inventory, wait, help.',
      'You can also click exits and objects instead of typing.',
    ].join(' '),
  );
}

const action = (text: string): LogLine => ({ kind: 'action', text });
const err = (text: string): LogLine => ({ kind: 'error', text });
const sys = (text: string): LogLine => ({ kind: 'system', text });
