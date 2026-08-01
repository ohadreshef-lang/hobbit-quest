import { describe, it, expect } from 'vitest';
import { parse, resolveClause } from './index';
import { scope } from '../world/entities';
import { buildWorld } from '../content/m1';

describe('grammar', () => {
  it('expands direction abbreviations', () => {
    const [c] = parse('n');
    expect(c.verb).toBe('go');
    expect(c.direction).toBe('north');
  });

  it('segments multiple commands on AND and punctuation', () => {
    expect(parse('take rope and take apple')).toHaveLength(2);
    expect(parse('take rope. take apple')).toHaveLength(2);
    expect(parse('take rope, apple').length).toBeGreaterThanOrEqual(1);
  });

  it('parses ALL ... EXCEPT', () => {
    const [c] = parse('take all except the staff');
    expect(c.directObject?.kind).toBe('quantifier');
    expect(c.directObject?.except?.noun).toBe('staff');
  });

  it('parses quoted NPC-directed speech', () => {
    const [c] = parse('say to rowan "take lamp"');
    expect(c.verb).toBe('say');
    expect(c.speech).toBe('take lamp');
    expect(c.speechTargetNoun?.noun).toBe('rowan');
  });

  it('flags an unknown leading word', () => {
    const [c] = parse('frobnicate the lamp');
    expect(c.verb).toBe('unknown');
    expect(c.unknownWord).toBe('frobnicate');
  });
});

describe('resolver', () => {
  it('resolves adjective + noun to a single entity', () => {
    const s = buildWorld();
    const r = resolveClause(s, parse('take the brass lamp')[0]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.action.directObjectIds).toEqual(['brass-lamp']);
  });

  it('asks for clarification when a noun is ambiguous', () => {
    const s = buildWorld();
    const r = resolveClause(s, parse('take lamp')[0]);
    expect(r.ok).toBe(false);
    if (!r.ok && r.issue.code === 'ambiguous') {
      expect(r.issue.candidates.map((c) => c.id).sort()).toEqual(['brass-lamp', 'copper-lamp']);
    } else {
      throw new Error('expected ambiguity');
    }
  });

  it('reports a truly absent object as not-visible, not "unknown"', () => {
    const s = buildWorld();
    const r = resolveClause(s, parse('take the dragon')[0]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issue.code).toBe('not-visible');
  });

  it('ALL EXCEPT excludes the named thing', () => {
    const s = buildWorld();
    const r = resolveClause(s, parse('take all except the staff')[0]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.action.directObjectIds).not.toContain('staff');
      expect(r.action.directObjectIds).toContain('brass-lamp');
    }
  });

  it('hides contents of a closed opaque container', () => {
    const s = buildWorld();
    const ids = scope(s).map((e) => e.id);
    expect(ids).toContain('note'); // in the open pack
    expect(ids).not.toContain('ring'); // in the locked, opaque chest
  });
});
