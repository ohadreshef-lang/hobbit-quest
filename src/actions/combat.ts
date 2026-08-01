/**
 * Combat (spec §12): command-driven, resolved through shared physical
 * attributes and the seeded RNG. Observable outcomes only — no raw numbers in
 * the prose. A dead entity keeps its body and inventory in the world (§11).
 */
import type { Entity, GameState } from '../world/types';
import { chance, randInt } from '../world/rng';
import { Name, name } from '../narration/events';

export interface Strike {
  lines: string[];
  killed: boolean;
}

/**
 * Effective attack power: a wielded weapon's solidity if armed, else the
 * attacker's own strength (a bare fist is weak; a dragon's claws are not).
 */
function power(attacker: Entity, weapon?: Entity): number {
  const base = weapon?.capabilities.has('weapon') ? weapon.solidity : (attacker.strength ?? 2);
  const vigor = attacker.agent ? attacker.agent.energy / 50 : 1;
  return base * vigor;
}

/** One exchange: attacker swings at target. Mutates energies/states. */
export function strike(state: GameState, attacker: Entity, target: Entity, weapon?: Entity): Strike {
  const lines: string[] = [];
  if (!target.agent) {
    return { lines: [`${Name(target)} can't be fought — try breaking it instead.`], killed: false };
  }

  // Swinging is tiring whether or not it lands.
  if (attacker.agent) attacker.agent.energy = Math.max(0, attacker.agent.energy - randInt(state, 1, 3));

  const hitChance = Math.max(0.1, Math.min(0.9, 0.55 + (power(attacker, weapon) - target.solidity) * 0.05));
  if (!chance(state, hitChance)) {
    lines.push(`${Name(attacker)} ${weapon ? `swing${sfx(attacker)} ${name(weapon)}` : `lunge${sfx(attacker)}`} at ${name(target)} and miss${attacker.id === 'player' ? '' : 'es'}.`);
    return { lines, killed: false };
  }

  const damage = randInt(state, 8, 20) + Math.round(power(attacker, weapon));
  target.agent.energy = Math.max(0, target.agent.energy - damage);
  const hurt = target.agent.energy <= 0;

  if (hurt) {
    target.agent.energy = 0;
    target.states.delete('alive');
    target.states.add('dead');
    lines.push(`${Name(attacker)} strike${sfx(attacker)} ${name(target)} down. ${Name(target)} lies still.`);
    return { lines, killed: true };
  }

  const wound = target.agent.energy < 30 ? ' It looks badly hurt.' : '';
  lines.push(`${Name(attacker)} land${sfx(attacker)} a solid blow on ${name(target)}.${wound}`);
  return { lines, killed: false };
}

const sfx = (e: Entity): string => (e.id === 'player' ? '' : 's');
