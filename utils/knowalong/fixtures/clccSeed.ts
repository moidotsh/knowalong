// d10-exempt
// utils/knowalong/fixtures/clccSeed.ts
//
// Mock CLCC concept seed — the canonical Russian realization table for every
// Core Concept (the 94-row catalogue vendored in knowalong-studio's
// lib/concepts.ts). This is MOCK data: nothing here touches a DB. It mirrors
// the publish contract shape (surfaceForm, gloss, transliteration, note,
// examples) that the real learner Supabase would eventually serve, so the
// consumer's content layer can swap its data source later without touching the
// deck/interaction code.
//
// Sourcing:
//  - Tier 0–3 lexical/closed-class headwords are transcribed from Studio's
//    RU_CONCEPT_HEADWORDS (lib/catalog/conceptHeadwordCandidates.ts) — the
//    authoritative concept→lemma map.
//  - Pronouns, the grammatical tiers (3–4), and the derivation/register/idiom
//    tiers (5–9) are authored as demonstrative Russian phrases/words. Where
//    Russian LACKS a grammaticalized category (RU_LEXICAL_GAPS: FORMAL/
//    INFORMAL/HONORIFIC/HUMBLE, plus EVIDENTIALITY, ERGATIVE_CASE, etc.), the
//    row carries the closest Russian realization + a `note` saying so — never a
//    fabricated form.
//
// The deck builder (clccDeck.ts) turns each row into one LessonStep. Mode is
// inferred there: verbs with `cloze` data → cloze; multi-word phrases →
// reverse; single words → build. Cloze answers are framed so the distractors
// (other verbs pulled from the shared word pool) don't fit the object — the
// "I ___ apples → only eat works" semantic-selection drill.

import type { WordRole } from './learningItems';
import type { StepMode } from './decks';

/** A decomposed word inside a phrase. */
export interface ClccSeedWord {
  form: string;
  gloss: string;
  role: WordRole;
}

/** One CLCC concept's mock realization. */
export interface ClccSeedRow {
  /** Studio Core Concept code (stable identity; matches lib/concepts.ts). */
  code: string;
  tier: number;
  cluster: string;
  /** Canonical English label (from lib/concepts.ts). */
  label: string;
  /** Russian surface form (a word, phrase, or demonstrative sentence). */
  surfaceForm: string;
  /** English gloss of the surface form. */
  gloss: string;
  /** Primary grammatical role — drives chip color + cloze distractor class. */
  role: WordRole;
  transliteration?: string;
  /** Free-text grammar/usage note (esp. for grammatical + gap concepts). */
  note?: string;
  /** Multi-word decomposition. Absent ⇒ a single word [surfaceForm, gloss, role]. */
  words?: ClccSeedWord[];
  exampleRu?: string;
  exampleEn?: string;
  /** When present, the deck builder emits a CLOZE step (sentence with the
   *  answer blanked) instead of a build/reverse step. */
  cloze?: { prompt: string; answer: string; meaning: string };
}

/** Default mode for a seed row, as inferred by the deck builder. Exported so
 *  tests + the Study generator can reason about it without re-deriving. */
export function inferredMode(row: ClccSeedRow): StepMode {
  if (row.cloze) return 'cloze';
  const words = row.words ?? [{ form: row.surfaceForm, gloss: row.gloss, role: row.role }];
  return words.length >= 2 ? 'reverse' : 'build';
}

/** Resolve a row's effective words[] (derived when the row omits it). */
export function rowWords(row: ClccSeedRow): ClccSeedWord[] {
  return row.words ?? [{ form: row.surfaceForm, gloss: row.gloss, role: row.role }];
}

export const CLCC_SEED: readonly ClccSeedRow[] = [
  // ── Tier 0 — pronouns & deixis ───────────────────────────────────────
  { code: 'FIRST_PERSON', tier: 0, cluster: 'pronoun', label: 'First person', surfaceForm: 'я', gloss: 'I', role: 'pronoun', transliteration: 'ya', note: 'Always lowercase unless sentence-initial.', exampleRu: 'Я иду домой.', exampleEn: 'I am going home.' },
  { code: 'SECOND_PERSON', tier: 0, cluster: 'pronoun', label: 'Second person', surfaceForm: 'ты', gloss: 'you (informal)', role: 'pronoun', transliteration: 'ty', note: 'Singular informal. Formal/plural is вы.', exampleRu: 'Ты здесь.', exampleEn: 'You are here.' },
  { code: 'THIRD_PERSON', tier: 0, cluster: 'pronoun', label: 'Third person', surfaceForm: 'он', gloss: 'he', role: 'pronoun', transliteration: 'on', note: 'он/она/оно/они — he/she/it/they.', exampleRu: 'Он там.', exampleEn: 'He is there.' },
  { code: 'POSSESS', tier: 0, cluster: 'possession', label: 'Possession', surfaceForm: 'иметь', gloss: 'to have', role: 'verb', transliteration: 'imet\'', note: 'Russian more often expresses possession as "У меня есть ..." (at me there is).', exampleRu: 'Я имею право.', exampleEn: 'I have the right.' },

  // ── Tier 0 — core functions ──────────────────────────────────────────
  { code: 'EXIST', tier: 0, cluster: 'existence', label: 'Existence / being', surfaceForm: 'быть', gloss: 'to be', role: 'verb', transliteration: 'byt\'', note: 'Russian "быть" has NO present-tense form — it is simply implied ("Я здесь" = "I am here"). Past: был/была/было; future: буду.', exampleRu: 'Я хочу быть врачом.', exampleEn: 'I want to be a doctor.' },
  { code: 'WANT', tier: 0, cluster: 'volition', label: 'Want / desire', surfaceForm: 'хотеть', gloss: 'to want', role: 'verb', transliteration: 'khotet\'', note: 'Irregular: 1sg хочу, 3sg хочет.', exampleRu: 'Я хочу чай.', exampleEn: 'I want tea.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'хочу', gloss: 'want', role: 'verb' }, { form: 'чай', gloss: 'tea', role: 'noun' }], cloze: { prompt: 'Я ___ чай.', answer: 'хочу', meaning: 'I want tea.' } },
  { code: 'NEED', tier: 0, cluster: 'volition', label: 'Need / necessity', surfaceForm: 'нужно', gloss: 'necessary / one must', role: 'particle', transliteration: 'nuzhno', note: 'Impersonal: "Мне нужно ..." = "I need to ...". Variant надо is colloquial.', exampleRu: 'Мне нужно работать.', exampleEn: 'I need to work.' },
  { code: 'CAN_ABILITY', tier: 0, cluster: 'modal', label: 'Ability (can)', surfaceForm: 'мочь', gloss: 'to be able / can', role: 'verb', transliteration: 'moch\'', note: 'Irregular: 1sg могу, 3sg может. Уметь = to know how to.', exampleRu: 'Я могу читать.', exampleEn: 'I can read.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'могу', gloss: 'can', role: 'verb' }, { form: 'читать', gloss: 'read', role: 'verb' }], cloze: { prompt: 'Я ___ читать.', answer: 'могу', meaning: 'I can read.' } },
  { code: 'NEGATION', tier: 0, cluster: 'negation', label: 'Negation', surfaceForm: 'не', gloss: 'not', role: 'particle', transliteration: 'ne', note: 'Placed directly before the negated word. "Нет" = "no / there is not".', exampleRu: 'Я не знаю.', exampleEn: 'I don\'t know.' },

  // ── Tier 1 — volition & preference ───────────────────────────────────
  { code: 'LIKE_PREFER', tier: 1, cluster: 'volition', label: 'Like / prefer', surfaceForm: 'нравиться', gloss: 'to be pleasing / to like', role: 'verb', transliteration: 'nravit\'sya', note: 'Reversed construction: "Мне нравится X" = "X pleases me" = "I like X". любить = to love/like (direct).', exampleRu: 'Мне нравится музыка.', exampleEn: 'I like music.', words: [{ form: 'мне', gloss: 'to me', role: 'pronoun' }, { form: 'нравится', gloss: 'is pleasing', role: 'verb' }, { form: 'музыка', gloss: 'music', role: 'noun' }], cloze: { prompt: 'Мне ___ музыка.', answer: 'нравится', meaning: 'I like music.' } },

  // ── Tier 1 — motion ──────────────────────────────────────────────────
  { code: 'GO', tier: 1, cluster: 'motion', label: 'Go (motion away)', surfaceForm: 'идти', gloss: 'to go (on foot, one direction)', role: 'verb', transliteration: 'idti', note: 'Unidirectional imperfective. Multidirectional: ходить. By vehicle: ехать.', exampleRu: 'Я иду домой.', exampleEn: 'I am going home.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'иду', gloss: 'am going', role: 'verb' }, { form: 'домой', gloss: 'home', role: 'adverb' }], cloze: { prompt: 'Я ___ домой.', answer: 'иду', meaning: 'I am going home.' } },
  { code: 'COME', tier: 1, cluster: 'motion', label: 'Come (motion toward)', surfaceForm: 'приходить', gloss: 'to come / to arrive', role: 'verb', transliteration: 'prikhodit\'', note: 'Imperfective. Perfective: прийти.', exampleRu: 'Он приходит рано.', exampleEn: 'He comes early.' },
  { code: 'MOVE_TO', tier: 1, cluster: 'motion', label: 'Move to / into', surfaceForm: 'входить', gloss: 'to enter / go into', role: 'verb', transliteration: 'vhodit\'', note: 'Perfective: войти.', exampleRu: 'Я вхожу в дом.', exampleEn: 'I am entering the house.' },
  { code: 'MOVE_FROM', tier: 1, cluster: 'motion', label: 'Move from / out of', surfaceForm: 'выходить', gloss: 'to exit / go out', role: 'verb', transliteration: 'vykhodit\'', note: 'Perfective: выйти. "Уходить" = to leave/depart.', exampleRu: 'Я выхожу из дома.', exampleEn: 'I am leaving the house.' },
  { code: 'LIVE_STAY', tier: 1, cluster: 'location', label: 'Live / stay / reside', surfaceForm: 'жить', gloss: 'to live', role: 'verb', transliteration: 'zhit\'', note: '1sg живу, 3sg живёт. "Оставаться" = to stay/remain.', exampleRu: 'Я живу в Москве.', exampleEn: 'I live in Moscow.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'живу', gloss: 'live', role: 'verb' }, { form: 'в Москве', gloss: 'in Moscow', role: 'adverb' }], cloze: { prompt: 'Я ___ в Москве.', answer: 'живу', meaning: 'I live in Moscow.' } },
  { code: 'LOCATE_IN', tier: 1, cluster: 'location', label: 'Location in / inside', surfaceForm: 'в', gloss: 'in / inside', role: 'particle', transliteration: 'v', note: 'Preposition + prepositional case ("в доме" = in the house) or accusative for motion-into ("в дом" = into the house).', exampleRu: 'Книга в столе.', exampleEn: 'The book is in the desk.' },
  { code: 'LOCATE_ON', tier: 1, cluster: 'location', label: 'Location on / at', surfaceForm: 'на', gloss: 'on / at', role: 'particle', transliteration: 'na', note: 'Preposition. "Стоять" = to stand (be located, of objects).', exampleRu: 'Чашка на столе.', exampleEn: 'The cup is on the table.' },

  // ── Tier 1 — perception ──────────────────────────────────────────────
  { code: 'SEE', tier: 1, cluster: 'perception', label: 'See / watch', surfaceForm: 'видеть', gloss: 'to see', role: 'verb', transliteration: 'videt\'', note: 'Irregular: 1sg вижу, 3sg видит. "Смотреть" = to watch/look at.', exampleRu: 'Я вижу море.', exampleEn: 'I see the sea.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'вижу', gloss: 'see', role: 'verb' }, { form: 'море', gloss: 'sea', role: 'noun' }], cloze: { prompt: 'Я ___ море.', answer: 'вижу', meaning: 'I see the sea.' } },
  { code: 'HEAR', tier: 1, cluster: 'perception', label: 'Hear / listen', surfaceForm: 'слышать', gloss: 'to hear', role: 'verb', transliteration: 'slyshat\'', note: '"Слушать" = to listen (actively).', exampleRu: 'Я слышу песню.', exampleEn: 'I hear a song.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'слышу', gloss: 'hear', role: 'verb' }, { form: 'песню', gloss: 'song', role: 'noun' }], cloze: { prompt: 'Я ___ песню.', answer: 'слышу', meaning: 'I hear a song.' } },

  // ── Tier 1 — cognition & communication ───────────────────────────────
  { code: 'KNOW', tier: 1, cluster: 'cognition', label: 'Know', surfaceForm: 'знать', gloss: 'to know', role: 'verb', transliteration: 'znat\'', note: 'Regular: 1sg знаю, 3sg знает.', exampleRu: 'Я знаю ответ.', exampleEn: 'I know the answer.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'знаю', gloss: 'know', role: 'verb' }, { form: 'ответ', gloss: 'answer', role: 'noun' }], cloze: { prompt: 'Я ___ ответ.', answer: 'знаю', meaning: 'I know the answer.' } },
  { code: 'THINK', tier: 1, cluster: 'cognition', label: 'Think / believe', surfaceForm: 'думать', gloss: 'to think', role: 'verb', transliteration: 'dumat\'', note: '1sg думаю, 3sg думает.', exampleRu: 'Я думаю о тебе.', exampleEn: 'I am thinking of you.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'думаю', gloss: 'think', role: 'verb' }, { form: 'о тебе', gloss: 'about you', role: 'adverb' }], cloze: { prompt: 'Я ___ о тебе.', answer: 'думаю', meaning: 'I am thinking of you.' } },
  { code: 'UNDERSTAND', tier: 1, cluster: 'cognition', label: 'Understand / comprehend', surfaceForm: 'понимать', gloss: 'to understand', role: 'verb', transliteration: 'ponimat\'', note: 'Perfective: понять.', exampleRu: 'Я понимаю русский.', exampleEn: 'I understand Russian.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'понимаю', gloss: 'understand', role: 'verb' }, { form: 'русский', gloss: 'Russian', role: 'noun' }], cloze: { prompt: 'Я ___ русский.', answer: 'понимаю', meaning: 'I understand Russian.' } },
  { code: 'SAY', tier: 1, cluster: 'communication', label: 'Say / tell / speak', surfaceForm: 'говорить', gloss: 'to say / to speak', role: 'verb', transliteration: 'govorit\'', note: 'Imperfective. Perfective "сказать" = to say (once).', exampleRu: 'Он говорит правду.', exampleEn: 'He is telling the truth.', words: [{ form: 'он', gloss: 'he', role: 'pronoun' }, { form: 'говорит', gloss: 'says', role: 'verb' }, { form: 'правду', gloss: 'the truth', role: 'noun' }], cloze: { prompt: 'Он ___ правду.', answer: 'говорит', meaning: 'He is telling the truth.' } },

  // ── Tier 2 — interrogatives ──────────────────────────────────────────
  { code: 'QUESTION_PERSON', tier: 2, cluster: 'interrogative', label: 'Who', surfaceForm: 'кто', gloss: 'who', role: 'pronoun', transliteration: 'kto', exampleRu: 'Кто это?', exampleEn: 'Who is that?' },
  { code: 'QUESTION_THING', tier: 2, cluster: 'interrogative', label: 'What', surfaceForm: 'что', gloss: 'what', role: 'pronoun', transliteration: 'chto', note: 'Pronounced "shto".', exampleRu: 'Что это?', exampleEn: 'What is that?' },
  { code: 'QUESTION_PLACE', tier: 2, cluster: 'interrogative', label: 'Where', surfaceForm: 'где', gloss: 'where', role: 'adverb', transliteration: 'gde', exampleRu: 'Где ты?', exampleEn: 'Where are you?' },
  { code: 'QUESTION_TIME', tier: 2, cluster: 'interrogative', label: 'When', surfaceForm: 'когда', gloss: 'when', role: 'adverb', transliteration: 'kogda', exampleRu: 'Когда ты придёшь?', exampleEn: 'When will you come?' },

  // ── Tier 2 — time ────────────────────────────────────────────────────
  { code: 'TIME_NOW', tier: 2, cluster: 'time', label: 'Now', surfaceForm: 'сейчас', gloss: 'now', role: 'adverb', transliteration: 'seychas', note: 'Also "теперь" (now, given a change).', exampleRu: 'Я сейчас занят.', exampleEn: 'I am busy now.' },
  { code: 'TIME_BEFORE', tier: 2, cluster: 'time', label: 'Before / past', surfaceForm: 'раньше', gloss: 'before / earlier', role: 'adverb', transliteration: 'ran\'she', exampleRu: 'Раньше я жил там.', exampleEn: 'Earlier I lived there.' },
  { code: 'TIME_AFTER', tier: 2, cluster: 'time', label: 'After / later', surfaceForm: 'потом', gloss: 'then / later', role: 'adverb', transliteration: 'potom', exampleRu: 'Сначала работа, потом отдых.', exampleEn: 'First work, then rest.' },

  // ── Tier 2 — quantity ────────────────────────────────────────────────
  { code: 'QUANTITY_ONE', tier: 2, cluster: 'quantity', label: 'One / single', surfaceForm: 'один', gloss: 'one', role: 'adjective', transliteration: 'odin', note: 'Agrees in gender: один/одна/одно.', exampleRu: 'У меня один вопрос.', exampleEn: 'I have one question.' },
  { code: 'QUANTITY_MANY', tier: 2, cluster: 'quantity', label: 'Many / much', surfaceForm: 'много', gloss: 'many / much', role: 'adverb', transliteration: 'mnogo', exampleRu: 'Там много людей.', exampleEn: 'There are many people there.' },
  { code: 'QUANTITY_SOME', tier: 2, cluster: 'quantity', label: 'Some / a few', surfaceForm: 'немного', gloss: 'a little / a few', role: 'adverb', transliteration: 'nemnogo', exampleRu: 'Я знаю немного русский.', exampleEn: 'I know a little Russian.' },

  // ── Tier 2 — comparison ──────────────────────────────────────────────
  { code: 'MORE', tier: 2, cluster: 'comparison', label: 'More', surfaceForm: 'больше', gloss: 'more / bigger', role: 'adverb', transliteration: 'bol\'she', exampleRu: 'Я хочу больше.', exampleEn: 'I want more.' },
  { code: 'LESS', tier: 2, cluster: 'comparison', label: 'Less / fewer', surfaceForm: 'меньше', gloss: 'less / fewer / smaller', role: 'adverb', transliteration: 'men\'she', exampleRu: 'Меньше слов, больше дела.', exampleEn: 'Fewer words, more action.' },
  { code: 'SAME', tier: 2, cluster: 'comparison', label: 'Same / also', surfaceForm: 'тоже', gloss: 'also / too', role: 'particle', transliteration: 'tozhe', note: '"Также" = also (more formal). "Такой же" = the same (identical).', exampleRu: 'Я тоже хочу.', exampleEn: 'I want to as well.' },
  { code: 'DIFFERENT', tier: 2, cluster: 'comparison', label: 'Different / other', surfaceForm: 'другой', gloss: 'other / different', role: 'adjective', transliteration: 'drugoy', exampleRu: 'Покажите другой.', exampleEn: 'Show me another one.' },

  // ── Tier 2 — connectives ─────────────────────────────────────────────
  { code: 'REASON_BECAUSE', tier: 2, cluster: 'connective', label: 'Because', surfaceForm: 'потому что', gloss: 'because', role: 'particle', transliteration: 'potomu chto', exampleRu: 'Я дома, потому что идёт дождь.', exampleEn: 'I am home because it is raining.' },
  { code: 'CONTRAST_BUT', tier: 2, cluster: 'connective', label: 'But / however', surfaceForm: 'но', gloss: 'but', role: 'particle', transliteration: 'no', exampleRu: 'Хочу, но не могу.', exampleEn: 'I want to, but I can\'t.' },
  { code: 'CONDITION_IF', tier: 2, cluster: 'connective', label: 'If / condition', surfaceForm: 'если', gloss: 'if', role: 'particle', transliteration: 'esli', exampleRu: 'Если хочешь, пойдём.', exampleEn: 'If you want, let\'s go.' },

  // ── Tier 3 — tense / aspect / mood ───────────────────────────────────
  { code: 'PAST_TENSE', tier: 3, cluster: 'tense', label: 'Past tense', surfaceForm: 'Я видел', gloss: 'I saw', role: 'verb', transliteration: 'ya videl', note: 'Russian past tense is formed with -л (мasc), -ла (fem), -ло (neut), -ли (pl). No person agreement in the past.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'видел', gloss: 'saw', role: 'verb' }], exampleRu: 'Я видел этот фильм.', exampleEn: 'I saw this film.' },
  { code: 'FUTURE_TENSE', tier: 3, cluster: 'tense', label: 'Future tense', surfaceForm: 'Я буду читать', gloss: 'I will read', role: 'verb', transliteration: 'ya budu chitat\'', note: 'Imperfective future = буду + infinitive. Perfective verbs form future by conjugating directly (прочитаю).', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'буду', gloss: 'will', role: 'verb' }, { form: 'читать', gloss: 'read', role: 'verb' }], exampleRu: 'Я буду читать вечером.', exampleEn: 'I will read in the evening.' },
  { code: 'PERFECTIVE_ASPECT', tier: 3, cluster: 'aspect', label: 'Perfective aspect', surfaceForm: 'Я прочитал книгу', gloss: 'I read (finished) the book', role: 'verb', transliteration: 'ya prochital knigu', note: 'Perfective views the event as a completed whole (prefix про- + past).', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'прочитал', gloss: 'read through', role: 'verb' }, { form: 'книгу', gloss: 'the book', role: 'noun' }], exampleRu: 'Я прочитал книгу.', exampleEn: 'I have read the book (cover to cover).' },
  { code: 'IMPERFECTIVE_ASPECT', tier: 3, cluster: 'aspect', label: 'Imperfective aspect', surfaceForm: 'Я читал книгу', gloss: 'I was reading the book', role: 'verb', transliteration: 'ya chital knigu', note: 'Imperfective views the event as ongoing/repeated (no perfective prefix).', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'читал', gloss: 'was reading', role: 'verb' }, { form: 'книгу', gloss: 'the book', role: 'noun' }], exampleRu: 'Я читал книгу вчера.', exampleEn: 'I was reading the book yesterday.' },
  { code: 'PROGRESSIVE_ASPECT', tier: 3, cluster: 'aspect', label: 'Progressive aspect', surfaceForm: 'Я читаю сейчас', gloss: 'I am reading now', role: 'verb', transliteration: 'ya chitayu seychas', note: 'Russian has NO distinct progressive — present tense + "сейчас" (now) conveys "I am reading".', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'читаю', gloss: 'read', role: 'verb' }, { form: 'сейчас', gloss: 'now', role: 'adverb' }], exampleRu: 'Я читаю сейчас.', exampleEn: 'I am reading now.' },
  { code: 'HABITUAL_ASPECT', tier: 3, cluster: 'aspect', label: 'Habitual aspect', surfaceForm: 'Я читал каждый день', gloss: 'I used to read every day', role: 'verb', transliteration: 'ya chital kazhdyy den\'', note: 'Russian has no dedicated habitual marker — imperfective past + "каждый день" (every day) expresses habit.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'читал', gloss: 'read', role: 'verb' }, { form: 'каждый день', gloss: 'every day', role: 'adverb' }], exampleRu: 'Я читал каждый день.', exampleEn: 'I used to read every day.' },
  { code: 'CONDITIONAL_MOOD', tier: 3, cluster: 'mood', label: 'Conditional mood', surfaceForm: 'Я бы пошёл', gloss: 'I would go', role: 'verb', transliteration: 'ya by poshyol', note: 'Conditional = particle бы + past tense.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'бы', gloss: 'would', role: 'particle' }, { form: 'пошёл', gloss: 'went', role: 'verb' }], exampleRu: 'Я бы пошёл с тобой.', exampleEn: 'I would go with you.' },
  { code: 'SUBJUNCTIVE_MOOD', tier: 3, cluster: 'mood', label: 'Subjunctive mood', surfaceForm: 'Я хотел бы', gloss: 'I would like', role: 'verb', transliteration: 'ya khotel by', note: 'Russian has no distinct subjunctive — бы + past expresses irrealis wish.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'хотел бы', gloss: 'would like', role: 'verb' }], exampleRu: 'Я хотел бы чаю.', exampleEn: 'I would like some tea.' },
  { code: 'IMPERATIVE_MOOD', tier: 3, cluster: 'mood', label: 'Imperative mood', surfaceForm: 'Читай!', gloss: 'Read!', role: 'verb', transliteration: 'chitay', note: 'Formed from the stem: -й / -и / -ьте (plural/polite).', words: [{ form: 'читай', gloss: 'read!', role: 'verb' }], exampleRu: 'Читай громко!', exampleEn: 'Read out loud!' },
  { code: 'EVIDENTIALITY', tier: 3, cluster: 'evidential', label: 'Evidentiality', surfaceForm: 'Говорят, что…', gloss: 'They say that…', role: 'verb', transliteration: 'govoryat chto', note: 'Russian has NO grammatical evidential — hearsay is expressed lexically ("говорят", "я слышал").', words: [{ form: 'говорят', gloss: 'they say', role: 'verb' }, { form: 'что', gloss: 'that', role: 'particle' }], exampleRu: 'Говорят, что он уехал.', exampleEn: 'They say he left.' },

  // ── Tier 4 — case / argument structure ──────────────────────────────
  { code: 'NOMINATIVE_CASE', tier: 4, cluster: 'case', label: 'Nominative case', surfaceForm: 'Дом большой', gloss: 'The house is big', role: 'noun', transliteration: 'dom bol\'shoy', note: 'Nominative = dictionary form; marks the grammatical subject.', words: [{ form: 'дом', gloss: 'house', role: 'noun' }, { form: 'большой', gloss: 'big', role: 'adjective' }], exampleRu: 'Дом большой.', exampleEn: 'The house is big.' },
  { code: 'ACCUSATIVE_CASE', tier: 4, cluster: 'case', label: 'Accusative case', surfaceForm: 'Я вижу кота', gloss: 'I see the cat', role: 'noun', transliteration: 'ya vizhu kota', note: 'Accusative marks the direct object. Animate masculines take -а (кот→кота).', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'вижу', gloss: 'see', role: 'verb' }, { form: 'кота', gloss: 'the cat', role: 'noun' }], exampleRu: 'Я вижу кота.', exampleEn: 'I see the cat.' },
  { code: 'DATIVE_CASE', tier: 4, cluster: 'case', label: 'Dative case', surfaceForm: 'Я даю книгу другу', gloss: 'I give the book to a friend', role: 'noun', transliteration: 'ya dayu knigu drugu', note: 'Dative marks the recipient/beneficiary (друг→другу).', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'даю', gloss: 'give', role: 'verb' }, { form: 'книгу', gloss: 'the book', role: 'noun' }, { form: 'другу', gloss: 'to a friend', role: 'noun' }], exampleRu: 'Я даю книгу другу.', exampleEn: 'I give the book to a friend.' },
  { code: 'GENITIVE_CASE', tier: 4, cluster: 'case', label: 'Genitive case', surfaceForm: 'книга друга', gloss: 'the friend\'s book', role: 'noun', transliteration: 'kniga druga', note: 'Genitive marks possession/origin/part-whole (друг→друга).', words: [{ form: 'книга', gloss: 'book', role: 'noun' }, { form: 'друга', gloss: 'of a friend', role: 'noun' }], exampleRu: 'Это книга друга.', exampleEn: 'This is the friend\'s book.' },
  { code: 'INSTRUMENTAL_CASE', tier: 4, cluster: 'case', label: 'Instrumental case', surfaceForm: 'Я пишу ручкой', gloss: 'I write with a pen', role: 'noun', transliteration: 'ya pishu ruchkoy', note: 'Instrumental marks the tool/means (ручка→ручкой).', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'пишу', gloss: 'write', role: 'verb' }, { form: 'ручкой', gloss: 'with a pen', role: 'noun' }], exampleRu: 'Я пишу ручкой.', exampleEn: 'I write with a pen.' },
  { code: 'LOCATIVE_CASE', tier: 4, cluster: 'case', label: 'Locative case', surfaceForm: 'в доме', gloss: 'in the house', role: 'noun', transliteration: 'v dome', note: 'Russian uses the prepositional case after в/на for location (дом→доме).', words: [{ form: 'в', gloss: 'in', role: 'particle' }, { form: 'доме', gloss: 'the house', role: 'noun' }], exampleRu: 'Я в доме.', exampleEn: 'I am in the house.' },
  { code: 'ERGATIVE_CASE', tier: 4, cluster: 'case', label: 'Ergative case', surfaceForm: '—', gloss: 'Russian has no ergative', role: 'particle', note: 'Russian is nominative-accusative and has NO ergative case. Ergativity is absent from the grammar (it exists in languages like Georgian or Basque).' },
  { code: 'REFLEXIVE_VOICE', tier: 4, cluster: 'voice', label: 'Reflexive', surfaceForm: 'Я моюсь', gloss: 'I wash myself', role: 'verb', transliteration: 'ya moyus\'', note: 'Reflexive is marked by the particle -ся / -сь on the verb (мыть→мыться).', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'моюсь', gloss: 'wash myself', role: 'verb' }], exampleRu: 'Я моюсь утром.', exampleEn: 'I wash myself in the morning.' },
  { code: 'RECIPROCAL_VOICE', tier: 4, cluster: 'voice', label: 'Reciprocal', surfaceForm: 'Они встретились', gloss: 'They met (each other)', role: 'verb', transliteration: 'oni vstretilis\'', note: 'Reciprocal meaning is expressed with -ся + "друг друга" (each other).', words: [{ form: 'они', gloss: 'they', role: 'pronoun' }, { form: 'встретились', gloss: 'met', role: 'verb' }], exampleRu: 'Они встретились в парке.', exampleEn: 'They met in the park.' },
  { code: 'SUBJECT_AGREEMENT', tier: 4, cluster: 'agreement', label: 'Subject agreement', surfaceForm: 'Я читаю, он читает', gloss: 'I read, he reads', role: 'verb', transliteration: 'ya chitayu on chitayet', note: 'Russian verbs agree with the subject in person + number (1sg читаю, 3sg читает); past agrees in gender.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'читаю', gloss: 'read', role: 'verb' }, { form: 'он', gloss: 'he', role: 'pronoun' }, { form: 'читает', gloss: 'reads', role: 'verb' }], exampleRu: 'Я читаю, а он читает.', exampleEn: 'I read, and he reads.' },
  { code: 'OBJECT_AGREEMENT', tier: 4, cluster: 'agreement', label: 'Object agreement', surfaceForm: 'Я вижу новый дом', gloss: 'I see the new house', role: 'adjective', transliteration: 'ya vizhu novyy dom', note: 'Russian adjectives/past verbs can agree with the direct object in gender/number, not person.', words: [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'вижу', gloss: 'see', role: 'verb' }, { form: 'новый', gloss: 'new', role: 'adjective' }, { form: 'дом', gloss: 'house', role: 'noun' }], exampleRu: 'Я вижу новый дом.', exampleEn: 'I see the new house.' },

  // ── Tier 5 — derivational morphology ─────────────────────────────────
  { code: 'DIMINUTIVE', tier: 5, cluster: 'derivation', label: 'Diminutive', surfaceForm: 'домик', gloss: 'little house', role: 'noun', transliteration: 'domik', note: 'Suffixes -ик / -ок / -к- convey smallness or endearment (дом→домик).', exampleRu: 'Какой милый домик!', exampleEn: 'What a cute little house!' },
  { code: 'AUGMENTATIVE', tier: 5, cluster: 'derivation', label: 'Augmentative', surfaceForm: 'домище', gloss: 'huge house', role: 'noun', transliteration: 'domishche', note: 'Suffixes -ище / -ища convey largeness, often pejorative (дом→домище).', exampleRu: 'Какой огромный домище!', exampleEn: 'What a huge house!' },
  { code: 'NOMINALIZATION', tier: 5, cluster: 'derivation', label: 'Nominalization', surfaceForm: 'чтение', gloss: 'reading (noun)', role: 'noun', transliteration: 'chteniye', note: 'Suffix -ни(е) turns a verb into a noun (читать→чтение).', exampleRu: 'Чтение — моё хобби.', exampleEn: 'Reading is my hobby.' },
  { code: 'VERBALIZATION', tier: 5, cluster: 'derivation', label: 'Verbalization', surfaceForm: 'обедать', gloss: 'to have lunch', role: 'verb', transliteration: 'obedat\'', note: 'Suffix -а- turns a noun into a verb (обед→обедать).', exampleRu: 'Мы обедаем вместе.', exampleEn: 'We have lunch together.' },
  { code: 'NEGATION_PREFIX', tier: 5, cluster: 'derivation', label: 'Negating prefix', surfaceForm: 'неинтересный', gloss: 'uninteresting', role: 'adjective', transliteration: 'neinteresnyy', note: 'Prefix не- reverses meaning (интересный→неинтересный).', exampleRu: 'Этот фильм неинтересный.', exampleEn: 'This film is uninteresting.' },
  { code: 'COMPOUND_WORD', tier: 5, cluster: 'derivation', label: 'Compound word', surfaceForm: 'диван-кровать', gloss: 'sofa-bed', role: 'noun', transliteration: 'divan-krovat\'', note: 'Two roots joined (often hyphenated) into one word.', exampleRu: 'Я сплю на диване-кровати.', exampleEn: 'I sleep on the sofa-bed.' },

  // ── Tier 6 — register / pragmatics ───────────────────────────────────
  { code: 'FORMAL_REGISTER', tier: 6, cluster: 'register', label: 'Formal register', surfaceForm: 'Здравствуйте', gloss: 'Hello (formal)', role: 'particle', transliteration: 'zdravstvuyte', note: 'Russian has no grammaticalized formal register — formality is lexical (Вы + "Здравствуйте", polite syntax).', exampleRu: 'Здравствуйте, Иван Петрович.', exampleEn: 'Hello, Ivan Petrovich.' },
  { code: 'INFORMAL_REGISTER', tier: 6, cluster: 'register', label: 'Informal register', surfaceForm: 'Привет', gloss: 'Hi (informal)', role: 'particle', transliteration: 'privet', note: 'Informality is lexical (ты + "Привет", colloquial words) — not morphologically marked.', exampleRu: 'Привет! Как дела?', exampleEn: 'Hi! How are things?' },
  { code: 'HONORIFIC', tier: 6, cluster: 'register', label: 'Honorific', surfaceForm: 'Вы', gloss: 'you (respectful/formal)', role: 'pronoun', transliteration: 'vy', note: 'Russian honorification is limited to the T/V distinction (ты vs Вы) + titles (господин/госпожа). There are no honorific verbs.', exampleRu: 'Вы господин Иванов?', exampleEn: 'Are you Mr Ivanov?' },
  { code: 'HUMBLE_FORM', tier: 6, cluster: 'register', label: 'Humble form', surfaceForm: 'Простите', gloss: 'Excuse me (self-lowering)', role: 'particle', transliteration: 'prostite', note: 'Russian has NO humble verbal morphology (no kenjougo). Self-lowering is expressed lexically via apology/deferral.', exampleRu: 'Простите за беспокойство.', exampleEn: 'Sorry to bother you.' },
  { code: 'POLITE_REQUEST', tier: 6, cluster: 'pragmatic', label: 'Polite request', surfaceForm: 'Будьте добры', gloss: 'be so kind / please', role: 'particle', transliteration: 'bud\'te dobry', exampleRu: 'Будьте добры, передайте соль.', exampleEn: 'Please pass the salt.' },
  { code: 'APOLOGY', tier: 6, cluster: 'pragmatic', label: 'Apology', surfaceForm: 'Извините', gloss: 'sorry / excuse me', role: 'particle', transliteration: 'izvinite', exampleRu: 'Извините, я опоздал.', exampleEn: 'Sorry, I am late.' },
  { code: 'GREETING', tier: 6, cluster: 'pragmatic', label: 'Greeting', surfaceForm: 'Привет!', gloss: 'Hi!', role: 'particle', transliteration: 'privet', exampleRu: 'Привет! Рад тебя видеть.', exampleEn: 'Hi! Glad to see you.' },
  { code: 'FAREWELL', tier: 6, cluster: 'pragmatic', label: 'Farewell', surfaceForm: 'До свидания', gloss: 'Goodbye', role: 'particle', transliteration: 'do svidaniya', exampleRu: 'До свидания, увидимся!', exampleEn: 'Goodbye, see you!' },

  // ── Tier 7 — discourse / connectivity ───────────────────────────────
  { code: 'TOPIC_MARKER', tier: 7, cluster: 'discourse', label: 'Topic marker', surfaceForm: 'Что касается…', gloss: 'As for…', role: 'particle', transliteration: 'chto kasaetsya', note: 'Russian has no dedicated topic particle (unlike Japanese は) — topic is set lexically or by word order.', words: [{ form: 'что', gloss: 'what', role: 'pronoun' }, { form: 'касается', gloss: 'concerns', role: 'verb' }], exampleRu: 'Что касается денег, я согласен.', exampleEn: 'As for money, I agree.' },
  { code: 'FOCUS_PARTICLE', tier: 7, cluster: 'discourse', label: 'Focus particle', surfaceForm: 'даже', gloss: 'even', role: 'particle', transliteration: 'dazhe', note: 'Also "только" (only), "именно" (exactly).', exampleRu: 'Даже он согласился.', exampleEn: 'Even he agreed.' },
  { code: 'CONCESSION', tier: 7, cluster: 'discourse', label: 'Concession', surfaceForm: 'хотя', gloss: 'although', role: 'particle', transliteration: 'khotya', exampleRu: 'Хотя было поздно, он пришёл.', exampleEn: 'Although it was late, he came.' },
  { code: 'ELABORATION', tier: 7, cluster: 'discourse', label: 'Elaboration', surfaceForm: 'то есть', gloss: 'that is / namely', role: 'particle', transliteration: 'to yest', exampleRu: 'Я занят, то есть не могу.', exampleEn: 'I am busy, that is, I can\'t.' },
  { code: 'SEQUENCE', tier: 7, cluster: 'discourse', label: 'Sequence', surfaceForm: 'затем', gloss: 'then / next', role: 'adverb', transliteration: 'zatem', exampleRu: 'Сначала завтрак, затем работа.', exampleEn: 'First breakfast, then work.' },
  { code: 'CAUSAL_CHAIN', tier: 7, cluster: 'discourse', label: 'Causal chain', surfaceForm: 'поэтому', gloss: 'therefore / so', role: 'particle', transliteration: 'poetomu', exampleRu: 'Шёл дождь, поэтому я остался дома.', exampleEn: 'It was raining, so I stayed home.' },
  { code: 'SUMMARY', tier: 7, cluster: 'discourse', label: 'Summary', surfaceForm: 'в общем', gloss: 'in general / overall', role: 'particle', transliteration: 'v obshchem', exampleRu: 'В общем, всё хорошо.', exampleEn: 'Overall, everything is fine.' },

  // ── Tier 8 — idiomatic / formulaic ──────────────────────────────────
  { code: 'BODY_IDIOM', tier: 8, cluster: 'idiom', label: 'Body-part idiom', surfaceForm: 'встать не с той ноги', gloss: 'to get up on the wrong side of the bed', role: 'verb', transliteration: 'vstat\' ne s toy nogi', words: [{ form: 'встать', gloss: 'to get up', role: 'verb' }, { form: 'не с той ноги', gloss: 'not from that foot', role: 'adverb' }], exampleRu: 'Он встал не с той ноги.', exampleEn: 'He got up on the wrong side of the bed.' },
  { code: 'EMOTION_IDIOM', tier: 8, cluster: 'idiom', label: 'Emotion idiom', surfaceForm: 'быть на седьмом небе', gloss: 'to be on cloud nine', role: 'verb', transliteration: 'byt\' na sed\'mom nebe', words: [{ form: 'быть', gloss: 'to be', role: 'verb' }, { form: 'на седьмом небе', gloss: 'on the seventh heaven', role: 'adverb' }], exampleRu: 'Она на седьмом небе от счастья.', exampleEn: 'She is on cloud nine with happiness.' },
  { code: 'PROVERB', tier: 8, cluster: 'idiom', label: 'Proverb', surfaceForm: 'Семь раз отмерь, один раз отрежь.', gloss: 'Measure seven times, cut once.', role: 'verb', transliteration: 'sem\' raz otmer\' odin raz otrezh\'', words: [{ form: 'семь раз', gloss: 'seven times', role: 'adverb' }, { form: 'отмерь', gloss: 'measure!', role: 'verb' }, { form: 'один раз', gloss: 'one time', role: 'adverb' }, { form: 'отрежь', gloss: 'cut!', role: 'verb' }], exampleRu: 'Семь раз отмерь, один раз отрежь.', exampleEn: 'Measure seven times, cut once.' },
  { code: 'FIXED_EXPRESSION', tier: 8, cluster: 'idiom', label: 'Fixed expression', surfaceForm: 'как ни в чём не бывало', gloss: 'as if nothing had happened', role: 'particle', transliteration: 'kak ni v chyom ne byvalo', words: [{ form: 'как', gloss: 'as', role: 'particle' }, { form: 'ни в чём не бывало', gloss: 'nothing had happened', role: 'adverb' }], exampleRu: 'Он улыбнулся, как ни в чём не бывало.', exampleEn: 'He smiled as if nothing had happened.' },
  { code: 'COLLOQUIAL_VARIANT', tier: 8, cluster: 'idiom', label: 'Colloquial variant', surfaceForm: 'щас', gloss: 'right now (colloquial)', role: 'adverb', transliteration: 'shchas', note: 'Spoken reduced form of "сейчас".', exampleRu: 'Щас подойду.', exampleEn: 'I\'ll be right there.' },

  // ── Tier 9 — specialist / literary ───────────────────────────────────
  { code: 'POETIC_REGISTER', tier: 9, cluster: 'register', label: 'Poetic register', surfaceForm: 'очи', gloss: 'eyes (poetic)', role: 'noun', transliteration: 'ochi', note: 'Poetic/church word for "глаза" (eyes).', exampleRu: 'Её очи сияли.', exampleEn: 'Her eyes shone.' },
  { code: 'ARCHAIC_REGISTER', tier: 9, cluster: 'register', label: 'Archaic register', surfaceForm: 'сей', gloss: 'this (archaic)', role: 'adjective', transliteration: 'sey', note: 'Archaic/literary for "этот" (this).', exampleRu: 'Сей час.', exampleEn: 'At this hour.' },
  { code: 'LITERARY_REGISTER', tier: 9, cluster: 'register', label: 'Literary register', surfaceForm: 'дабы', gloss: 'in order to (literary)', role: 'particle', transliteration: 'daby', note: 'Literary/elevated for "чтобы" (so that).', exampleRu: 'Он трудился дабы прокормить семью.', exampleEn: 'He laboured in order to feed his family.' },
  { code: 'TECHNICAL_TERM', tier: 9, cluster: 'register', label: 'Technical term', surfaceForm: 'синус', gloss: 'sine (math)', role: 'noun', transliteration: 'sinus', exampleRu: 'Синус тридцати градусов равен половине.', exampleEn: 'The sine of thirty degrees is a half.' },
  { code: 'JOURNALISTIC_REGISTER', tier: 9, cluster: 'register', label: 'Journalistic register', surfaceForm: 'по сообщению', gloss: 'according to (news)', role: 'particle', transliteration: 'po soobshcheniyu', exampleRu: 'По сообщению агентства, кризис окончен.', exampleEn: 'According to the agency, the crisis is over.' },
  { code: 'LEGAL_TERM', tier: 9, cluster: 'register', label: 'Legal term', surfaceForm: 'истец', gloss: 'plaintiff (legal)', role: 'noun', transliteration: 'istets', exampleRu: 'Истец требует компенсацию.', exampleEn: 'The plaintiff demands compensation.' },
] as const;
