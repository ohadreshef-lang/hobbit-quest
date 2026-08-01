/**
 * Lexer: normalize and tokenize a command line while preserving quoted
 * speech as a single token (spec §8 pipeline steps 1–2). Case is folded for
 * matching, but the original quoted text is kept verbatim for re-parsing.
 */

export interface Token {
  /** Lowercased word, or the inner text of a quote. */
  value: string;
  /** True when this token came from inside quotation marks. */
  quoted: boolean;
}

const CLAUSE_PUNCT = /[,;.]/;

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i];

    // Whitespace
    if (/\s/.test(ch)) { i++; continue; }

    // Quoted speech: keep everything up to the closing quote as one token.
    if (ch === '"' || ch === '“') {
      i++;
      let buf = '';
      while (i < n && input[i] !== '"' && input[i] !== '”' && input[i] !== '“') {
        buf += input[i++];
      }
      if (i < n) i++; // consume closing quote
      tokens.push({ value: buf.trim(), quoted: true });
      continue;
    }

    // Clause punctuation becomes its own separator token.
    if (CLAUSE_PUNCT.test(ch)) {
      tokens.push({ value: ch, quoted: false });
      i++;
      continue;
    }

    // A run of word characters (letters, digits, apostrophes, hyphens).
    let buf = '';
    while (i < n && !/\s/.test(input[i]) && !CLAUSE_PUNCT.test(input[i]) &&
           input[i] !== '"' && input[i] !== '“' && input[i] !== '”') {
      buf += input[i++];
    }
    if (buf) tokens.push({ value: buf.toLowerCase(), quoted: false });
  }

  return tokens;
}
