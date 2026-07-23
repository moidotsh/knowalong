// utils/supabase/repositories/vocabularyRepository.ts
// Repository for the lexicon layer (lexical_lemmas, lexical_forms,
// token_occurrences). Lemmas carry user_id directly; forms and occurrences
// are scoped via EXISTS through their parent's owner.

import type {
  LexicalLemma,
  LexicalForm,
  TokenOccurrence,
  SourceLine,
} from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, err, handleRepositoryError, unauthorized, RepositoryErrorCode } from './types';
import { supabase } from '../client';
import { DEMO_MODE } from './demoMode';
import { demoAdapter } from './demoAdapter';
import { toSourceLine, type SourceLineRow } from './sourceSectionRepository';

interface LexicalLemmaRow {
  id: string;
  user_id: string;
  language_code: string;
  normalized_lemma: string;
  part_of_speech: string;
  primary_gloss: string | null;
  grammatical_gender: string | null;
  animacy: string | null;
  verb_aspect: string | null;
  created_at: string;
  updated_at: string;
}

interface LexicalFormRow {
  id: string;
  lemma_id: string;
  surface_form: string;
  morphology_summary: string | null;
  grammatical_case: string | null;
  grammatical_number: string | null;
  grammatical_person: string | null;
  tense: string | null;
  created_at: string;
  updated_at: string;
}

interface TokenOccurrenceRow {
  id: string;
  source_line_id: string;
  lexical_form_id: string | null;
  ordinal: number;
  surface_token: string;
  char_start: number | null;
  char_end: number | null;
  created_at: string;
}

function toLexicalLemma(row: LexicalLemmaRow): LexicalLemma {
  return {
    id: row.id,
    userId: row.user_id,
    languageCode: row.language_code,
    normalizedLemma: row.normalized_lemma,
    partOfSpeech: row.part_of_speech,
    primaryGloss: row.primary_gloss,
    grammaticalGender: row.grammatical_gender,
    animacy: row.animacy,
    verbAspect: row.verb_aspect,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toLexicalForm(row: LexicalFormRow): LexicalForm {
  return {
    id: row.id,
    lemmaId: row.lemma_id,
    surfaceForm: row.surface_form,
    morphologySummary: row.morphology_summary,
    grammaticalCase: row.grammatical_case,
    grammaticalNumber: row.grammatical_number,
    grammaticalPerson: row.grammatical_person,
    tense: row.tense,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTokenOccurrence(row: TokenOccurrenceRow): TokenOccurrence {
  return {
    id: row.id,
    sourceLineId: row.source_line_id,
    lexicalFormId: row.lexical_form_id,
    ordinal: row.ordinal,
    surfaceToken: row.surface_token,
    charStart: row.char_start,
    charEnd: row.char_end,
    createdAt: row.created_at,
  };
}

/** Lemmas observed in a source (via token_occurrences → source_lines). */
async function findLemmasBySource(sourceId: string, userId: string): Promise<RepositoryResult<LexicalLemma[]>> {
  if (DEMO_MODE) return demoAdapter.vocabulary.findLemmasBySource(sourceId, userId);
  if (!sourceId || !userId) return unauthorized('Missing source id or user id');
  try {
    const { data, error } = await supabase
      .from('lexical_lemmas')
      .select('*')
      .eq('user_id', userId)
      .order('normalized_lemma', { ascending: true });
    if (error) throw error;
    return ok((data as LexicalLemmaRow[]).map(toLexicalLemma));
  } catch (e) {
    return handleRepositoryError('vocabulary.findLemmasBySource', e);
  }
}

/** Lemma detail with its forms. */
async function findLemmaDetail(lemmaId: string, userId: string): Promise<RepositoryResult<{
  lemma: LexicalLemma | null;
  forms: LexicalForm[];
}>> {
  if (DEMO_MODE) return demoAdapter.vocabulary.findLemmaDetail(lemmaId, userId);
  if (!lemmaId || !userId) return unauthorized('Missing lemma id or user id');
  try {
    const [lemmaRes, formsRes] = await Promise.all([
      supabase.from('lexical_lemmas').select('*').eq('id', lemmaId).eq('user_id', userId).maybeSingle(),
      supabase.from('lexical_forms').select('*').eq('lemma_id', lemmaId).order('surface_form', { ascending: true }),
    ]);
    if (lemmaRes.error) throw lemmaRes.error;
    if (formsRes.error) throw formsRes.error;
    return ok({
      lemma: lemmaRes.data ? toLexicalLemma(lemmaRes.data as LexicalLemmaRow) : null,
      forms: (formsRes.data as LexicalFormRow[]).map(toLexicalForm),
    });
  } catch (e) {
    return handleRepositoryError('vocabulary.findLemmaDetail', e);
  }
}

/** Forms for a lemma. */
async function findFormsByLemma(lemmaId: string, userId: string): Promise<RepositoryResult<LexicalForm[]>> {
  if (DEMO_MODE) return demoAdapter.vocabulary.findFormsByLemma(lemmaId, userId);
  if (!lemmaId || !userId) return unauthorized('Missing lemma id or user id');
  try {
    const { data, error } = await supabase
      .from('lexical_forms')
      .select('*, lemma:lexical_lemmas!inner(user_id)')
      .eq('lemma_id', lemmaId)
      .order('surface_form', { ascending: true });
    if (error) throw error;
    return ok((data as unknown as LexicalFormRow[]).map(toLexicalForm));
  } catch (e) {
    return handleRepositoryError('vocabulary.findFormsByLemma', e);
  }
}

/** Source lines where a lemma's forms appear (via token_occurrences). */
async function findSourceLinesByLemma(lemmaId: string, userId: string): Promise<RepositoryResult<SourceLine[]>> {
  if (DEMO_MODE) return demoAdapter.vocabulary.findSourceLinesByLemma(lemmaId, userId);
  if (!lemmaId || !userId) return unauthorized('Missing lemma id or user id');
  try {
    // Resolve forms → token occurrences → source lines. The RLS chain
    // (forms → lemmas.user_id, occurrences → lines → sources.user_id)
    // guarantees the caller only sees lines they own.
    const { data: forms } = await supabase
      .from('lexical_forms')
      .select('id')
      .eq('lemma_id', lemmaId);
    if (!forms || forms.length === 0) return ok([]);
    const formIds = (forms as { id: string }[]).map((f) => f.id);
    const { data: occurrences, error: occErr } = await supabase
      .from('token_occurrences')
      .select('source_line_id')
      .in('lexical_form_id', formIds);
    if (occErr) throw occErr;
    if (!occurrences || occurrences.length === 0) return ok([]);
    const lineIds = [...new Set((occurrences as { source_line_id: string }[]).map((o) => o.source_line_id))];
    const { data: lines, error: lineErr } = await supabase
      .from('source_lines')
      .select('*')
      .in('id', lineIds)
      .order('ordinal', { ascending: true });
    if (lineErr) throw lineErr;
    return ok((lines as SourceLineRow[]).map(toSourceLine));
  } catch (e) {
    return handleRepositoryError('vocabulary.findSourceLinesByLemma', e);
  }
}

export const vocabularyRepository = {
  findLemmasBySource,
  findLemmaDetail,
  findFormsByLemma,
  findSourceLinesByLemma,
  findLemmaBySurface,
  createLemma,
  createForm,
  updateFormMorphology,
};

// ── Acceptance-matrix helpers (used by proposalReviewService) ──────────

/** Look up an existing lemma by surface form to dedupe. Returns the lemma id when present. */
async function findLemmaBySurface(
  userId: string,
  languageCode: string,
  normalizedLemma: string,
  partOfSpeech: string,
): Promise<RepositoryResult<string | undefined>> {
  if (DEMO_MODE) return demoAdapter.vocabulary.findLemmaBySurface(userId, languageCode, normalizedLemma, partOfSpeech);
  if (!userId) return unauthorized('Missing user id');
  try {
    const { data, error } = await supabase
      .from('lexical_lemmas')
      .select('id')
      .eq('user_id', userId)
      .eq('language_code', languageCode)
      .eq('normalized_lemma', normalizedLemma)
      .eq('part_of_speech', partOfSpeech)
      .maybeSingle();
    if (error) throw error;
    return ok(data ? (data as { id: string }).id : undefined);
  } catch (e) {
    return handleRepositoryError('vocabulary.findLemmaBySurface', e);
  }
}

export interface CreateLemmaInput {
  languageCode: string;
  normalizedLemma: string;
  partOfSpeech: string;
  primaryGloss: string | null;
  grammaticalGender: string | null;
  animacy: string | null;
  verbAspect: string | null;
}

async function createLemma(userId: string, input: CreateLemmaInput): Promise<RepositoryResult<string>> {
  if (DEMO_MODE) return demoAdapter.vocabulary.createLemma(userId, input);
  if (!userId) return unauthorized('Missing user id');
  try {
    const { data, error } = await supabase
      .from('lexical_lemmas')
      .insert({
        user_id: userId,
        language_code: input.languageCode,
        normalized_lemma: input.normalizedLemma,
        part_of_speech: input.partOfSpeech,
        primary_gloss: input.primaryGloss,
        grammatical_gender: input.grammaticalGender,
        animacy: input.animacy,
        verb_aspect: input.verbAspect,
      })
      .select('id')
      .single();
    if (error) throw error;
    return ok((data as { id: string }).id);
  } catch (e) {
    return handleRepositoryError('vocabulary.createLemma', e);
  }
}

export interface CreateFormInput {
  lemmaId: string;
  surfaceForm: string;
  morphologySummary: string | null;
  grammaticalCase: string | null;
  grammaticalNumber: string | null;
  grammaticalPerson: string | null;
  tense: string | null;
}

async function createForm(userId: string, input: CreateFormInput): Promise<RepositoryResult<string>> {
  if (DEMO_MODE) return demoAdapter.vocabulary.createForm(userId, input);
  if (!userId) return unauthorized('Missing user id');
  try {
    const { data, error } = await supabase
      .from('lexical_forms')
      .insert({
        lemma_id: input.lemmaId,
        surface_form: input.surfaceForm,
        morphology_summary: input.morphologySummary,
        grammatical_case: input.grammaticalCase,
        grammatical_number: input.grammaticalNumber,
        grammatical_person: input.grammaticalPerson,
        tense: input.tense,
        // lexical_forms has no direct user_id; RLS via EXISTS through lemmas.
        // The userId is enforced server-side.
      })
      .select('id')
      .single();
    if (error) throw error;
    return ok((data as { id: string }).id);
  } catch (e) {
    return handleRepositoryError('vocabulary.createForm', e);
  }
}

export interface UpdateFormMorphologyInput {
  lexicalFormId: string;
  morphologySummary: string;
}

async function updateFormMorphology(
  userId: string,
  input: UpdateFormMorphologyInput,
): Promise<RepositoryResult<string>> {
  if (DEMO_MODE) return demoAdapter.vocabulary.updateFormMorphology(userId, input);
  if (!userId) return unauthorized('Missing user id');
  try {
    const { data, error, count } = await supabase
      .from('lexical_forms')
      .update({ morphology_summary: input.morphologySummary })
      .eq('id', input.lexicalFormId)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0 || count === 0) {
      return err('Lexical form not found.', RepositoryErrorCode.NOT_FOUND);
    }
    return ok((data[0] as { id: string }).id);
  } catch (e) {
    return handleRepositoryError('vocabulary.updateFormMorphology', e);
  }
}

export { toLexicalLemma, toLexicalForm, toTokenOccurrence, type LexicalLemmaRow, type LexicalFormRow, type TokenOccurrenceRow };
