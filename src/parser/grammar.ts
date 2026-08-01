/**
 * Grammar: turn tokens into structured clauses (spec §8 grammar + pipeline
 * steps 3–5). This layer is purely syntactic — it does not touch the world.
 * Noun phrases are captured; the resolver binds them to entities later.
 */
import type { Direction } from '../world/types';
import type { Token } from './lexer';
import {
  ADVERBS, CONJUNCTIONS, DETERMINERS, DIRECTION_WORDS, EXCEPT_WORDS,
  IN_PREPOSITIONS, PREPOSITIONS, PRONOUNS, QUANTIFIERS, VERBS,
} from './vocabulary';

/** A noun phrase, unresolved. */
export interface NounPhrase {
  kind: 'quantifier' | 'pronoun' | 'named';
  /** For 'named': the head noun. */
  noun?: string | undefined;
  adjectives: string[];
  pronoun?: string | undefined;
  /** For ALL X EXCEPT Y. */
  except?: NounPhrase | undefined;
}

export interface Clause {
  verb: string;
  adverb?: string | undefined;
  direction?: Direction | undefined;
  directObject?: NounPhrase | undefined;
  preposition?: string | undefined;
  indirectObject?: NounPhrase | undefined;
  /** For SAY TO <npc> "<quoted>". */
  speechTargetNoun?: NounPhrase | undefined;
  speech?: string | undefined;
  /** The original text of this clause, for error messages. */
  raw: string;
  /** A word the parser did not recognize at all. */
  unknownWord?: string | undefined;
}

/** Split a token stream into clause-sized token runs (spec §8 step 4). */
export function segment(tokens: Token[]): Token[][] {
  const clauses: Token[][] = [];
  let cur: Token[] = [];
  for (const t of tokens) {
    const isSep = !t.quoted &&
      (t.value === ',' || t.value === ';' || t.value === '.' || CONJUNCTIONS.has(t.value));
    if (isSep) {
      if (cur.length) { clauses.push(cur); cur = []; }
    } else {
      cur.push(t);
    }
  }
  if (cur.length) clauses.push(cur);
  return clauses;
}

function rawOf(tokens: Token[]): string {
  return tokens.map((t) => (t.quoted ? `"${t.value}"` : t.value)).join(' ');
}

/** Parse one clause's tokens into a Clause. */
export function parseClause(tokens: Token[]): Clause {
  const raw = rawOf(tokens);
  if (tokens.length === 0) return { verb: 'unknown', raw };

  const first = tokens[0];

  // Bare direction ("n", "go" handled below too).
  if (!first.quoted && first.value in DIRECTION_WORDS) {
    return { verb: 'go', direction: DIRECTION_WORDS[first.value], raw };
  }

  if (first.quoted || !(first.value in VERBS)) {
    return { verb: 'unknown', unknownWord: first.value, raw };
  }

  const verb = VERBS[first.value];
  let idx = 1;

  // "pick up X" -> take X
  if (verb === 'take' && tokens[idx] && tokens[idx].value === 'up') idx++;

  // GO <direction>
  if (verb === 'go') {
    const dirTok = tokens[idx];
    if (dirTok && dirTok.value in DIRECTION_WORDS) {
      return { verb: 'go', direction: DIRECTION_WORDS[dirTok.value], raw };
    }
    return { verb: 'go', raw };
  }

  // SAY [TO] <npc> "<quoted>"  (also: tell/ask <npc> "...")
  if (verb === 'say') {
    if (tokens[idx] && tokens[idx].value === 'to') idx++;
    const targetTokens: Token[] = [];
    while (tokens[idx] && !tokens[idx].quoted) targetTokens.push(tokens[idx++]);
    const speechTok = tokens[idx];
    const speech = speechTok && speechTok.quoted ? speechTok.value : undefined;
    return {
      verb: 'say',
      speechTargetNoun: targetTokens.length ? parseNounPhrase(targetTokens) : undefined,
      speech,
      raw,
    };
  }

  // Optional leading adverb.
  let adverb: string | undefined;
  if (tokens[idx] && ADVERBS.has(tokens[idx].value)) adverb = tokens[idx++].value;

  // Direct object noun phrase: everything up to a preposition.
  const doTokens: Token[] = [];
  while (tokens[idx] && !PREPOSITIONS.has(tokens[idx].value) && !ADVERBS.has(tokens[idx].value)) {
    doTokens.push(tokens[idx++]);
  }

  // Trailing adverb (e.g. "attack goblin viciously").
  if (tokens[idx] && ADVERBS.has(tokens[idx].value)) adverb = tokens[idx++].value;

  // Optional relation: preposition + indirect object.
  let preposition: string | undefined;
  let ioTokens: Token[] = [];
  if (tokens[idx] && PREPOSITIONS.has(tokens[idx].value)) {
    preposition = IN_PREPOSITIONS.has(tokens[idx].value) ? 'in' : tokens[idx].value;
    idx++;
    while (tokens[idx]) ioTokens.push(tokens[idx++]);
  }

  return {
    verb,
    adverb,
    directObject: doTokens.length ? parseNounPhrase(doTokens) : undefined,
    preposition,
    indirectObject: ioTokens.length ? parseNounPhrase(ioTokens) : undefined,
    raw,
  };
}

/** Parse a noun phrase: quantifier | pronoun | [det] {adj} noun [EXCEPT np]. */
export function parseNounPhrase(tokens: Token[]): NounPhrase {
  const words = tokens.filter((t) => !t.quoted).map((t) => t.value);

  // ALL / EVERYTHING [EXCEPT ...]
  if (words.length && QUANTIFIERS.has(words[0])) {
    const exceptIdx = words.findIndex((w) => EXCEPT_WORDS.has(w));
    const except = exceptIdx >= 0
      ? parseNounPhrase(tokens.slice(exceptIdx + 1))
      : undefined;
    return { kind: 'quantifier', adjectives: [], except };
  }

  // Pronoun.
  if (words.length === 1 && PRONOUNS.has(words[0])) {
    return { kind: 'pronoun', pronoun: words[0], adjectives: [] };
  }

  // [determiner] {adjective} noun   (noun = last non-determiner word)
  const meaningful = words.filter((w) => !DETERMINERS.has(w));
  if (meaningful.length === 0) return { kind: 'named', adjectives: [] };
  const noun = meaningful[meaningful.length - 1];
  const adjectives = meaningful.slice(0, -1);
  return { kind: 'named', noun, adjectives };
}
