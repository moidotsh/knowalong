// hooks/queries/useSongLibrary.ts
//
// The canonical song shelf (design doc §1.1 "My songs"): the demo song is
// pinned first (playable today), then every library source projected through
// `librarySongToCanonical` — honestly, with no invented analysis. Library
// projection needs the source plus its sections+lines; `useSourceSections`
// already returns that pair, so this hook composes the two queries into the
// canonical model instead of duplicating repository calls.

import { useMemo } from 'react';
import { useLearningSource } from './useLearningSource';
import { useSourceSections } from './useSourceSections';
import { useLearningSources } from './useLearningSources';
import { demoSongToCanonical } from '../../utils/knowalong/song/demoSongAdapter';
import { librarySongToCanonical } from '../../utils/knowalong/song/librarySongAdapter';
import type { CanonicalSong } from '../../utils/knowalong/song/types';

/**
 * One library song, projected into the canonical model. Returns
 * `null` while the source/sections queries resolve (or when `sourceId`
 * is null) — the shelf renders a quiet placeholder, never a fake state.
 */
export function useSourceSong(sourceId: string | null): CanonicalSong | null {
  const source = useLearningSource(sourceId);
  const sections = useSourceSections(sourceId);

  return useMemo(() => {
    const src = source.data;
    const sec = sections.data;
    if (!src || !sec) return null;
    return librarySongToCanonical(src, sec.sections, sec.lines);
  }, [source.data, sections.data]);
}

/**
 * The shelf's source-id list (unprojected — rows project themselves via
 * `useSourceSong` so each row's queries load independently). Empty while
 * loading; archived sources are NOT filtered here (the shelf applies the
 * learner's archived set from the song-shelf store, which the hook can't see).
 */
export function useSongLibrarySourceIds(): string[] {
  const sources = useLearningSources();
  return useMemo(() => (sources.data ?? []).map((s) => s.id), [sources.data]);
}

/** The always-present, always-playable demo song. */
export function useDemoSong(): CanonicalSong {
  return useMemo(() => demoSongToCanonical(), []);
}
