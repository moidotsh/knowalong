// utils/knowalong/fixtures/palette.ts
//
// The versatile high-frequency vocabulary palette — the bedrock of the
// mastery-driven generator's context wrapping (ADR §4; R7 encoding
// variability). This is the mock stand-in for the SAME data the Phase 6
// Supabase Edge Function takes as its AI *composition vocabulary*: the AI
// weaves a lyric target into these known words to produce ≥8 fluent,
// morphologically-correct i+1 context phrases. See
// `knowalong-studio/_reports/lyric-context-generation.md` (§3a palette
// requirement) and `knowalong/_reports/server-context-generation.md`
// (the reference Edge Function contract).
//
// DOUBLE DUTY (why expanding it is the most sustainable lever here):
//   1. It is what the Core Vocabulary deck TEACHES (fixtures/decks.ts) — so a
//      learner graduates a known pool before reaching the songs.
//   2. It is what the generator COMPOSES WITH — context phrases use only
//      palette + target vocabulary, so once the palette is graduated, those
//      phrases are i+1-ready (0 scaffolding).
// Per-language, reusable across every song; seed data (R5's exempt starter
// pack). Server reuse: the Edge Function receives `palette ∩ graduated` as an
// input parameter.
//
// KEYING (load-bearing — ADR R3): mastery keys by surface form, and a
// case/tense variant is a separate concept. So the mock palette ships the
// actual SURFACE FORMS used in context phrases (mostly nominative nouns as
// subjects/predicates + conjugated verbs + masc-nom adjectives — the forms
// that are grammatical in simple SVO / copula phrases the mock authors). The
// *server* palette is lemma-based and the AI inflects; the *mock* palette is
// form-based because the mock cannot inflect (no morphology metadata). Any
// inflected form an authored phrase needs MUST appear here verbatim, or it
// fails wrappability and the phrase is dropped.

import type { WordPart } from './learningItems';

export const PALETTE: readonly WordPart[] = [
  // ── Pronouns ─────────────────────────────────────────────────────────
  { form: 'я', gloss: 'I', role: 'pronoun' },
  { form: 'ты', gloss: 'you (sg.)', role: 'pronoun' },
  { form: 'он', gloss: 'he / it', role: 'pronoun' },
  { form: 'она', gloss: 'she', role: 'pronoun' },
  { form: 'оно', gloss: 'it', role: 'pronoun' },
  { form: 'мы', gloss: 'we', role: 'pronoun' },
  { form: 'вы', gloss: 'you (pl.)', role: 'pronoun' },
  { form: 'они', gloss: 'they', role: 'pronoun' },
  { form: 'это', gloss: 'this / it is', role: 'pronoun' },
  { form: 'кто', gloss: 'who', role: 'pronoun' },
  { form: 'что', gloss: 'what / that', role: 'pronoun' },

  // ── Verbs (conjugated forms used in phrases) ─────────────────────────
  { form: 'вижу', gloss: 'I see', role: 'verb' },
  { form: 'видит', gloss: 'sees', role: 'verb' },
  { form: 'знаю', gloss: 'I know', role: 'verb' },
  { form: 'знает', gloss: 'knows', role: 'verb' },
  { form: 'хочу', gloss: 'I want', role: 'verb' },
  { form: 'хочет', gloss: 'wants', role: 'verb' },
  { form: 'иду', gloss: 'I go', role: 'verb' },
  { form: 'идёт', gloss: 'goes', role: 'verb' },
  { form: 'живу', gloss: 'I live', role: 'verb' },
  { form: 'живёт', gloss: 'lives', role: 'verb' },
  { form: 'люблю', gloss: 'I love', role: 'verb' },
  { form: 'любит', gloss: 'loves', role: 'verb' },
  { form: 'делаю', gloss: 'I do', role: 'verb' },
  { form: 'делает', gloss: 'does', role: 'verb' },
  { form: 'говорит', gloss: 'speaks / says', role: 'verb' },
  { form: 'думает', gloss: 'thinks', role: 'verb' },
  { form: 'бежит', gloss: 'runs', role: 'verb' },
  { form: 'стоит', gloss: 'stands', role: 'verb' },
  { form: 'сидит', gloss: 'sits', role: 'verb' },
  { form: 'спит', gloss: 'sleeps', role: 'verb' },
  { form: 'смотрит', gloss: 'looks / watches', role: 'verb' },
  { form: 'слушает', gloss: 'listens', role: 'verb' },
  { form: 'читает', gloss: 'reads', role: 'verb' },
  { form: 'пишет', gloss: 'writes', role: 'verb' },
  { form: 'ест', gloss: 'eats', role: 'verb' },
  { form: 'пьёт', gloss: 'drinks', role: 'verb' },
  { form: 'работает', gloss: 'works', role: 'verb' },
  { form: 'понимает', gloss: 'understands', role: 'verb' },
  { form: 'помнит', gloss: 'remembers', role: 'verb' },
  { form: 'поёт', gloss: 'sings', role: 'verb' },
  { form: 'играет', gloss: 'plays', role: 'verb' },
  { form: 'ждёт', gloss: 'waits', role: 'verb' },
  { form: 'живой', gloss: 'alive', role: 'adjective' }, // also adj; kept here as a song-relevant form

  // ── Nouns (nominative — used as subjects / predicates) ───────────────
  { form: 'человек', gloss: 'person', role: 'noun' },
  { form: 'мальчик', gloss: 'boy', role: 'noun' },
  { form: 'девочка', gloss: 'girl', role: 'noun' },
  { form: 'друг', gloss: 'friend', role: 'noun' },
  { form: 'семья', gloss: 'family', role: 'noun' },
  { form: 'дом', gloss: 'house', role: 'noun' },
  { form: 'дверь', gloss: 'door', role: 'noun' },
  { form: 'окно', gloss: 'window', role: 'noun' },
  { form: 'стол', gloss: 'table', role: 'noun' },
  { form: 'стул', gloss: 'chair', role: 'noun' },
  { form: 'книга', gloss: 'book', role: 'noun' },
  { form: 'слово', gloss: 'word', role: 'noun' },
  { form: 'дело', gloss: 'matter / thing', role: 'noun' },
  { form: 'время', gloss: 'time', role: 'noun' },
  { form: 'день', gloss: 'day', role: 'noun' },
  { form: 'ночь', gloss: 'night', role: 'noun' },
  { form: 'утро', gloss: 'morning', role: 'noun' },
  { form: 'вечер', gloss: 'evening', role: 'noun' },
  { form: 'город', gloss: 'city', role: 'noun' },
  { form: 'улица', gloss: 'street', role: 'noun' },
  { form: 'дорога', gloss: 'road', role: 'noun' },
  { form: 'мост', gloss: 'bridge', role: 'noun' },
  { form: 'лес', gloss: 'forest', role: 'noun' },
  { form: 'море', gloss: 'sea', role: 'noun' },
  { form: 'река', gloss: 'river', role: 'noun' },
  { form: 'вода', gloss: 'water', role: 'noun' },
  { form: 'хлеб', gloss: 'bread', role: 'noun' },
  { form: 'чай', gloss: 'tea', role: 'noun' },
  { form: 'кофе', gloss: 'coffee', role: 'noun' },
  { form: 'яблоко', gloss: 'apple', role: 'noun' },
  { form: 'машина', gloss: 'car', role: 'noun' },
  { form: 'дерево', gloss: 'tree', role: 'noun' },
  { form: 'собака', gloss: 'dog', role: 'noun' },
  { form: 'кошка', gloss: 'cat', role: 'noun' },
  { form: 'птица', gloss: 'bird', role: 'noun' },
  { form: 'рука', gloss: 'hand / arm', role: 'noun' },
  { form: 'глаз', gloss: 'eye', role: 'noun' },
  { form: 'голова', gloss: 'head', role: 'noun' },
  { form: 'сердце', gloss: 'heart', role: 'noun' },
  { form: 'мир', gloss: 'world', role: 'noun' },
  { form: 'свет', gloss: 'light', role: 'noun' },
  { form: 'звук', gloss: 'sound', role: 'noun' },
  { form: 'голос', gloss: 'voice', role: 'noun' },
  { form: 'музыка', gloss: 'music', role: 'noun' },
  { form: 'дух', gloss: 'spirit', role: 'noun' },
  { form: 'гости', gloss: 'guests', role: 'noun' },

  // ── Adjectives (masc nominative — predicate / attributive) ───────────
  { form: 'большой', gloss: 'big', role: 'adjective' },
  { form: 'маленький', gloss: 'small', role: 'adjective' },
  { form: 'хороший', gloss: 'good', role: 'adjective' },
  { form: 'плохой', gloss: 'bad', role: 'adjective' },
  { form: 'новый', gloss: 'new', role: 'adjective' },
  { form: 'старый', gloss: 'old', role: 'adjective' },
  { form: 'красивый', gloss: 'beautiful', role: 'adjective' },
  { form: 'быстрый', gloss: 'fast', role: 'adjective' },
  { form: 'громкий', gloss: 'loud', role: 'adjective' },
  { form: 'тихий', gloss: 'quiet', role: 'adjective' },
  { form: 'сильный', gloss: 'strong', role: 'adjective' },
  { form: 'тёмный', gloss: 'dark', role: 'adjective' },
  { form: 'светлый', gloss: 'bright', role: 'adjective' },
  { form: 'счастливый', gloss: 'happy', role: 'adjective' },
  { form: 'грустный', gloss: 'sad', role: 'adjective' },
  { form: 'обычный', gloss: 'ordinary', role: 'adjective' },
  { form: 'простой', gloss: 'simple', role: 'adjective' },
  { form: 'стойкий', gloss: 'steadfast', role: 'adjective' },

  // ── Particles / adverbs (don't inflect — safe anywhere) ──────────────
  { form: 'тут', gloss: 'here', role: 'adverb' },
  { form: 'здесь', gloss: 'here', role: 'adverb' },
  { form: 'там', gloss: 'there', role: 'adverb' },
  { form: 'сейчас', gloss: 'now', role: 'adverb' },
  { form: 'сегодня', gloss: 'today', role: 'adverb' },
  { form: 'завтра', gloss: 'tomorrow', role: 'adverb' },
  { form: 'всегда', gloss: 'always', role: 'adverb' },
  { form: 'никогда', gloss: 'never', role: 'adverb' },
  { form: 'очень', gloss: 'very', role: 'adverb' },
  { form: 'тоже', gloss: 'also', role: 'adverb' },
  { form: 'ещё', gloss: 'still / yet', role: 'adverb' },
  { form: 'уже', gloss: 'already', role: 'adverb' },
  { form: 'хорошо', gloss: 'well / good', role: 'adverb' },
  { form: 'плохо', gloss: 'badly / bad', role: 'adverb' },
  { form: 'быстро', gloss: 'quickly', role: 'adverb' },
  { form: 'медленно', gloss: 'slowly', role: 'adverb' },
  { form: 'да', gloss: 'yes', role: 'particle' },
  { form: 'нет', gloss: 'no / not', role: 'particle' },
  { form: 'не', gloss: 'not', role: 'particle' },
  { form: 'и', gloss: 'and', role: 'particle' },
  { form: 'но', gloss: 'but', role: 'particle' },
  { form: 'или', gloss: 'or', role: 'particle' },
  { form: 'потому', gloss: 'because', role: 'particle' },
  { form: 'теперь', gloss: 'now / then', role: 'adverb' },
  { form: 'потом', gloss: 'later / then', role: 'adverb' },

  // ── Extended high-utility forms (added as context phrases need them) ──
  { form: 'далеко', gloss: 'far', role: 'adverb' },
  { form: 'домой', gloss: 'home (to home)', role: 'adverb' },
  { form: 'туда', gloss: 'there (thither)', role: 'adverb' },
  { form: 'сюда', gloss: 'here (hither)', role: 'adverb' },
  { form: 'вместе', gloss: 'together', role: 'adverb' },
  { form: 'опять', gloss: 'again', role: 'adverb' },
  { form: 'конечно', gloss: 'of course', role: 'particle' },
  { form: 'можно', gloss: 'one may / it is allowed', role: 'particle' },
  { form: 'должен', gloss: 'must / obliged', role: 'verb' },
  { form: 'свой', gloss: "one's own", role: 'pronoun' },
  { form: 'всё', gloss: 'everything / all', role: 'pronoun' },
  { form: 'мой', gloss: 'my', role: 'pronoun' },
  { form: 'твой', gloss: 'your', role: 'pronoun' },
  { form: 'наш', gloss: 'our', role: 'pronoun' },
  { form: 'этот', gloss: 'this', role: 'pronoun' },
  { form: 'такой', gloss: 'such', role: 'pronoun' },
  { form: 'лицо', gloss: 'face', role: 'noun' },
  { form: 'небо', gloss: 'sky', role: 'noun' },
  { form: 'путь', gloss: 'way / path', role: 'noun' },
  { form: 'сила', gloss: 'strength / force', role: 'noun' },
  { form: 'душа', gloss: 'soul', role: 'noun' },
  { form: 'люди', gloss: 'people', role: 'noun' },
  { form: 'ребёнок', gloss: 'child', role: 'noun' },
  { form: 'птица', gloss: 'bird', role: 'noun' },
  { form: 'ночью', gloss: 'at night', role: 'adverb' },
  { form: 'сильно', gloss: 'hard / strongly', role: 'adverb' },
  { form: 'темно', gloss: 'it is dark', role: 'adverb' },
];
