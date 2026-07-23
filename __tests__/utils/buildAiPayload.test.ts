import { describe, it, expect } from 'vitest';
import { buildAiPayload } from '../../utils/buildAiPayload';

describe('buildAiPayload', () => {
  it('renders the required header lines', () => {
    const out = buildAiPayload({ appName: 'arqavellum', route: '/' });
    expect(out).toContain('App: arqavellum');
    expect(out).toContain('Route: /');
    expect(out).toContain('Timestamp: ');
  });

  it('omits optional sections when not provided', () => {
    const out = buildAiPayload({ appName: 'arqavellum', route: '/' });
    expect(out).not.toContain('Title:');
    expect(out).not.toContain('Context:');
    expect(out).not.toContain('Params:');
    expect(out).not.toContain('Visible content:');
  });

  it('includes title, context, params when provided', () => {
    const out = buildAiPayload({
      appName: 'my-app',
      route: '/analytics',
      title: 'Analytics',
      contextLabel: 'Opened from dashboard quick action',
      params: { range: '12w', detail: true },
    });
    expect(out).toContain('App: my-app');
    expect(out).toContain('Route: /analytics');
    expect(out).toContain('Title: Analytics');
    expect(out).toContain('Context: Opened from dashboard quick action');
    expect(out).toMatch(/Params: .*range=12w/);
    expect(out).toMatch(/Params: .*detail=true/);
  });

  it('drops undefined and empty-string param values', () => {
    const out = buildAiPayload({
      appName: 'arqavellum',
      route: '/',
      params: { a: '1', b: undefined, c: '', d: 0, e: false },
    });
    expect(out).toContain('a=1');
    expect(out).not.toContain('b=');
    expect(out).not.toContain('c=');
    // 0 and false are real values — keep them.
    expect(out).toContain('d=0');
    expect(out).toContain('e=false');
  });

  it('appends the visible-content block with a blank separator', () => {
    const out = buildAiPayload({
      appName: 'arqavellum',
      route: '/',
      visibleContent: '- line one\n- line two',
    });
    expect(out).toMatch(/\n\nVisible content:\n- line one\n- line two$/);
  });

  it('trims visible content but preserves internal structure', () => {
    const out = buildAiPayload({
      appName: 'arqavellum',
      route: '/',
      visibleContent: '  \n  - keep me\n- also keep  \n  ',
    });
    expect(out).toContain('Visible content:');
    expect(out).toContain('- keep me');
    expect(out).toContain('- also keep');
    // Leading padding trimmed:
    expect(out).not.toMatch(/Visible content:\n\s+- keep/);
  });

  it('ignores whitespace-only visible content', () => {
    const out = buildAiPayload({
      appName: 'arqavellum',
      route: '/',
      visibleContent: '   \n  \t ',
    });
    expect(out).not.toContain('Visible content:');
  });

  it('ignores whitespace-only title / contextLabel', () => {
    const out = buildAiPayload({
      appName: 'arqavellum',
      route: '/',
      title: '   ',
      contextLabel: '\t\n',
    });
    expect(out).not.toContain('Title:');
    expect(out).not.toContain('Context:');
  });

  it('uses the supplied timestamp verbatim', () => {
    const fixed = new Date('2026-01-01T00:00:00.000Z');
    const out = buildAiPayload({ appName: 'arqavellum', route: '/', timestamp: fixed });
    expect(out).toContain('Timestamp: 2026-01-01T00:00:00.000Z');
  });

  it('is deterministic for the same inputs (modulo default timestamp)', () => {
    const fixed = new Date('2026-01-01T00:00:00.000Z');
    const a = buildAiPayload({
      appName: 'arqavellum',
      route: '/analytics',
      title: 'Analytics',
      params: { range: '12w' },
      timestamp: fixed,
    });
    const b = buildAiPayload({
      appName: 'arqavellum',
      route: '/analytics',
      title: 'Analytics',
      params: { range: '12w' },
      timestamp: fixed,
    });
    expect(a).toBe(b);
  });

  it('throws when required fields are missing or wrong type', () => {
    // @ts-expect-error — verifying runtime guard against misuse
    expect(() => buildAiPayload({ route: '/' })).toThrow();
    // @ts-expect-error — verifying runtime guard against misuse
    expect(() => buildAiPayload({ appName: 'x' })).toThrow();
    // @ts-expect-error — verifying runtime guard against misuse
    expect(() => buildAiPayload({})).toThrow();
  });
});
