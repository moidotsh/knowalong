// utils/supabase/repositories/sourceSegmentRepository.ts
// Repository for source_segments + source_line_segments.
//
// PROMOTION STATUS (load-bearing, revision 3 correction H):
//   Segment proposals are NOT promotable from the UI in this checkpoint.
//   There is intentionally NO createSegmentWithLineSpan / write method
//   here. The repository exposes READ + DELETE only, so segment proposals
//   can be displayed and so deleting a run/source cleans up consistently
//   if rows are ever added by a future approved path. Adding a write
//   method requires a future approved transaction / RPC design that
//   guarantees atomic multi-record promotion.

import type { SourceSegment, SourceLineSegmentLink } from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, handleRepositoryError, unauthorized } from './types';
import { supabase } from '../client';
import { DEMO_MODE } from './demoMode';
import { demoAdapter } from './demoAdapter';

interface SourceSegmentRow {
  id: string;
  user_id: string;
  source_id: string;
  source_section_id: string | null;
  ordinal: number;
  segment_kind: string;
  assembled_display_text: string;
  display_text_checksum: string;
  label: string | null;
  source_run_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SourceLineSegmentRow {
  source_line_id: string;
  source_segment_id: string;
  ordinal: number;
  start_offset: number | null;
  end_offset: number | null;
  line_fragment: string | null;
  created_at: string;
}

function toSourceSegment(row: SourceSegmentRow, lineSpan: SourceLineSegmentLink[] = []): SourceSegment {
  return {
    id: row.id,
    userId: row.user_id,
    sourceId: row.source_id,
    sourceSectionId: row.source_section_id,
    ordinal: row.ordinal,
    segmentKind: row.segment_kind as SourceSegment['segmentKind'],
    assembledDisplayText: row.assembled_display_text,
    displayTextChecksum: row.display_text_checksum,
    label: row.label,
    sourceRunId: row.source_run_id,
    lineSpan,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSourceLineSegmentLink(row: SourceLineSegmentRow): SourceLineSegmentLink {
  return {
    sourceLineId: row.source_line_id,
    sourceSegmentId: row.source_segment_id,
    ordinal: row.ordinal,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    lineFragment: row.line_fragment,
    createdAt: row.created_at,
  };
}

/** Find all segments for a source, with their line spans populated. */
async function findBySource(sourceId: string, userId: string): Promise<RepositoryResult<SourceSegment[]>> {
  if (DEMO_MODE) return demoAdapter.sourceSegment.findBySource(sourceId, userId);
  if (!sourceId || !userId) return unauthorized('Missing source id or user id');
  try {
    const { data: segRows, error } = await supabase
      .from('source_segments')
      .select('*')
      .eq('user_id', userId)
      .eq('source_id', sourceId)
      .order('ordinal', { ascending: true });
    if (error) throw error;
    if (!segRows || segRows.length === 0) return ok([]);
    const segmentIds = (segRows as SourceSegmentRow[]).map((r) => r.id);
    const { data: linkRows, error: linkError } = await supabase
      .from('source_line_segments')
      .select('*')
      .in('source_segment_id', segmentIds)
      .order('source_segment_id', { ascending: true })
      .order('ordinal', { ascending: true });
    if (linkError) throw linkError;
    const linksBySegment = new Map<string, SourceLineSegmentLink[]>();
    for (const link of (linkRows as SourceLineSegmentRow[]) ?? []) {
      const arr = linksBySegment.get(link.source_segment_id) ?? [];
      arr.push(toSourceLineSegmentLink(link));
      linksBySegment.set(link.source_segment_id, arr);
    }
    return ok(
      (segRows as SourceSegmentRow[]).map((r) =>
        toSourceSegment(r, linksBySegment.get(r.id) ?? []),
      ),
    );
  } catch (e) {
    return handleRepositoryError('sourceSegment.findBySource', e);
  }
}

/**
 * Delete all segments + their line-span links for a source.
 * Intended for source-delete cleanup. The link rows cascade on segment
 * delete via the FK ON DELETE CASCADE; we delete the segments and let
 * Postgres handle the link cleanup.
 */
async function deleteBySource(sourceId: string, userId: string): Promise<RepositoryResult<void>> {
  if (DEMO_MODE) return demoAdapter.sourceSegment.deleteBySource(sourceId, userId);
  if (!sourceId || !userId) return unauthorized('Missing source id or user id');
  try {
    const { error } = await supabase
      .from('source_segments')
      .delete()
      .eq('source_id', sourceId)
      .eq('user_id', userId);
    if (error) throw error;
    return ok(undefined);
  } catch (e) {
    return handleRepositoryError('sourceSegment.deleteBySource', e);
  }
}

export const sourceSegmentRepository = {
  findBySource,
  deleteBySource,
};

export { toSourceSegment, toSourceLineSegmentLink, type SourceSegmentRow, type SourceLineSegmentRow };
