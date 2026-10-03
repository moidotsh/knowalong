// __tests__/knowalong/packRelease.test.ts
//
// Phase 4 — the real learner pack reader. The local integration runs
// through utils/knowalong/packRelease.ts (NOT a Studio mock): a
// Studio-built release bundle is parsed, hash-verified, projected onto
// the seed layer, and served through the SpineProvider seam.
//
// The golden fixture below is BYTE-IDENTICAL to what Studio's
// knowalong-studio tests/delivery.test.ts freezeSeedTriple() exports —
// the cross-repo contract is pinned so the hand-mirrored parser cannot
// drift from the producer. Studio's side pins the contract-level
// canonical bytes + the seed-layer membership of that workspace (bundle
// bytes vary per freeze because transport createdAt sits outside the
// content identity); this side pins the exact consumed artifact.

import { describe, expect, it } from 'vitest';
import {
  LEARNER_SEED_CODES,
  PackReleaseError,
  canonicalContentMirror,
  createPackSpine,
  parsePackRelease,
  resolvePackSpine,
  stepFromPackEntry,
  webCryptoSha256Hex,
  type FrozenPackRelease,
  type PackEntry,
  type ParsedPackRelease,
} from '../../utils/knowalong/packRelease';
import { createMockSpine } from '../../utils/knowalong/spine';
import { GOLDEN_BUNDLE_JSON } from './goldenBundle';

/**
 * The golden bundle lives in ./goldenBundle.ts, shared with
 * packLessonSmoke.test.ts — ONE source of truth for the Studio-produced
 * bytes (see the provenance comment there).
 */

// ── Test helpers ──────────────────────────────────────────────────────

/** Parse the golden bundle once per test (cheap, deterministic). */
function goldenRaw(): Record<string, unknown> {
  return JSON.parse(GOLDEN_BUNDLE_JSON) as Record<string, unknown>;
}

/** Recompute qualityDistribution + content hash + releaseId after a
 *  test mutates a release — producing a NEW self-consistent artifact
 *  (a distinct successor release, exactly as Studio's re-freeze
 *  would). */
async function rehash(release: FrozenPackRelease): Promise<FrozenPackRelease> {
  const clone = JSON.parse(JSON.stringify(release)) as FrozenPackRelease;
  let citationBacked = 0;
  let frontierVerified = 0;
  let unbound = 0;
  for (const entry of clone.entries) {
    if (entry.evidence.tier === 'citation-backed') citationBacked += 1;
    else frontierVerified += 1;
    if (entry.evidence.bindingStatusAtFreeze === 'unbound') unbound += 1;
  }
  clone.qualityDistribution = { citationBacked, frontierVerified, unboundAtFreeze: unbound };
  clone.contentSha256 = await webCryptoSha256Hex(canonicalContentMirror(clone));
  clone.releaseId = `${clone.languageCode}.${clone.contentSha256.slice(0, 12)}`;
  return clone;
}

function makeOverlayEntry(): PackEntry {
  return {
    entryId: 'LIKE/word/нравится',
    languageCode: 'ru',
    coreConceptCode: 'LIKE', // a real Studio overlay code (CLCC_OVERLAY_CONCEPTS, mapsTo LIKE_PREFER) — NOT in the 40-code seed layer
    realizationType: 'word',
    surfaceForm: 'нравится',
    transliteration: 'nravitsya',
    gloss: 'to like (of things)',
    grammaticalNote: null,
    grammar: null,
    lemma: null,
    pos: null,
    sourceCorroborated: false,
    examples: [],
    prerequisites: [],
    enables: [],
    evidence: {
      provenance: 'operator-authored',
      tier: 'frontier-verified',
      bindingWatermark: null,
      bindingStatusAtFreeze: 'unbound',
      lockedAt: null,
    },
  };
}

async function parsedGolden(): Promise<ParsedPackRelease> {
  return parsePackRelease(goldenRaw(), { expectedLanguage: 'ru' });
}

// ── The seed-layer contract ───────────────────────────────────────────

describe('packRelease: the learner seed layer', () => {
  it('exposes the 40-code verified cross-repo contract, unique', () => {
    expect(LEARNER_SEED_CODES).toHaveLength(40);
    expect(new Set(LEARNER_SEED_CODES).size).toBe(40);
  });
});

// ── Golden bundle: parse + projection ─────────────────────────────────

describe('packRelease: golden Studio bundle parses and projects', () => {
  it('parses the Studio-produced bytes, checksum included', async () => {
    const parsed = await parsedGolden();
    expect(parsed.releaseId).toBe('ru.c27faa6f3810');
    expect(parsed.contentSha256).toBe(
      'c27faa6f38107ead655b93675bc3d8570238211af5878c9b625d245c32f3eaa6',
    );
    // All three entries are seed-layer codes with usable glosses.
    expect(parsed.seedLayerEntries).toHaveLength(3);
    expect(parsed.overlayEntries).toHaveLength(0);
    expect(parsed.unrenderableSeedEntries).toHaveLength(0);
  });

  it('serves the release ladder through the SpineProvider seam — real steps, fixture layers intact', async () => {
    const parsed = await parsedGolden();
    const mock = createMockSpine('ru');
    const spine = createPackSpine(parsed, mock);

    const steps = spine.conceptSteps();
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.surfaceForm)).toEqual(['есть', 'идти', 'хотеть']);
    expect(steps.every((s) => s.itemId.startsWith('pack-'))).toBe(true);
    expect(steps[0]!.meaning).toBe('there is / to be');
    expect(steps[0]!.transliteration).toBe("est'");

    // Composition, not fork: the other layers stay fixture-backed.
    expect(spine.foundationalSteps).toBe(mock.foundationalSteps);
    expect(spine.lyricSteps).toBe(mock.lyricSteps);
    expect(spine.paletteSteps).toBe(mock.paletteSteps);
  });

  it('maps known POS roles honestly and defaults unknown POS to the neutral chip role', () => {
    const withPos = { ...makeOverlayEntry(), pos: 'verb' };
    expect(stepFromPackEntry(withPos).words[0]!.role).toBe('verb');
    const unknownPos = { ...makeOverlayEntry(), pos: 'someword' };
    expect(stepFromPackEntry(unknownPos).words[0]!.role).toBe('noun');
    const noPos = makeOverlayEntry();
    expect(stepFromPackEntry(noPos).words[0]!.role).toBe('noun');
  });
});

// ── Seed-layer filtering: overlays stay Studio-side ───────────────────

describe('packRelease: seed-layer projection', () => {
  it('counts overlay codes and never maps them into the spine', async () => {
    const golden = (await parsedGolden()).release;
    const withOverlay = await rehash({
      ...golden,
      declaredScope: [...golden.declaredScope, 'REGISTER_FORMAL'].sort(),
      entries: [...golden.entries, makeOverlayEntry()],
    });
    const parsed = await parsePackRelease(
      { bundleSchemaVersion: 1, packContractSchemaVersion: 1, release: withOverlay },
      { expectedLanguage: 'ru' },
    );
    expect(parsed.overlayEntries).toHaveLength(1);
    expect(parsed.overlayEntries[0]!.coreConceptCode).toBe('LIKE');
    // The spine consumes ONLY the seed layer.
    expect(createPackSpine(parsed, createMockSpine('ru')).conceptSteps()).toHaveLength(3);
  });

  it('surfaces seed entries without a usable gloss explicitly instead of skipping silently', async () => {
    const golden = (await parsedGolden()).release;
    const emptied = JSON.parse(JSON.stringify(golden)) as FrozenPackRelease;
    (emptied.entries[0] as { gloss: string | null }).gloss = null;
    const withNull = await rehash(emptied);
    const parsed = await parsePackRelease(
      { bundleSchemaVersion: 1, packContractSchemaVersion: 1, release: withNull },
      { expectedLanguage: 'ru' },
    );
    expect(parsed.unrenderableSeedEntries).toHaveLength(1);
    expect(parsed.seedLayerEntries).toHaveLength(2);
  });
});

// ── Rejection modes: nothing becomes a silent demo success ────────────

describe('packRelease: rejection modes (typed, actionable)', () => {
  it('refuses a wrong-language release', async () => {
    await expect(
      parsePackRelease(goldenRaw(), { expectedLanguage: 'fr' }),
    ).rejects.toMatchObject({ kind: 'wrong-language' });
    // Phase 7.4: every registered expectation rejects ru content, not
    // just fr — the language guard is registry-wide, not per-pair.
    await expect(
      parsePackRelease(goldenRaw(), { expectedLanguage: 'fa' }),
    ).rejects.toMatchObject({ kind: 'wrong-language' });
  });

  it('refuses unsupported bundle and contract versions with NAMED errors', async () => {
    await expect(
      parsePackRelease({ ...goldenRaw(), bundleSchemaVersion: 2 }),
    ).rejects.toMatchObject({ kind: 'unsupported-bundle-version' });
    const raw = goldenRaw();
    (raw['release'] as { schemaVersion: number }).schemaVersion = 2;
    await expect(parsePackRelease(raw)).rejects.toMatchObject({
      kind: 'unsupported-contract-version',
    });
  });

  it('refuses a tampered artifact (edited content) on checksum', async () => {
    const raw = goldenRaw();
    const release = raw['release'] as { entries: Array<{ gloss: string }> };
    release.entries[0]!.gloss = 'edited-after-freeze';
    await expect(parsePackRelease(raw)).rejects.toMatchObject({
      kind: 'checksum-mismatch',
    });
  });

  it('refuses a release whose id is detached from its hash', async () => {
    const golden = (await parsedGolden()).release;
    const detached = { ...golden, releaseId: 'ru.000000000000' };
    await expect(
      parsePackRelease(
        { bundleSchemaVersion: 1, packContractSchemaVersion: 1, release: detached },
        { expectedLanguage: 'ru' },
      ),
    ).rejects.toMatchObject({ kind: 'checksum-mismatch' });
  });

  it('enforces the consistency rules: duplicates, dangling edges, unsorted scope, lying tallies', async () => {
    const golden = (await parsedGolden()).release;

    // Duplicate entry identity.
    const dup = await rehash({ ...golden, entries: [...golden.entries, golden.entries[0]!] });
    await expect(
      parsePackRelease({ bundleSchemaVersion: 1, packContractSchemaVersion: 1, release: dup }),
    ).rejects.toMatchObject({ kind: 'inconsistent' });

    // Dangling teaching edge: prerequisite outside the declared scope.
    const dangling = await rehash({
      ...golden,
      entries: golden.entries.map((e, i) =>
        i === 0 ? { ...e, prerequisites: ['NOT_IN_SCOPE'] } : e,
      ),
    });
    await expect(
      parsePackRelease({ bundleSchemaVersion: 1, packContractSchemaVersion: 1, release: dangling }),
    ).rejects.toMatchObject({ kind: 'inconsistent' });

    // Unsorted declaredScope.
    const unsorted = await rehash({ ...golden, declaredScope: ['GO', 'EXIST', 'WANT'] });
    await expect(
      parsePackRelease({ bundleSchemaVersion: 1, packContractSchemaVersion: 1, release: unsorted }),
    ).rejects.toMatchObject({ kind: 'inconsistent' });

    // Lying quality tally. The lie is hashed IN — checksum-consistent,
    // because this is the builder-bug case (the producer computed the
    // identity over wrong data): the checksum cannot see it, the
    // consistency rules must. (A post-freeze tally EDIT is the tamper
    // case above and dies at the checksum first.)
    const lying = JSON.parse(JSON.stringify(golden)) as FrozenPackRelease;
    lying.qualityDistribution = { ...lying.qualityDistribution, citationBacked: 99 };
    lying.contentSha256 = await webCryptoSha256Hex(canonicalContentMirror(lying));
    lying.releaseId = `ru.${lying.contentSha256.slice(0, 12)}`;
    await expect(
      parsePackRelease({ bundleSchemaVersion: 1, packContractSchemaVersion: 1, release: lying }),
    ).rejects.toMatchObject({ kind: 'inconsistent' });
  });
});

// ── Production vs demo resolution ─────────────────────────────────────

describe('packRelease: production vs demo resolution', () => {
  it('production mode THROWS on a failed read — never fixture content', async () => {
    await expect(
      resolvePackSpine(goldenRaw(), { expectedLanguage: 'fr', mode: 'production' }),
    ).rejects.toBeInstanceOf(PackReleaseError);
  });

  it('demo mode returns an explicitly LABELED fallback carrying the reason', async () => {
    const resolution = await resolvePackSpine(goldenRaw(), {
      expectedLanguage: 'fr',
      mode: 'demo',
    });
    expect(resolution.status).toBe('demo');
    if (resolution.status === 'demo') {
      expect(resolution.reason).toMatch(/fr/);
      expect(resolution.spine.conceptSteps().length).toBeGreaterThan(0); // mock ladder, on the record
    }
  });

  it('demo mode still prefers the real release when it reads fine', async () => {
    const resolution = await resolvePackSpine(goldenRaw(), {
      expectedLanguage: 'ru',
      mode: 'demo',
    });
    expect(resolution.status).toBe('release');
    if (resolution.status === 'release') {
      expect(resolution.releaseId).toBe('ru.c27faa6f3810');
      expect(resolution.overlayEntryCount).toBe(0);
    }
  });
});

// ── Two releases coexist; a pinned session stays stable ──────────────

describe('packRelease: release pinning', () => {
  it('a spine built from release v1 is untouched by activating release v2', async () => {
    const v1 = await parsedGolden();
    const spineV1 = createPackSpine(v1, createMockSpine('ru'));
    const stepsV1 = spineV1.conceptSteps();

    // v2: a genuine successor (extra seed entry NEED — the golden
    // already carries EXIST), re-frozen with a new identity.
    const goldenRelease = v1.release;
    const needEntry: PackEntry = {
      entryId: 'NEED/word/нужно',
      languageCode: 'ru',
      coreConceptCode: 'NEED',
      realizationType: 'word',
      surfaceForm: 'нужно',
      transliteration: 'nuzhno',
      gloss: 'to need / necessary',
      grammaticalNote: null,
      grammar: null,
      lemma: null,
      pos: null,
      sourceCorroborated: false,
      examples: [],
      prerequisites: [],
      enables: [],
      evidence: {
        provenance: 'operator-authored',
        tier: 'citation-backed',
        bindingWatermark: null,
        bindingStatusAtFreeze: 'unbound',
        lockedAt: null,
      },
    };
    const v2Release = await rehash({
      ...goldenRelease,
      declaredScope: [...goldenRelease.declaredScope, 'NEED'].sort(),
      entries: [...goldenRelease.entries, needEntry],
    });
    const parsedV2 = await parsePackRelease(
      { bundleSchemaVersion: 1, packContractSchemaVersion: 1, release: v2Release },
      { expectedLanguage: 'ru' },
    );
    const spineV2 = createPackSpine(parsedV2, createMockSpine('ru'));

    // v2 has the bigger ladder; v1's pinned spine is byte-stable.
    expect(spineV2.conceptSteps()).toHaveLength(4);
    expect(spineV1.conceptSteps()).toEqual(stepsV1);
    expect(spineV1.conceptSteps()).toHaveLength(3);
    expect(parsedV2.releaseId).not.toBe(v1.releaseId);
  });
});
