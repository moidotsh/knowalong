// __tests__/knowalong/goldenBundle.ts
//
// The golden Studio bundle, shared by packRelease.test.ts (the parser
// contract) and packLessonSmoke.test.ts (the end-to-end lesson smoke).
// ONE source of truth so the two consumers cannot drift.

/**
 * The exact serialized bytes Studio's delivery tests produce for the
 * SEED-TRIPLE workspace (tests/delivery.test.ts freezeSeedTriple(): 3 ru
 * entries over learner seed codes EXIST, GO, WANT, with cited examples).
 * Transport createdAt is a pinned timestamp (outside the content
 * identity). Every entry here is inside the 40-code seed layer, so this
 * bundle is fully consumable — the overlay cases are built in
 * packRelease.test.ts by extending it.
 *
 * Recaptured 2026-10-03 (releaseId ru.c27faa6f3810) after the Phase 8.1
 * canon fix: evidence.lockedAt is projected to null in canonicalContent
 * on BOTH sides (lock wall-clock time is outside the content identity).
 * Regenerate via the studio repo:
 *   GOLDEN_CAPTURE=1 bun test scripts/capture-learner-golden.test.ts
 * and update the pinned releaseId/hash in packRelease.test.ts to match.
 */
export const GOLDEN_BUNDLE_JSON =
  '{"bundleSchemaVersion":1,"packContractSchemaVersion":1,"release":{"schemaVersion":1,"releaseId":"ru.c27faa6f3810","languageCode":"ru","scopeId":"test-ru-v1","scopeVersion":1,"buildId":null,"createdAt":"2026-10-03T05:34:59.572Z","contentSha256":"c27faa6f38107ead655b93675bc3d8570238211af5878c9b625d245c32f3eaa6","declaredScope":["EXIST","GO","WANT"],"entries":[{"entryId":"EXIST/word/есть","languageCode":"ru","coreConceptCode":"EXIST","realizationType":"word","surfaceForm":"есть","transliteration":"est\'","gloss":"there is / to be","grammaticalNote":null,"grammar":null,"lemma":null,"pos":null,"sourceCorroborated":false,"examples":[{"sourceText":"Бог есть.","translation":"God exists.","sourceCorpus":"tatoeba","sourceAttribution":"Tatoeba Corpus (CC-BY 2.0)"}],"prerequisites":[],"enables":[],"evidence":{"provenance":"catalog-sourced","tier":"citation-backed","bindingWatermark":null,"bindingStatusAtFreeze":"unbound","lockedAt":"2026-09-01T00:00:00.000Z"}},{"entryId":"GO/word/идти","languageCode":"ru","coreConceptCode":"GO","realizationType":"word","surfaceForm":"идти","transliteration":"idti","gloss":"to go","grammaticalNote":null,"grammar":null,"lemma":null,"pos":null,"sourceCorroborated":false,"examples":[{"sourceText":"Я иду домой.","translation":"I am going home.","sourceCorpus":"tatoeba","sourceAttribution":"Tatoeba Corpus (CC-BY 2.0)"}],"prerequisites":[],"enables":[],"evidence":{"provenance":"catalog-sourced","tier":"citation-backed","bindingWatermark":null,"bindingStatusAtFreeze":"unbound","lockedAt":"2026-09-01T00:00:00.000Z"}},{"entryId":"WANT/word/хотеть","languageCode":"ru","coreConceptCode":"WANT","realizationType":"word","surfaceForm":"хотеть","transliteration":"khotet\'","gloss":"to want","grammaticalNote":null,"grammar":null,"lemma":null,"pos":null,"sourceCorroborated":false,"examples":[{"sourceText":"Дети хотят играть.","translation":"Children want to play.","sourceCorpus":"tatoeba","sourceAttribution":"Tatoeba Corpus (CC-BY 2.0)"}],"prerequisites":[],"enables":[],"evidence":{"provenance":"catalog-sourced","tier":"citation-backed","bindingWatermark":null,"bindingStatusAtFreeze":"unbound","lockedAt":"2026-09-01T00:00:00.000Z"}}],"exclusions":[],"sources":[{"kind":"corpus-example","name":"tatoeba","title":"tatoeba","attribution":"Tatoeba Corpus (CC-BY 2.0)"}],"qualityDistribution":{"citationBacked":3,"frontierVerified":0,"unboundAtFreeze":3},"policy":{"embeddingRescueAtFreeze":"not-run"}}}';
