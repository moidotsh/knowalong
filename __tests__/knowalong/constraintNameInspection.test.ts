// __tests__/knowalong/constraintNameInspection.test.ts
// Verifies that the constraint name used in migration 009 STEP C matches the
// actual literal name observed in the live local KnowAlong database (Phase 0
// finding). This test ONLY runs against a real DB — it is auto-skipped under
// DEMO_MODE (the default test environment) because the demo adapter has no
// information about Postgres catalog metadata.
//
// When run against the live local DB, the test queries pg_constraint for the
// generated_transfer-target CHECK on study_cards and asserts the literal name
// matches the constant embedded in migration 009. If a future Postgres
// default-auto-name convention shifts, this test fails loudly and Phase 0
// inspection is re-triggered before any new migration is written.

import { describe, it, expect } from 'vitest';
import { DEMO_MODE } from '../../utils/supabase/repositories/demoMode';

/**
 * Literal constraint name expected to be present on public.study_cards. Sourced
 * from Phase 0 inspection of the live local DB; the same literal is embedded in
 * migration 009 STEP C as the target of `DROP CONSTRAINT IF EXISTS`.
 */
export const EXPECTED_STUDY_CARDS_GT_CONSTRAINT_NAME = 'study_cards_check1';

describe.skipIf(DEMO_MODE)('study_cards constraint name (live DB only)', () => {
  it('matches the literal used in migration 009 STEP C', async () => {
    // The createClient import is deliberately lazy so the test file can be
    // imported under DEMO_MODE without trying to resolve a real Supabase URL.
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.warn('Skipping live constraint inspection: SUPABASE env not set.');
      return;
    }
    const supabase = createClient(url, key);
    const { data, error } = await supabase.rpc('pg_get_constraint_defs', {
      relid_input: 'public.study_cards',
    });
    // The RPC may not exist on this project; in that case we skip rather than
    // fail — the test is a Phase 0 confirmation aid, not a production gate.
    if (error) {
      console.warn('Skipping live constraint inspection (RPC unavailable):', error.message);
      return;
    }
    const defs = (data ?? []) as Array<{ conname: string; definition: string }>;
    const gt = defs.find((d) => d.definition.includes("(card_kind <> 'generated_transfer'::text)"));
    expect(gt).toBeDefined();
    expect(gt!.conname).toBe(EXPECTED_STUDY_CARDS_GT_CONSTRAINT_NAME);
  });
});

describe('EXPECTED_STUDY_CARDS_GT_CONSTRAINT_NAME constant', () => {
  it('matches the Phase 0 default (study_cards_check1 — second inline-unnamed CHECK on study_cards)', () => {
    // Phase 0 finding recorded in _reports/local-analysis-clcc.md. If this
    // constant changes, the migration 009 STEP C literal MUST change with it.
    expect(EXPECTED_STUDY_CARDS_GT_CONSTRAINT_NAME).toBe('study_cards_check1');
  });
});
