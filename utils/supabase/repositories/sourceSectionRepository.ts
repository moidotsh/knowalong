// utils/supabase/repositories/sourceSectionRepository.ts
// Repository for source_sections. RLS via EXISTS through learning_sources.
// No direct user_id column — the userId parameter is used to scope queries
// and is enforced server-side by the EXISTS RLS policies.

import type { SourceSection, SourceLine } from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, err, handleRepositoryError, unauthorized, RepositoryErrorCode } from './types';
import { supabase } from '../client';
import { DEMO_MODE } from './demoMode';
import { demoAdapter } from './demoAdapter';

interface SourceSectionRow {
  id: string;
  source_id: string;
  ordinal: number;
  section_type: string;
  label: string | null;
  created_at: string;
  updated_at: string;
}

interface SourceLineRow {
  id: string;
  source_id: string;
  section_id: string | null;
  ordinal: number;
  raw_text: string;
  normalized_text: string | null;
  translation: string | null;
  transliteration: string | null;
  review_status: string;
  created_at: string;
  updated_at: string;
}

function toSourceSection(row: SourceSectionRow): SourceSection {
  return {
    id: row.id,
    sourceId: row.source_id,
    ordinal: row.ordinal,
    sectionType: row.section_type as SourceSection['sectionType'],
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSourceLine(row: SourceLineRow): SourceLine {
  return {
    id: row.id,
    sourceId: row.source_id,
    sectionId: row.section_id,
    ordinal: row.ordinal,
    rawText: row.raw_text,
    normalizedText: row.normalized_text,
    translation: row.translation,
    transliteration: row.transliteration,
    reviewStatus: row.review_status as SourceLine['reviewStatus'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Find sections + lines for a source, ordered by ordinal. */
async function findBySource(sourceId: string, userId: string): Promise<RepositoryResult<{
  sections: SourceSection[];
  lines: SourceLine[];
}>> {
  if (DEMO_MODE) return demoAdapter.sourceSection.findBySource(sourceId, userId);
  if (!sourceId || !userId) return unauthorized('Missing source id or user id');
  try {
    const [sectionsRes, linesRes] = await Promise.all([
      supabase.from('source_sections').select('*').eq('source_id', sourceId).order('ordinal', { ascending: true }),
      supabase.from('source_lines').select('*').eq('source_id', sourceId).order('ordinal', { ascending: true }),
    ]);
    if (sectionsRes.error) throw sectionsRes.error;
    if (linesRes.error) throw linesRes.error;
    return ok({
      sections: (sectionsRes.data as SourceSectionRow[]).map(toSourceSection),
      lines: (linesRes.data as SourceLineRow[]).map(toSourceLine),
    });
  } catch (e) {
    return handleRepositoryError('sourceSection.findBySource', e);
  }
}

async function findById(id: string, userId: string): Promise<RepositoryResult<SourceSection | null>> {
  if (DEMO_MODE) return demoAdapter.sourceSection.findById(id, userId);
  if (!id || !userId) return unauthorized('Missing id or user id');
  try {
    const { data, error } = await supabase
      .from('source_sections')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return ok(data ? toSourceSection(data as SourceSectionRow) : null);
  } catch (e) {
    return handleRepositoryError('sourceSection.findById', e);
  }
}

/** Promotion input for a `section` proposal acceptance. */
export interface CreateSectionFromProposalInput {
  sourceId: string;
  ordinal: number;
  sectionType: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'stanza' | 'section';
  label: string | null;
  lineOrdinals: number[];
}

/** Create a section. Used by proposalReviewService to promote accepted section proposals. */
async function createFromProposal(
  userId: string,
  input: CreateSectionFromProposalInput,
): Promise<RepositoryResult<SourceSection>> {
  if (DEMO_MODE) return demoAdapter.sourceSection.createFromProposal(userId, input);
  if (!userId || !input.sourceId) return unauthorized('Missing user id or source id');
  try {
    const { data, error } = await supabase
      .from('source_sections')
      .insert({
        source_id: input.sourceId,
        ordinal: input.ordinal,
        section_type: input.sectionType,
        label: input.label,
      })
      .select('*')
      .single();
    if (error) throw error;
    const section = toSourceSection(data as SourceSectionRow);
    return ok(section);
  } catch (e) {
    return handleRepositoryError('sourceSection.createFromProposal', e);
  }
}

/** Promotion input for a `line_translation` proposal acceptance. */
export interface UpdateLineTranslationInput {
  sourceLineId: string;
  translationText: string;
  translationLanguageCode: string;
}

/**
 * Update `source_lines.translation` for the referenced line. The column
 * was confirmed to exist in Phase 0 (migration 00001 line 170) with a
 * COMMENT explicitly anticipating analysis-generated translations.
 * Returns NOT_FOUND when the source_line_id does not exist (so the
 * service can surface "blocked — prerequisite missing").
 */
async function updateLineTranslation(
  userId: string,
  input: UpdateLineTranslationInput,
): Promise<RepositoryResult<{ sourceLineId: string }>> {
  if (DEMO_MODE) return demoAdapter.sourceSection.updateLineTranslation(userId, input);
  if (!userId || !input.sourceLineId) return unauthorized('Missing user id or source line id');
  try {
    const { error, count } = await supabase
      .from('source_lines')
      .update({ translation: input.translationText })
      .eq('id', input.sourceLineId)
      // RLS via EXISTS through learning_sources.user_id narrows the write
      // to lines the caller owns; no separate user_id filter is needed.
      ;
    if (error) throw error;
    if (count === 0) {
      return err('Source line not found.', RepositoryErrorCode.NOT_FOUND);
    }
    return ok({ sourceLineId: input.sourceLineId });
  } catch (e) {
    return handleRepositoryError('sourceSection.updateLineTranslation', e);
  }
}

export const sourceSectionRepository = {
  findBySource,
  findById,
  createFromProposal,
  updateLineTranslation,
};

export { toSourceSection, toSourceLine, type SourceSectionRow, type SourceLineRow };
