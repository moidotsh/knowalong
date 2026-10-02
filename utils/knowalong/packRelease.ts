// utils/knowalong/packRelease.ts
//
// Phase 4 — the REAL learner pack reader (handoff item 5): an actual
// consumer of a Studio frozen release bundle, behind the existing
// SpineProvider seam. The local integration runs through THIS reader —
// not a Studio mock and not the fixture spine.
//
// The bundle it reads is produced by Studio's
// knowalong-studio/lib/delivery/bundle.ts: a versioned transport
// envelope around the frozen release contract. The reader:
//
//   1. validates the envelope + contract dialect (unsupported
//      versions are NAMED rejections, never best-effort parses),
//   2. re-computes the content hash over the mirrored canonical form
//      (checksum failure = the artifact was edited after freeze),
//   3. enforces the cross-field consistency rules (mixed-language
//      rows, detached entryIds, duplicate identities, unsorted scope,
//      dangling teaching edges, lying quality tallies),
//   4. projects the release onto the spine through the LEARNER SEED
//      LAYER ONLY (the 40 Tier 0–2 codes — the verified cross-repo
//      contract). Overlay codes (Studio Tiers 3–9) are counted and
//      exposed, never silently consumed and never silently dropped.
//
// Failure posture (handoff item 8): in production mode a failed read
// THROWS an actionable PackReleaseError — an empty, corrupt, or
// wrong-language release can never silently render fixture content
// and look like a successful publication. A clearly-labeled demo mode
// exists and says so on its face.
//
// Cross-repo honesty note: the contract shapes here are a hand mirror
// of Studio's packContract.ts (the handoff explicitly defers a shared
// package for a small contract). The golden bundle fixture in
// __tests__/knowalong/packRelease.test.ts is byte-identical to the
// one Studio's tests/delivery.test.ts produces, so the two
// implementations are pinned to the same artifact.
//
// Known v1 limitation (recorded, not hidden): the pack contract
// carries one surfaceForm + gloss per entry and no per-token spans,
// so a phrase/construction entry becomes ONE chip part — the
// default-to-single-atom treatment, kept honest here because the
// contract cannot yet express decomposition. Token/span decomposition
// needs a contract v2 and is recorded as deferred work.

import { z } from 'zod';
import type { LessonStep } from './fixtures/decks';
import type { WordRole } from './fixtures/learningItems';
import { createMockSpine, type SpineProvider } from './spine';

// ── Dialect versions (mirrors of Studio's bundle.ts) ─────────────────

export const RELEASE_BUNDLE_SCHEMA_VERSION = 1 as const;
export const PACK_CONTRACT_SCHEMA_VERSION = 1 as const;

// ── The learner seed layer (verified cross-repo contract) ────────────

/**
 * The 40 Tier 0–2 concept codes the learner side owns (seeded by
 * supabase/migrations/20260722000003_knowalong_core_concepts.sql).
 * Mirrored from knowalong-studio lib/clcc/taxonomy.ts LEARNER_SEED_CODES
 * (Phase 0.5 audit). A release entry outside this set is a
 * Studio-side extension: it stays Studio-side — counted in
 * `overlayEntries`, never mapped into the spine — until the reviewed
 * learner migration adopts those codes.
 */
export const LEARNER_SEED_CODES: readonly string[] = [
  'FIRST_PERSON', 'SECOND_PERSON', 'THIRD_PERSON', 'POSSESS',
  'EXIST', 'WANT', 'NEED', 'CAN_ABILITY', 'NEGATION',
  'LIKE_PREFER', 'GO', 'COME', 'MOVE_TO', 'MOVE_FROM',
  'LIVE_STAY', 'LOCATE_IN', 'LOCATE_ON', 'SEE', 'HEAR',
  'KNOW', 'THINK', 'UNDERSTAND', 'SAY',
  'QUESTION_PERSON', 'QUESTION_THING', 'QUESTION_PLACE', 'QUESTION_TIME',
  'TIME_NOW', 'TIME_BEFORE', 'TIME_AFTER',
  'QUANTITY_ONE', 'QUANTITY_MANY', 'QUANTITY_SOME',
  'MORE', 'LESS', 'SAME', 'DIFFERENT',
  'REASON_BECAUSE', 'CONTRAST_BUT', 'CONDITION_IF',
];

const SEED = new Set<string>(LEARNER_SEED_CODES);

// ── Contract mirror (the subset the reader consumes/validates) ───────

const PackExampleMirror = z.object({
  sourceText: z.string().min(1),
  translation: z.string().min(1),
  sourceCorpus: z.string().min(1),
  sourceAttribution: z.string().min(1),
});

const PackEntryMirror = z.object({
  entryId: z.string().min(1),
  languageCode: z.string().min(2).max(16),
  coreConceptCode: z.string().min(1),
  realizationType: z.enum(['word', 'phrase', 'construction', 'feature', 'morpheme']),
  surfaceForm: z.string().min(1),
  transliteration: z.string().nullable(),
  gloss: z.string().nullable(),
  grammaticalNote: z.string().nullable(),
  grammar: z.unknown().nullable(),
  lemma: z.string().nullable(),
  pos: z.string().nullable(),
  sourceCorroborated: z.boolean(),
  examples: z.array(PackExampleMirror),
  prerequisites: z.array(z.string()),
  enables: z.array(z.string()),
  evidence: z
    .object({
      provenance: z.string(),
      tier: z.enum(['citation-backed', 'frontier-verified']),
      bindingWatermark: z.number().nullable(),
      bindingStatusAtFreeze: z.enum(['fresh', 'unbound']),
      lockedAt: z.string().nullable(),
    })
    .passthrough(),
});
export type PackEntry = z.infer<typeof PackEntryMirror>;

const FrozenReleaseMirror = z
  .object({
    schemaVersion: z.literal(PACK_CONTRACT_SCHEMA_VERSION),
    releaseId: z.string().min(1),
    languageCode: z.string().min(2).max(16),
    scopeId: z.string().min(1),
    scopeVersion: z.number().int().min(1),
    buildId: z.string().nullable(),
    createdAt: z.string().min(1),
    contentSha256: z.string().length(64),
    declaredScope: z.array(z.string()),
    entries: z.array(PackEntryMirror),
    exclusions: z.array(z.unknown()),
    sources: z.array(z.unknown()),
    qualityDistribution: z.object({
      citationBacked: z.number().int().min(0),
      frontierVerified: z.number().int().min(0),
      unboundAtFreeze: z.number().int().min(0),
    }),
    policy: z.unknown(),
  })
  .passthrough();
export type FrozenPackRelease = z.infer<typeof FrozenReleaseMirror>;

const ReleaseBundleMirror = z.object({
  bundleSchemaVersion: z.literal(RELEASE_BUNDLE_SCHEMA_VERSION),
  packContractSchemaVersion: z.literal(PACK_CONTRACT_SCHEMA_VERSION),
  release: FrozenReleaseMirror,
});

// ── Errors (actionable, typed) ────────────────────────────────────────

export type PackReleaseErrorKind =
  | 'unsupported-bundle-version'
  | 'unsupported-contract-version'
  | 'wrong-language'
  | 'checksum-mismatch'
  | 'invalid-shape'
  | 'inconsistent';

export class PackReleaseError extends Error {
  readonly kind: PackReleaseErrorKind;
  constructor(kind: PackReleaseErrorKind, message: string) {
    super(message);
    this.name = 'PackReleaseError';
    this.kind = kind;
  }
}

// ── Canonical form + checksum (mirror of Studio canonicalContent) ────

/**
 * The canonical content string, field-for-field and order-for-order
 * identical to Studio's lib/release/packContract.ts canonicalContent().
 * The content hash is computed over THIS form on both sides — that is
 * the cross-repo checksum contract.
 */
export function canonicalContentMirror(release: FrozenPackRelease): string {
  return JSON.stringify({
    schemaVersion: release.schemaVersion,
    languageCode: release.languageCode,
    scopeId: release.scopeId,
    scopeVersion: release.scopeVersion,
    buildId: release.buildId,
    declaredScope: release.declaredScope,
    entries: release.entries,
    exclusions: release.exclusions,
    sources: release.sources,
    qualityDistribution: release.qualityDistribution,
    policy: release.policy,
  });
}

/**
 * SHA-256 hex over a UTF-8 string. Default implementation uses Web
 * Crypto (available in Node and modern browsers). On a runtime without
 * `crypto.subtle` (bare Hermes), inject expo-crypto's digest via
 * `parsePackRelease(..., { sha256Hex })` — the seam exists so the
 * verification rule never depends on the ambient runtime.
 */
export async function webCryptoSha256Hex(s: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new PackReleaseError(
      'checksum-mismatch',
      'No crypto.subtle in this runtime — inject a sha256Hex implementation (e.g. expo-crypto) via options.',
    );
  }
  const data = new TextEncoder().encode(s);
  const digest = await subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Consistency rules (mirrors of Studio validateCandidateConsistency) ─

function checkConsistency(release: FrozenPackRelease): void {
  const problems: string[] = [];
  const declared = new Set(release.declaredScope);
  const seen = new Set<string>();
  let citationBacked = 0;
  let frontierVerified = 0;
  let unbound = 0;

  for (const entry of release.entries) {
    if (entry.languageCode !== release.languageCode) {
      problems.push(
        `entry ${entry.entryId} targets '${entry.languageCode}' but the release is '${release.languageCode}' — mixed-language rows are rejected`,
      );
    }
    const expectedId = `${entry.coreConceptCode}/${entry.realizationType}/${entry.surfaceForm}`;
    if (entry.entryId !== expectedId) {
      problems.push(`entryId '${entry.entryId}' does not match its own fields (expected '${expectedId}')`);
    }
    if (seen.has(entry.entryId)) problems.push(`duplicate entry identity '${entry.entryId}'`);
    seen.add(entry.entryId);
    for (const prereq of entry.prerequisites) {
      if (!declared.has(prereq)) {
        problems.push(`entry ${entry.entryId} lists prerequisite '${prereq}' outside the declared scope — dangling teaching edge`);
      }
    }
    for (const enabled of entry.enables) {
      if (!declared.has(enabled)) {
        problems.push(`entry ${entry.entryId} lists enable '${enabled}' outside the declared scope — dangling teaching edge`);
      }
    }
    if (entry.evidence.tier === 'citation-backed') citationBacked += 1;
    else frontierVerified += 1;
    if (entry.evidence.bindingStatusAtFreeze === 'unbound') unbound += 1;
  }
  for (let i = 1; i < release.declaredScope.length; i++) {
    if (!(release.declaredScope[i - 1]! < release.declaredScope[i]!)) {
      problems.push('declaredScope is not sorted+deduplicated');
      break;
    }
  }
  if (
    citationBacked !== release.qualityDistribution.citationBacked ||
    frontierVerified !== release.qualityDistribution.frontierVerified ||
    unbound !== release.qualityDistribution.unboundAtFreeze
  ) {
    problems.push('qualityDistribution does not tally the entries');
  }
  if (problems.length > 0) {
    throw new PackReleaseError(
      'inconsistent',
      `Pack release is internally inconsistent:\n- ${problems.join('\n- ')}`,
    );
  }
}

// ── Parsing ───────────────────────────────────────────────────────────

export interface ParsedPackRelease {
  readonly release: FrozenPackRelease;
  readonly releaseId: string;
  readonly contentSha256: string;
  /** Seed-layer entries with a usable gloss, in contract order — what
   *  the spine maps. */
  readonly seedLayerEntries: readonly PackEntry[];
  /** Seed-layer entries WITHOUT a usable gloss (explicit, not skipped
   *  silently — a null gloss cannot render a meaning). */
  readonly unrenderableSeedEntries: readonly PackEntry[];
  /** Studio-side extension codes: counted and exposed, never consumed. */
  readonly overlayEntries: readonly PackEntry[];
}

export interface ParsePackReleaseOptions {
  /** Refuse a release for another language (the silent-relabel guard). */
  expectedLanguage?: string;
  /** Injectable SHA-256 (runtime seam); defaults to WebCrypto. */
  sha256Hex?: (s: string) => Promise<string>;
}

/**
 * Parse + fully verify a received release bundle (the object produced
 * by JSON.parse of Studio's serialized bytes). Every failure mode is a
 * typed PackReleaseError with an actionable message.
 */
export async function parsePackRelease(
  raw: unknown,
  options: ParsePackReleaseOptions = {},
): Promise<ParsedPackRelease> {
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'bundleSchemaVersion' in raw &&
    (raw as { bundleSchemaVersion?: unknown }).bundleSchemaVersion !==
      RELEASE_BUNDLE_SCHEMA_VERSION
  ) {
    throw new PackReleaseError(
      'unsupported-bundle-version',
      `Unsupported release bundle schemaVersion ${String(
        (raw as { bundleSchemaVersion: unknown }).bundleSchemaVersion,
      )} — this build understands v${RELEASE_BUNDLE_SCHEMA_VERSION} only. Update the app or re-export the release.`,
    );
  }
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'release' in raw &&
    typeof (raw as { release?: unknown }).release === 'object' &&
    (raw as { release: { schemaVersion?: unknown } | null }).release !== null &&
    (raw as { release: { schemaVersion?: unknown } }).release.schemaVersion !==
      PACK_CONTRACT_SCHEMA_VERSION
  ) {
    throw new PackReleaseError(
      'unsupported-contract-version',
      `Unsupported pack contract schemaVersion ${String(
        (raw as { release: { schemaVersion: unknown } }).release.schemaVersion,
      )} — this build understands v${PACK_CONTRACT_SCHEMA_VERSION} only. Update the app.`,
    );
  }
  const shaped = ReleaseBundleMirror.safeParse(raw);
  if (!shaped.success) {
    throw new PackReleaseError(
      'invalid-shape',
      `Release bundle shape invalid: ${shaped.error.message}`,
    );
  }
  const release = shaped.data.release;

  if (options.expectedLanguage && release.languageCode !== options.expectedLanguage) {
    throw new PackReleaseError(
      'wrong-language',
      `This release serves '${release.languageCode}' but the app asked for '${options.expectedLanguage}' — wrong-language content can never be shown.`,
    );
  }

  // Checksum: re-derive the hash over the mirrored canonical form.
  const sha = options.sha256Hex ?? webCryptoSha256Hex;
  const digest = await sha(canonicalContentMirror(release));
  if (digest !== release.contentSha256) {
    throw new PackReleaseError(
      'checksum-mismatch',
      `Release ${release.releaseId} failed its content-hash verification (expected ${release.contentSha256}, computed ${digest}) — the artifact was edited after freeze and is refused.`,
    );
  }
  if (release.releaseId !== `${release.languageCode}.${release.contentSha256.slice(0, 12)}`) {
    throw new PackReleaseError(
      'checksum-mismatch',
      `Release id '${release.releaseId}' does not match its content hash — identity detached from content.`,
    );
  }

  checkConsistency(release);

  const seedLayerEntries: PackEntry[] = [];
  const unrenderableSeedEntries: PackEntry[] = [];
  const overlayEntries: PackEntry[] = [];
  for (const entry of release.entries) {
    if (!SEED.has(entry.coreConceptCode)) {
      overlayEntries.push(entry);
    } else if (entry.gloss && entry.gloss.trim().length > 0) {
      seedLayerEntries.push(entry);
    } else {
      unrenderableSeedEntries.push(entry);
    }
  }

  return Object.freeze({
    release: Object.freeze(release),
    releaseId: release.releaseId,
    contentSha256: release.contentSha256,
    seedLayerEntries: Object.freeze(seedLayerEntries),
    unrenderableSeedEntries: Object.freeze(unrenderableSeedEntries),
    overlayEntries: Object.freeze(overlayEntries),
  });
}

// ── The pack spine (the real consumer) ────────────────────────────────

/**
 * Map a release entry to a chip-builder step. Role comes from the
 * entry's POS when the learner vocabulary knows it; 'noun' is the
 * documented neutral chip default (no special styling) — NOT a claim
 * that the word is a noun. The v1 contract has no per-token spans, so
 * a phrase rides as one part (see the module header's honest
 * limitation).
 */
export function stepFromPackEntry(entry: PackEntry): LessonStep {
  const KNOWN_ROLES: readonly WordRole[] = [
    'pronoun',
    'verb',
    'noun',
    'particle',
    'adjective',
    'adverb',
  ];
  const role: WordRole =
    entry.pos && (KNOWN_ROLES as readonly string[]).includes(entry.pos)
      ? (entry.pos as WordRole)
      : 'noun';
  const step: LessonStep = {
    itemId: `pack-${entry.entryId}`,
    surfaceForm: entry.surfaceForm,
    meaning: entry.gloss ?? '',
    words: [{ form: entry.surfaceForm, gloss: entry.gloss ?? '', role }],
    note: entry.grammaticalNote,
  };
  if (entry.transliteration) step.transliteration = entry.transliteration;
  return step;
}

/**
 * Build a SpineProvider from a verified release: the release's
 * seed-layer ladder REPLACES the mock's concept ladder (same
 * composition contract as createSupabaseSpine); foundational steps,
 * lyric targets, and the palette stay fixture-backed (they are
 * Studio-independent or song-scoped).
 *
 * The provider closes over the parsed release object, so a pinned
 * session keeps its steps byte-stable no matter what is activated
 * later — pinning is object identity, not a mutable default.
 */
export function createPackSpine(parsed: ParsedPackRelease, mock: SpineProvider): SpineProvider {
  const steps = parsed.seedLayerEntries.map(stepFromPackEntry);
  return {
    languageCode: mock.languageCode,
    foundationalSteps: mock.foundationalSteps,
    conceptSteps: () => steps,
    lyricSteps: mock.lyricSteps,
    paletteSteps: mock.paletteSteps,
  };
}

// ── Resolution: production vs demo, explicitly ────────────────────────

export type PackSpineResolution =
  | {
      status: 'release';
      spine: SpineProvider;
      releaseId: string;
      overlayEntryCount: number;
      unrenderableEntryCount: number;
    }
  | {
      /** Explicitly labeled demo: the caller MUST surface `reason` —
       *  this is the only shape allowed to serve fixture content. */
      status: 'demo';
      spine: SpineProvider;
      reason: string;
    };

export interface ResolvePackSpineOptions extends ParsePackReleaseOptions {
  expectedLanguage: string;
  mode: 'production' | 'demo';
}

/**
 * Resolve the spine for a release bundle.
 *
 *  - production: any read failure throws PackReleaseError — a failed
 *    read is an actionable state, never fixture content.
 *  - demo: a failure yields status 'demo' with the reason on its face
 *    (the caller must label it in the UI); success in demo mode still
 *    prefers the real release.
 */
export async function resolvePackSpine(
  raw: unknown,
  options: ResolvePackSpineOptions,
): Promise<PackSpineResolution> {
  const mock = createMockSpine(options.expectedLanguage);
  let parsed: ParsedPackRelease;
  try {
    parsed = await parsePackRelease(raw, options);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    if (options.mode === 'production') {
      throw e instanceof PackReleaseError ? e : new PackReleaseError('invalid-shape', reason);
    }
    return { status: 'demo', spine: mock, reason };
  }
  return {
    status: 'release',
    spine: createPackSpine(parsed, mock),
    releaseId: parsed.releaseId,
    overlayEntryCount: parsed.overlayEntries.length,
    unrenderableEntryCount: parsed.unrenderableSeedEntries.length,
  };
}
