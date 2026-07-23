// shared/fixtures/index.ts
// Barrel for demo fixtures. Consumed by the demo adapter (utils/supabase/
// repositories/demoAdapter.ts) and the /dev/knowalong showcase.

export {
  DEMO_SOURCE_ID,
  DEMO_USER_ID,
  demoSource,
  demoSections,
  demoLines,
  demoLemmas,
  demoForms,
  demoTokenOccurrences,
  demoAnalysisFixture,
} from './demoSources';
export { demoCards, demoReviewStates } from './demoCards';
export {
  DEMO_CONCEPT_IDS_BY_CODE,
  demoCoreConcepts,
  demoConceptProgress,
} from './demoConcepts';
