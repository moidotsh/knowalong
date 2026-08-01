// utils/knowalong/fixtures/svetoforDecks.ts
//
// ACTUAL chip-builder deck lessons for "Светофор" by Mnogoznaal. Each
// section of the song becomes a deck lesson with hand-authored steps —
// real phrases the learner builds word-by-word, drawn from the lyrics,
// progressing from simple to complex within each section. Distractors
// come from other phrases in the song.

import type { Lesson, LessonStep } from './decks';

// Word type matching the chip-builder's expected shape.
type W = { form: string; gloss: string; role: 'pronoun' | 'verb' | 'noun' | 'particle' | 'adjective' | 'adverb' };

function step(itemId: string, sf: string, meaning: string, note: string | null, words: W[], ctxRu: string, ctxEn: string): LessonStep {
  return {
    itemId,
    surfaceForm: sf,
    meaning,
    note,
    words: words.map((w) => ({ form: w.form, gloss: w.gloss, role: w.role })),
    contextSentence: { ru: ctxRu, en: ctxEn },
  };
}

// ═══════════════════════════════════════════════════════════════════
// INTRO DECK — "эй, будто полетев фантомом"
// 3 steps. Introduces mood-setting vocabulary.
// ═══════════════════════════════════════════════════════════════════

const INTRO_LESSON: Lesson = {
  id: 'svetofor-intro',
  title: 'Intro — Setting the Mood',
  subtitle: '4 new words · 3 phrases to build',
  icon: 'sparkles',
  stepCount: 3,
  steps: [
    step('sv-i1', 'эй', 'Hey', 'An interjection — the Russian equivalent of "hey" or "yo". Used to grab attention, set a tone, or fill space in speech.',
      [{ form: 'эй', gloss: 'hey', role: 'particle' }],
      'Эй', 'Hey'),
    step('sv-i2', 'будто полетев', 'As if having flown',
      '"Будто" = "as if" — introduces a comparison or metaphor. "Полетев" = "having flown" — a past adverbial participle (деепричастие), a Russian form that doesn\'t exist in English. It means "after flying" or "having flown".',
      [
        { form: 'будто', gloss: 'as if', role: 'particle' },
        { form: 'полетев', gloss: 'having flown', role: 'verb' },
      ],
      'Будто полетев фантомом вглубь', 'As if flying like a phantom deep inside'),
    step('sv-i3', 'будто полетев фантомом', 'As if having flown like a phantom',
      '"Фантомом" = "phantom" — in the instrumental case (фантом + ом). The instrumental case answers "by what means" or "as what". Here: flying AS a phantom.',
      [
        { form: 'будто', gloss: 'as if', role: 'particle' },
        { form: 'полетев', gloss: 'having flown', role: 'verb' },
        { form: 'фантомом', gloss: 'phantom (instr.)', role: 'noun' },
      ],
      'А, будто полетев фантомом, а', 'Ah, as if flying like a phantom, ah'),
  ],
};

// ═══════════════════════════════════════════════════════════════════
// VERSE 1 DECK — core narrative phrases
// 5 steps. Introduces pronouns, negation, conditionals, and the verse's
// emotional vocabulary.
// ═══════════════════════════════════════════════════════════════════

const VERSE1_LESSON: Lesson = {
  id: 'svetofor-verse-1',
  title: 'Verse 1 — The Narrative',
  subtitle: '12 new words · 5 phrases to build',
  icon: 'book',
  stepCount: 5,
  steps: [
    step('sv-v1-1', 'я сам', 'I myself',
      '"Сам" = "myself" — an emphatic pronoun. "Я сам" = "I myself" — used for emphasis: I\'ll do it myself, I myself hate it, etc.',
      [
        { form: 'я', gloss: 'I', role: 'pronoun' },
        { form: 'сам', gloss: 'myself', role: 'pronoun' },
      ],
      'Я сам ненавижу мизантропа внутри', 'I myself hate the misanthrope inside'),
    step('sv-v1-2', 'не перебивал', 'didn\'t interrupt',
      '"Перебивал" = "was interrupting" (imperfective past). "Не перебивал" = "didn\'t interrupt / wasn\'t interrupting". Note: Russian past tense doesn\'t distinguish "didn\'t" from "wasn\'t" — context decides.',
      [
        { form: 'не', gloss: 'not', role: 'particle' },
        { form: 'перебивал', gloss: 'interrupted', role: 'verb' },
      ],
      'не перебивал тут даже грома стук', 'didn\'t interrupt even the thunder\'s knock'),
    step('sv-v1-3', 'если душновато', 'if it\'s stuffy',
      '"Если" = "if" — conditional. "Душновато" = "a bit stuffy" — the -ато suffix means "somewhat". Literally "if it\'s somewhat suffocating."',
      [
        { form: 'если', gloss: 'if', role: 'particle' },
        { form: 'душновато', gloss: 'stuffy', role: 'adjective' },
      ],
      'Если душновато, то я выйду с ней', 'If it\'s stuffy, then I\'ll step out with her'),
    step('sv-v1-4', 'я ненавижу', 'I hate',
      '"Ненавижу" = "I hate" — from "ненавидеть" (to hate). A strong emotional verb. Note the "не-" prefix — it\'s built into the word (ненавидеть), not a separate negation.',
      [
        { form: 'я', gloss: 'I', role: 'pronoun' },
        { form: 'ненавижу', gloss: 'hate', role: 'verb' },
      ],
      'Я сам ненавижу мизантропа внутри', 'I myself hate the misanthrope inside'),
    step('sv-v1-5', 'значит, я убью', 'so, I\'ll kill',
      'Composite: "значит" (so/means) + "я" (I) + "убью" (I\'ll kill — future tense, first person). The future tense in Russian uses a modified verb form, not "will".',
      [
        { form: 'значит', gloss: 'so', role: 'particle' },
        { form: 'я', gloss: 'I', role: 'pronoun' },
        { form: 'убью', gloss: 'I\'ll kill', role: 'verb' },
      ],
      'Значит, я его убью сам', 'So, I\'ll kill him myself'),
  ],
};

// ═══════════════════════════════════════════════════════════════════
// CHORUS DECK — the emotional core
// 6 steps. Builds up the chorus line by line.
// ═══════════════════════════════════════════════════════════════════

const CHORUS_LESSON: Lesson = {
  id: 'svetofor-chorus',
  title: 'Chorus — The Traffic Light',
  subtitle: '10 new words · 6 phrases to build',
  icon: 'waves',
  stepCount: 6,
  steps: [
    step('sv-c1', 'когда мы', 'when we',
      '"Когда" = "when" — temporal conjunction. "Мы" = "we". Together: "when we..." — the opening of the chorus.',
      [
        { form: 'когда', gloss: 'when', role: 'particle' },
        { form: 'мы', gloss: 'we', role: 'pronoun' },
      ],
      'Когда мы под сценарий перемен', 'When we\'re under a script of changes'),
    step('sv-c2', 'обычный светофор', 'ordinary traffic light',
      '"Обычный" = "ordinary, normal" — adjective. "Светофор" = "traffic light" — the song\'s title word. The metaphor: life changes look ordinary, like a traffic light.',
      [
        { form: 'обычный', gloss: 'ordinary', role: 'adjective' },
        { form: 'светофор', gloss: 'traffic light', role: 'noun' },
      ],
      'Что выглядит будто бы обычный светофор', 'That looks like an ordinary traffic light'),
    step('sv-c3', 'танцевали со злом', 'danced with evil',
      '"Танцевали" = "danced" (past tense, we/they). "Со" = "with" (before consonant clusters: с + со). "Злом" = "evil" (instrumental case).',
      [
        { form: 'танцевали', gloss: 'danced', role: 'verb' },
        { form: 'со', gloss: 'with', role: 'particle' },
        { form: 'злом', gloss: 'evil (instr.)', role: 'noun' },
      ],
      'Посередине танцевали со злом', 'In the middle we danced with evil'),
    step('sv-c4', 'да простит нас Бог', 'may God forgive us',
      '"Да" here = "may/let" (optative particle, NOT "yes"). "Простит" = "will forgive" (future, third person). "Нас" = "us" (accusative). "Бог" = "God".',
      [
        { form: 'да', gloss: 'may', role: 'particle' },
        { form: 'простит', gloss: 'forgive', role: 'verb' },
        { form: 'нас', gloss: 'us', role: 'pronoun' },
        { form: 'Бог', gloss: 'God', role: 'noun' },
      ],
      'были дураками, да простит нас Бог', 'we were fools, may God forgive us'),
    step('sv-c5', 'проснись и пой', 'wake up and sing',
      'Both verbs are imperative (command form): "проснись" = "wake up!" (reflexive — проснуться), "пой" = "sing!" (from петь). The phrase is a Russian idiom meaning "cheer up" or "get on with life."',
      [
        { form: 'проснись', gloss: 'wake up!', role: 'verb' },
        { form: 'и', gloss: 'and', role: 'particle' },
        { form: 'пой', gloss: 'sing!', role: 'verb' },
      ],
      'Проснись и пой, проснись, живой', 'Wake up and sing, wake up, alive one'),
    step('sv-c6', 'проснись, живой', 'wake up, alive one',
      '"Живой" = "alive, living" — an adjective used as a noun here: "alive one" or "living one." The chorus\'s call: wake up, you who are alive.',
      [
        { form: 'проснись', gloss: 'wake up!', role: 'verb' },
        { form: 'живой', gloss: 'alive', role: 'adjective' },
      ],
      'Щас заебись, проснись, живой', 'Now it\'s great, wake up, alive one'),
  ],
};

// ═══════════════════════════════════════════════════════════════════
// VERSE 2 DECK — reflection
// 5 steps. Builds reflective phrases about dreams, world, looking.
// ═══════════════════════════════════════════════════════════════════

const VERSE2_LESSON: Lesson = {
  id: 'svetofor-verse-2',
  title: 'Verse 2 — Dreams & Reality',
  subtitle: '8 new words · 5 phrases to build',
  icon: 'brain',
  stepCount: 5,
  steps: [
    step('sv-v2-1', 'я всегда любил', 'I always loved',
      '"Всегда" = "always". "Любил" = "loved" (past tense, masculine). Note: this is the same root as "нравится" (to please/like) but "любить" is stronger — "to love."',
      [
        { form: 'я', gloss: 'I', role: 'pronoun' },
        { form: 'всегда', gloss: 'always', role: 'adverb' },
        { form: 'любил', gloss: 'loved', role: 'verb' },
      ],
      'Я всегда любил мечтать о красивых местах', 'I always loved dreaming about beautiful places'),
    step('sv-v2-2', 'мечтать о местах', 'to dream about places',
      '"Мечтать" = "to dream/daydream" (infinitive). "О" = "about". "Местах" = "places" (prepositional plural).',
      [
        { form: 'мечтать', gloss: 'to dream', role: 'verb' },
        { form: 'о', gloss: 'about', role: 'particle' },
        { form: 'местах', gloss: 'places', role: 'noun' },
      ],
      'Я всегда любил мечтать о красивых местах', 'I always loved dreaming about beautiful places'),
    step('sv-v2-3', 'посмотри', 'look',
      'Imperative (command): "посмотри" = "look!" (perfective, from посмотреть). The perfective aspect means a single, completed action — "take a look."',
      [{ form: 'посмотри', gloss: 'look!', role: 'verb' }],
      'Но посмотри, мир стал другим', 'But look, the world has become different'),
    step('sv-v2-4', 'мир стал другим', 'the world became different',
      '"Мир" = "world". "Стал" = "became" (past, masculine, from стать). "Другим" = "different/another" (instrumental case).',
      [
        { form: 'мир', gloss: 'world', role: 'noun' },
        { form: 'стал', gloss: 'became', role: 'verb' },
        { form: 'другим', gloss: 'different', role: 'adjective' },
      ],
      'Но посмотри, мир стал другим', 'But look, the world has become different'),
    step('sv-v2-5', 'он падает', 'it\'s falling',
      '"Он" = "he/it" (masculine pronoun — "мир" is masculine). "Падает" = "is falling" (present tense, third person, from падать).',
      [
        { form: 'он', gloss: 'it', role: 'pronoun' },
        { form: 'падает', gloss: 'falls', role: 'verb' },
      ],
      'Он падает, но не к нам на руки', 'It\'s falling, but not into our arms'),
  ],
};

// ═══════════════════════════════════════════════════════════════════
// OUTRO DECK — quiet conclusion
// 3 steps. Minimal new vocabulary, mostly reflection.
// ═══════════════════════════════════════════════════════════════════

const OUTRO_LESSON: Lesson = {
  id: 'svetofor-outro',
  title: 'Outro — We\'re Just Guests',
  subtitle: '4 new words · 3 phrases to build',
  icon: 'sparkles',
  stepCount: 3,
  steps: [
    step('sv-o1', 'мы гости', 'we\'re guests',
      '"Гости" = "guests" (nominative plural, from гость). The outro\'s key sentiment: we\'re temporary visitors.',
      [
        { form: 'мы', gloss: 'we', role: 'pronoun' },
        { form: 'гости', gloss: 'guests', role: 'noun' },
      ],
      'Мы просто тут гости', 'We\'re just guests here'),
    step('sv-o2', 'мы просто гости', 'we\'re just guests',
      '"Просто" = "just/simply" — an adverb softening the statement. Together with "гости": "we\'re just guests."',
      [
        { form: 'мы', gloss: 'we', role: 'pronoun' },
        { form: 'просто', gloss: 'just', role: 'adverb' },
        { form: 'гости', gloss: 'guests', role: 'noun' },
      ],
      'Мы просто тут гости', 'We\'re just guests here'),
    step('sv-o3', 'прекрасные кости', 'beautiful bones',
      '"Прекрасные" = "beautiful/magnificent" (plural adjective). "Кости" = "bones" (plural). A poetic image: beneath the chaos (сумбурные мысли), there\'s beauty (прекрасные кости).',
      [
        { form: 'прекрасные', gloss: 'beautiful', role: 'adjective' },
        { form: 'кости', gloss: 'bones', role: 'noun' },
      ],
      'Сумбурные мысли, прекрасные кости', 'Chaotic thoughts, beautiful bones'),
  ],
};

export const SVETOFOR_LESSONS: Lesson[] = [
  INTRO_LESSON,
  VERSE1_LESSON,
  CHORUS_LESSON,
  VERSE2_LESSON,
  OUTRO_LESSON,
];
