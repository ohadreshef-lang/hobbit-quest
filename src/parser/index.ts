/**
 * Public parser entry. Turns a raw command line into structured clauses
 * (syntax only). Resolution against the world happens in resolver.ts so the
 * two concerns stay testable in isolation.
 */
import { tokenize } from './lexer';
import { parseClause, segment, type Clause } from './grammar';

export type { Clause, NounPhrase } from './grammar';
export { resolveClause } from './resolver';
export type { SemanticAction, Resolution, Ambiguity, ResolveFailure } from './resolver';

/** Parse a command line into one or more syntactic clauses. */
export function parse(input: string): Clause[] {
  const tokens = tokenize(input);
  return segment(tokens).map(parseClause);
}
