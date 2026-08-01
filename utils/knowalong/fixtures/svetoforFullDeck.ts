// utils/knowalong/fixtures/svetoforFullDeck.ts
//
// The full Светофор learning system. Three levels:
//
//   Deck (Светофор)
//     └── Sub-deck (Intro / Verse 1 / Chorus / Verse 2 / Outro)
//          └── Lesson (numbered, each with ~6-12 chip-builder cards)
//
// Each lesson is a set of fill-in-the-blank rounds. Early lessons in
// a sub-deck introduce peripheral/foundational vocabulary that SETS THE
// STAGE for the lyric vocab. Later lessons weave in actual lyric phrases.
// A lesson might have cards like:
//
//   Card 1: я (I) — known, warmup
//   Card 2: если (if) — new, foundation for "если душновато"
//   Card 3: громко (loudly) — new, foundation for "кричал громко"
//   Card 4: не перебивал (didn't interrupt) — lyric phrase
//   Card 5: я ненавижу (I hate) — lyric phrase
//   ...etc, up to ~12 cards per lesson
//
// The learner progresses through lessons 1→N within a sub-deck (locked
// sequentially — see stores/lessonProgressStore), each lesson adding more
// vocabulary until they can read the section's lyrics.

import type { Lesson, LessonStep, SubDeck } from './decks';
import { INTRO_LESSONS } from '../songCurriculum';

type W = { form: string; gloss: string; role: 'pronoun' | 'verb' | 'noun' | 'particle' | 'adjective' | 'adverb' };

// Helper: build a chip-builder step.
function card(id: string, sf: string, meaning: string, note: string | null, words: W[], ctxRu?: string, ctxEn?: string): LessonStep {
  return {
    itemId: id,
    surfaceForm: sf,
    meaning,
    note,
    words: words.map((w) => ({ form: w.form, gloss: w.gloss, role: w.role })),
    contextSentence: ctxRu ? { ru: ctxRu, en: ctxEn ?? '' } : undefined,
  };
}

// Helper: build a lesson with N steps.
function lesson(id: string, title: string, subtitle: string, icon: Lesson['icon'], steps: LessonStep[]): Lesson {
  return { id, title, subtitle, icon, steps, stepCount: steps.length };
}

// ═══════════════════════════════════════════════════════════════════
// INTRO SUB-DECK — built by the i+1 assembler (../songCurriculum.ts).
// One arc lesson per lyric word (эй / будто / полетев / фантомом), each
// reusing the word in known contexts, then a culminating full-line lesson.
// Replaces the old dense "whole lyric line in one lesson" cards.
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// VERSE 1 SUB-DECK — 8 lessons × ~6-9 cards each
// The densest section. Introduces: сам, перебивал, если, ненавижу,
// значит, убью, громко, кричал, ночью, давит, дух, груз, душновато,
// выйду, думать, презирая, выхлоп, понты, etc.
// ═══════════════════════════════════════════════════════════════════

const V1_L1 = lesson('sv-v1-1', 'Verse 1 · Lesson 1', 'Self + sound vocabulary', 'book', [
  // Warmup with known words
  card('v1-1-1', 'я', 'I', null, [{ form: 'я', gloss: 'I', role: 'pronoun' }]),
  card('v1-1-2', 'не я', 'Not me', null, [{ form: 'не', gloss: 'not', role: 'particle' }, { form: 'я', gloss: 'I', role: 'pronoun' }]),
  // New foundation words
  card('v1-1-3', 'сам', 'Myself', 'Emphatic pronoun — "myself". "Я сам" = "I myself".', [{ form: 'сам', gloss: 'myself', role: 'pronoun' }]),
  card('v1-1-4', 'я сам', 'I myself', null, [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'сам', gloss: 'myself', role: 'pronoun' }], 'Я сам ненавижу', 'I myself hate'),
  card('v1-1-5', 'громко', 'Loudly', 'Adverb: "loudly". From "громкий" (loud).', [{ form: 'громко', gloss: 'loudly', role: 'adverb' }], 'Рома громко', 'Roma loudly'),
  card('v1-1-6', 'кричал', 'Shouted', 'Past tense, masculine: "was shouting/shouted". From "кричать" (to shout).', [{ form: 'кричал', gloss: 'shouted', role: 'verb' }], 'кричал тут Рома громко', 'Roma shouted loudly here'),
  card('v1-1-7', 'кричал громко', 'Shouted loudly', null, [{ form: 'кричал', gloss: 'shouted', role: 'verb' }, { form: 'громко', gloss: 'loudly', role: 'adverb' }]),
  card('v1-1-8', 'тут', 'Here', 'Adverb: "here" — in this place. Same root as "тута" (here is).', [{ form: 'тут', gloss: 'here', role: 'adverb' }], 'кричал тут Рома', 'shouted here Roma'),
]);

const V1_L2 = lesson('sv-v1-2', 'Verse 1 · Lesson 2', 'Negation + interruption', 'book', [
  card('v1-2-1', 'не', 'Not', 'Warmup: negation particle.', [{ form: 'не', gloss: 'not', role: 'particle' }]),
  card('v1-2-2', 'даже', 'Even', 'An emphatic particle: "even". "Даже я" = "even I".', [{ form: 'даже', gloss: 'even', role: 'particle' }]),
  card('v1-2-3', 'даже не', 'Even not / didn\'t even', null, [{ form: 'даже', gloss: 'even', role: 'particle' }, { form: 'не', gloss: 'not', role: 'particle' }]),
  card('v1-2-4', 'перебивать', 'To interrupt', 'Infinitive: "to interrupt". Imperfective (ongoing/habitual).', [{ form: 'перебивать', gloss: 'to interrupt', role: 'verb' }]),
  card('v1-2-5', 'перебивал', 'Was interrupting', 'Past tense, masculine, imperfective.', [{ form: 'перебивал', gloss: 'interrupted', role: 'verb' }]),
  card('v1-2-6', 'не перебивал', 'Didn\'t interrupt', null, [{ form: 'не', gloss: 'not', role: 'particle' }, { form: 'перебивал', gloss: 'interrupted', role: 'verb' }], 'не перебивал тут даже грома стук', 'didn\'t interrupt even the thunder\'s knock'),
  card('v1-2-7', 'гром', 'Thunder', 'Noun: "thunder".', [{ form: 'гром', gloss: 'thunder', role: 'noun' }]),
  card('v1-2-8', 'стук', 'Knock / knock sound', 'Noun: "a knock" — a sharp hitting sound.', [{ form: 'стук', gloss: 'knock', role: 'noun' }]),
  card('v1-2-9', 'грома стук', 'The thunder\'s knock', 'Genitive: грома = "of thunder". "The thunder\'s knock".', [{ form: 'грома', gloss: 'thunder (gen.)', role: 'noun' }, { form: 'стук', gloss: 'knock', role: 'noun' }], 'даже грома стук', 'even the thunder\'s knock'),
]);

const V1_L3 = lesson('sv-v1-3', 'Verse 1 · Lesson 3', 'Night, pressure, spirit', 'brain', [
  card('v1-3-1', 'ночь', 'Night', 'Noun: "night".', [{ form: 'ночь', gloss: 'night', role: 'noun' }]),
  card('v1-3-2', 'ночью', 'At night', 'Instrumental case of "ночь" — used for "at night" / "by night".', [{ form: 'ночью', gloss: 'at night', role: 'adverb' }], 'Ночью давит меня', 'At night it presses me'),
  card('v1-3-3', 'давить', 'To press', 'Infinitive: "to press / to weigh on".', [{ form: 'давить', gloss: 'to press', role: 'verb' }]),
  card('v1-3-4', 'давит', 'Presses', 'Present tense, third person: "it presses".', [{ form: 'давит', gloss: 'presses', role: 'verb' }], 'Ночью давит меня', 'At night it presses me'),
  card('v1-3-5', 'меня', 'Me', 'Accusative of "я" (I): "me". Object of the verb.', [{ form: 'меня', gloss: 'me', role: 'pronoun' }]),
  card('v1-3-6', 'давит меня', 'Presses me', null, [{ form: 'давит', gloss: 'presses', role: 'verb' }, { form: 'меня', gloss: 'me', role: 'pronoun' }]),
  card('v1-3-7', 'дух', 'Spirit', 'Noun: "spirit / soul".', [{ form: 'дух', gloss: 'spirit', role: 'noun' }]),
  card('v1-3-8', 'стойкий', 'Steadfast', 'Adjective: "steadfast / resilient / steadfast".', [{ form: 'стойкий', gloss: 'steadfast', role: 'adjective' }]),
  card('v1-3-9', 'стойкий дух', 'Steadfast spirit', null, [{ form: 'стойкий', gloss: 'steadfast', role: 'adjective' }, { form: 'дух', gloss: 'spirit', role: 'noun' }], 'Стойкий дух', 'A steadfast spirit'),
]);

const V1_L4 = lesson('sv-v1-4', 'Verse 1 · Lesson 4', 'Hate + consequence', 'brain', [
  card('v1-4-1', 'внутри', 'Inside', 'Adverb: "inside" — both physical and metaphorical.', [{ form: 'внутри', gloss: 'inside', role: 'adverb' }]),
  card('v1-4-2', 'ненавидеть', 'To hate', 'Infinitive: "to hate". Strong verb. Note: "не-" is built in (ненавидеть), not a separate negation.', [{ form: 'ненавидеть', gloss: 'to hate', role: 'verb' }]),
  card('v1-4-3', 'ненавижу', 'I hate', 'First person present: "I hate".', [{ form: 'ненавижу', gloss: 'I hate', role: 'verb' }]),
  card('v1-4-4', 'я ненавижу', 'I hate', null, [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'ненавижу', gloss: 'hate', role: 'verb' }], 'Я сам ненавижу мизантропа внутри', 'I myself hate the misanthrope inside'),
  card('v1-4-5', 'значит', 'So / it means', 'Particle: "so / therefore / it means".', [{ form: 'значит', gloss: 'so', role: 'particle' }]),
  card('v1-4-6', 'его', 'Him', 'Accusative of "он" (he): "him".', [{ form: 'его', gloss: 'him', role: 'pronoun' }]),
  card('v1-4-7', 'убить', 'To kill', 'Infinitive: "to kill". Perfective (single completed action).', [{ form: 'убить', gloss: 'to kill', role: 'verb' }]),
  card('v1-4-8', 'убью', 'I\'ll kill', 'Future tense, first person: "I will kill". Russian future uses a modified verb, not "will".', [{ form: 'убью', gloss: "I'll kill", role: 'verb' }]),
  card('v1-4-9', 'значит, я убью', 'So, I\'ll kill', null, [{ form: 'значит', gloss: 'so', role: 'particle' }, { form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'убью', gloss: 'kill', role: 'verb' }], 'Значит, я его убью сам', 'So, I\'ll kill him myself'),
]);

const V1_L5 = lesson('sv-v1-5', 'Verse 1 · Lesson 5', 'If it\'s stuffy, I\'ll step out', 'hand-heart', [
  card('v1-5-1', 'душно', 'Stuffy', 'Predicative adjective: "stuffy / suffocating" — a close, airless room (and metaphorically a tense atmosphere).', [{ form: 'душно', gloss: 'stuffy', role: 'adjective' }], 'Тут душно', 'It\'s stuffy here'),
  card('v1-5-2', 'душновато', 'Somewhat stuffy', 'The "-ато" suffix means "somewhat / a bit". "Душновато" = "a bit stuffy".', [{ form: 'душновато', gloss: 'somewhat stuffy', role: 'adjective' }], 'Если душновато', 'If it\'s somewhat stuffy'),
  card('v1-5-3', 'если', 'If', 'Conditional conjunction: "if". Opens a condition clause.', [{ form: 'если', gloss: 'if', role: 'particle' }], 'Если душновато', 'If it\'s stuffy'),
  card('v1-5-4', 'если душновато', 'If it\'s stuffy', 'The condition half of the line.', [{ form: 'если', gloss: 'if', role: 'particle' }, { form: 'душновато', gloss: 'stuffy', role: 'adjective' }], 'Если душновато, то я выйду с ней', 'If it\'s stuffy, then I\'ll step out with her'),
  card('v1-5-5', 'выйти', 'To step out', 'Perfective infinitive: "to go out / to step out" (a single completed exit). Imperfective pair: выходить.', [{ form: 'выйти', gloss: 'to step out', role: 'verb' }]),
  card('v1-5-6', 'выйду', 'I\'ll step out', 'Future tense, first person of "выйти": "I will step out".', [{ form: 'выйду', gloss: "I'll step out", role: 'verb' }], 'то я выйду с ней', 'then I\'ll step out with her'),
  card('v1-5-7', 'с ней', 'With her', '"С" (with) + "ней" (instrumental of "она" / she). "With her".', [{ form: 'с', gloss: 'with', role: 'particle' }, { form: 'ней', gloss: 'her', role: 'pronoun' }]),
  card('v1-5-8', 'то я выйду с ней', 'Then I\'ll step out with her', '"То" = "then" (the result half of an если…то… conditional). Full result clause.', [{ form: 'то', gloss: 'then', role: 'particle' }, { form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'выйду', gloss: "I'll step out", role: 'verb' }, { form: 'с', gloss: 'with', role: 'particle' }, { form: 'ней', gloss: 'her', role: 'pronoun' }], 'Если душновато, то я выйду с ней', 'If it\'s stuffy, then I\'ll step out with her'),
]);

const V1_L6 = lesson('sv-v1-6', 'Verse 1 · Lesson 6', 'Such friends — emphasis', 'help-circle', [
  card('v1-6-1', 'друг', 'Friend', 'Noun: "friend". Masculine.', [{ form: 'друг', gloss: 'friend', role: 'noun' }], 'мой друг', 'my friend'),
  card('v1-6-2', 'друзья', 'Friends', 'Nominative plural of "друг": "friends".', [{ form: 'друзья', gloss: 'friends', role: 'noun' }]),
  card('v1-6-3', 'такой', 'Such / that kind of', 'Demonstrative pronoun: "such / of that kind".', [{ form: 'такой', gloss: 'such', role: 'pronoun' }], 'таких друзей', 'such friends'),
  card('v1-6-4', 'таких друзей', 'Such friends', 'Genitive plural: "таких" (such) + "друзей" (friends, gen. pl.).', [{ form: 'таких', gloss: 'such', role: 'pronoun' }, { form: 'друзей', gloss: 'friends', role: 'noun' }]),
  card('v1-6-5', 'то', 'Then / so', 'Particle/conjunction: "then" (in если…то) or a filler "well/so". Here it links the conditional result.', [{ form: 'то', gloss: 'then', role: 'particle' }], 'то я выйду', 'then I\'ll step out'),
  card('v1-6-6', 'нахуй', 'To hell with (vulgar)', 'Vulgar intensifier. Literally "onto [expletive]"; used like "the hell / f***" to dismiss something. Recognition item — the song uses it for emphasis, not literally.', [{ form: 'нахуй', gloss: 'to hell with', role: 'particle' }]),
  card('v1-6-7', 'нахуй таких друзей', 'To hell with such friends', 'The dismissive line: "нахуй" + "таких друзей" (genitive plural).', [{ form: 'нахуй', gloss: 'to hell with', role: 'particle' }, { form: 'таких', gloss: 'such', role: 'pronoun' }, { form: 'друзей', gloss: 'friends', role: 'noun' }], 'Нахуй таких друзей', 'To hell with such friends'),
]);

const V1_L7 = lesson('sv-v1-7', 'Verse 1 · Lesson 7', 'I thought + carefree days', 'brain', [
  card('v1-7-1', 'думать', 'To think', 'Imperfective infinitive: "to think".', [{ form: 'думать', gloss: 'to think', role: 'verb' }]),
  card('v1-7-2', 'думал', 'Thought / I thought', 'Past tense, masculine. Russian often drops the subject: "думал" alone can mean "I thought".', [{ form: 'думал', gloss: 'I thought', role: 'verb' }], 'Я думал', 'I thought'),
  card('v1-7-3', 'я думал', 'I thought', 'With explicit subject.', [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'думал', gloss: 'thought', role: 'verb' }], 'Я думал, его ёбнут беззаботные дни', 'I thought his carefree days would screw him'),
  card('v1-7-4', 'забота', 'Care / worry', 'Noun: "care / worry / concern".', [{ form: 'забота', gloss: 'care', role: 'noun' }]),
  card('v1-7-5', 'беззаботный', 'Carefree', 'Adjective: "carefree" — literally "без" (without) + "забота" (care) + suffix. Without worries.', [{ form: 'беззаботный', gloss: 'carefree', role: 'adjective' }]),
  card('v1-7-6', 'беззаботные дни', 'Carefree days', 'Plural: "беззаботные" (carefree) + "дни" (days, nom. pl.).', [{ form: 'беззаботные', gloss: 'carefree', role: 'adjective' }, { form: 'дни', gloss: 'days', role: 'noun' }]),
  card('v1-7-7', 'его', 'Him', 'Review: accusative of "он" (he) — "him".', [{ form: 'его', gloss: 'him', role: 'pronoun' }]),
  card('v1-7-8', 'его ёбнут', 'Will screw him up', 'Vulgar slang: "ёбнут" (from ёбнуть) = "will knock/screw up", future third-person plural used impersonally. Recognition item — coarse, used for shock in the lyric.', [{ form: 'его', gloss: 'him', role: 'pronoun' }, { form: 'ёбнут', gloss: 'will screw up', role: 'verb' }], 'Я думал, его ёбнут беззаботные дни', 'I thought his carefree days would screw him'),
]);

const V1_L8 = lesson('sv-v1-8', 'Verse 1 · Lesson 8', 'Despising the stale scene', 'brain', [
  card('v1-8-1', 'презирать', 'To despise', 'Imperfective infinitive: "to despise / to look down on". Note: the lyric spells it "призирать", but that word actually means "to shelter/provide for" — the intended word is "презирать" (to despise). A common misspelling worth knowing.', [{ form: 'презирать', gloss: 'to despise', role: 'verb' }]),
  card('v1-8-2', 'презирая', 'Despising', 'Adverbial participle (деепричастие), like "полетев": "despising / while despising".', [{ form: 'презирая', gloss: 'despising', role: 'verb' }]),
  card('v1-8-3', 'унылый', 'Dreary', 'Adjective: "dreary / dull / depressing".', [{ form: 'унылый', gloss: 'dreary', role: 'adjective' }]),
  card('v1-8-4', 'этот', 'This', 'Demonstrative pronoun: "this" (masculine). "Этот СТЭМ" = "this STEAM".', [{ form: 'этот', gloss: 'this', role: 'pronoun' }]),
  card('v1-8-5', 'весь этот унылый СТЭМ', 'All this dreary STEAM', 'The object of "презирая". "СТЭМ" is a borrowed acronym used as a noun here.', [{ form: 'весь', gloss: 'all', role: 'pronoun' }, { form: 'этот', gloss: 'this', role: 'pronoun' }, { form: 'унылый', gloss: 'dreary', role: 'adjective' }, { form: 'СТЭМ', gloss: 'STEAM', role: 'noun' }], 'Призирая весь этот унылый СТЭМ', 'Despising all this dreary STEAM'),
  card('v1-8-6', 'выхлоп', 'Payoff', 'Noun: literally "exhaust (of an engine)"; slang for "output / payoff / result".', [{ form: 'выхлоп', gloss: 'payoff', role: 'noun' }]),
  card('v1-8-7', 'понты', 'Front / showing off', 'Slang noun (plural): "front / empty showing off / bluster".', [{ form: 'понты', gloss: 'front', role: 'noun' }]),
  card('v1-8-8', 'совсем', 'At all / entirely', 'Adverb: "at all / entirely".', [{ form: 'совсем', gloss: 'at all', role: 'adverb' }], 'Понты совсем', 'All front'),
]);

// ═══════════════════════════════════════════════════════════════════
// CHORUS SUB-DECK — 6 lessons × ~6-9 cards each
// The emotional core: светофор, танцевали, проснись, Бог, пережиток,
// заебись, живой, принципов
// ═══════════════════════════════════════════════════════════════════

const CH_L1 = lesson('sv-ch-1', 'Chorus · Lesson 1', 'When we + the traffic light', 'waves', [
  card('ch1-1', 'когда', 'When', 'Temporal conjunction: "when". Opens a time clause.', [{ form: 'когда', gloss: 'when', role: 'particle' }]),
  card('ch1-2', 'мы', 'We', 'Pronoun: "we". Nominative plural of "я".', [{ form: 'мы', gloss: 'we', role: 'pronoun' }]),
  card('ch1-3', 'когда мы', 'When we', null, [{ form: 'когда', gloss: 'when', role: 'particle' }, { form: 'мы', gloss: 'we', role: 'pronoun' }], 'Когда мы под сценарий перемен', 'When we\'re under a script of changes'),
  card('ch1-4', 'сценарий', 'Script', 'Noun: "script / scenario".', [{ form: 'сценарий', gloss: 'script', role: 'noun' }]),
  card('ch1-5', 'перемены', 'Changes', 'Noun plural: "changes".', [{ form: 'перемены', gloss: 'changes', role: 'noun' }]),
  card('ch1-6', 'перемен', 'Of changes', 'Genitive plural: "of changes".', [{ form: 'перемен', gloss: 'of changes', role: 'noun' }]),
  card('ch1-7', 'сценарий перемен', 'Script of changes', null, [{ form: 'сценарий', gloss: 'script', role: 'noun' }, { form: 'перемен', gloss: 'of changes', role: 'noun' }], 'под сценарий перемен', 'under a script of changes'),
  card('ch1-8', 'обычный', 'Ordinary', 'Adjective: "ordinary / normal / usual".', [{ form: 'обычный', gloss: 'ordinary', role: 'adjective' }]),
  card('ch1-9', 'светофор', 'Traffic light', 'Noun: "traffic light" — the song\'s title word. A compound: свет (light) + фор (from "for" — borrowed).', [{ form: 'светофор', gloss: 'traffic light', role: 'noun' }]),
  card('ch1-10', 'обычный светофор', 'Ordinary traffic light', null, [{ form: 'обычный', gloss: 'ordinary', role: 'adjective' }, { form: 'светофор', gloss: 'traffic light', role: 'noun' }], 'будто бы обычный светофор', 'like an ordinary traffic light'),
]);

const CH_L2 = lesson('sv-ch-2', 'Chorus · Lesson 2', 'Dancing with evil', 'waves', [
  card('ch2-1', 'танцевать', 'To dance', 'Infinitive: "to dance".', [{ form: 'танцевать', gloss: 'to dance', role: 'verb' }]),
  card('ch2-2', 'танцевали', 'Danced', 'Past tense, we/they: "we danced".', [{ form: 'танцевали', gloss: 'danced', role: 'verb' }]),
  card('ch2-3', 'с', 'With', 'Preposition: "with". Becomes "со" before consonant clusters.', [{ form: 'с', gloss: 'with', role: 'particle' }]),
  card('ch2-4', 'со', 'With (variant)', '"Со" = "с" used before consonant clusters (со злом, со мной).', [{ form: 'со', gloss: 'with', role: 'particle' }]),
  card('ch2-5', 'зло', 'Evil', 'Noun nominative: "evil".', [{ form: 'зло', gloss: 'evil', role: 'noun' }]),
  card('ch2-6', 'злом', 'Evil (instrumental)', 'Instrumental case: "with evil" / "by evil".', [{ form: 'злом', gloss: 'evil (instr.)', role: 'noun' }]),
  card('ch2-7', 'танцевали со злом', 'Danced with evil', null, [{ form: 'танцевали', gloss: 'danced', role: 'verb' }, { form: 'со', gloss: 'with', role: 'particle' }, { form: 'злом', gloss: 'evil', role: 'noun' }], 'танцевали со злом', 'we danced with evil'),
  card('ch2-8', 'дурак', 'Fool', 'Noun: "fool".', [{ form: 'дурак', gloss: 'fool', role: 'noun' }]),
  card('ch2-9', 'дураками', 'Fools (instrumental)', 'Instrumental plural: "as fools" / "being fools".', [{ form: 'дураками', gloss: 'fools', role: 'noun' }]),
  card('ch2-10', 'были дураками', 'Were fools', null, [{ form: 'были', gloss: 'were', role: 'verb' }, { form: 'дураками', gloss: 'fools', role: 'noun' }], 'были дураками', 'we were fools'),
]);

const CH_L3 = lesson('sv-ch-3', 'Chorus · Lesson 3', 'Wake up, alive one', 'waves', [
  card('ch3-1', 'Бог', 'God', 'Noun: "God". Capitalized like English.', [{ form: 'Бог', gloss: 'God', role: 'noun' }]),
  card('ch3-2', 'нас', 'Us', 'Accusative of "мы": "us".', [{ form: 'нас', gloss: 'us', role: 'pronoun' }]),
  card('ch3-3', 'простить', 'To forgive', 'Infinitive: "to forgive". Perfective.', [{ form: 'простить', gloss: 'to forgive', role: 'verb' }]),
  card('ch3-4', 'простит', 'Will forgive', 'Future, third person: "will forgive".', [{ form: 'простит', gloss: 'forgive', role: 'verb' }]),
  card('ch3-5', 'да простит нас Бог', 'May God forgive us', '"Да" here = "may/let" (optative). NOT "yes".', [{ form: 'да', gloss: 'may', role: 'particle' }, { form: 'простит', gloss: 'forgive', role: 'verb' }, { form: 'нас', gloss: 'us', role: 'pronoun' }, { form: 'Бог', gloss: 'God', role: 'noun' }], 'да простит нас Бог', 'may God forgive us'),
  card('ch3-6', 'проснуться', 'To wake up', 'Infinitive: "to wake up". Reflexive (-ся).', [{ form: 'проснуться', gloss: 'to wake up', role: 'verb' }]),
  card('ch3-7', 'проснись', 'Wake up!', 'Imperative: "wake up!" — a command. Reflexive imperative form.', [{ form: 'проснись', gloss: 'wake up!', role: 'verb' }]),
  card('ch3-8', 'петь', 'To sing', 'Infinitive: "to sing".', [{ form: 'петь', gloss: 'to sing', role: 'verb' }]),
  card('ch3-9', 'пой', 'Sing!', 'Imperative: "sing!"', [{ form: 'пой', gloss: 'sing!', role: 'verb' }]),
  card('ch3-10', 'проснись и пой', 'Wake up and sing', 'A Russian idiom meaning "cheer up" or "get on with life".', [{ form: 'проснись', gloss: 'wake up!', role: 'verb' }, { form: 'и', gloss: 'and', role: 'particle' }, { form: 'пой', gloss: 'sing!', role: 'verb' }], 'Проснись и пой', 'Wake up and sing'),
  card('ch3-11', 'живой', 'Alive', 'Adjective: "alive / living".', [{ form: 'живой', gloss: 'alive', role: 'adjective' }]),
  card('ch3-12', 'проснись, живой', 'Wake up, alive one', null, [{ form: 'проснись', gloss: 'wake up!', role: 'verb' }, { form: 'живой', gloss: 'alive', role: 'adjective' }], 'проснись, живой', 'wake up, alive one'),
]);

const CH_L4 = lesson('sv-ch-4', 'Chorus · Lesson 4', 'Relic of the past', 'book', [
  card('ch4-1', 'прошлый', 'Past / last', 'Adjective: "past / last / former".', [{ form: 'прошлый', gloss: 'past', role: 'adjective' }], 'в прошлом году', 'last year'),
  card('ch4-2', 'прошлое', 'The past', 'Neuter noun formed from the adjective: "the past".', [{ form: 'прошлое', gloss: 'the past', role: 'noun' }]),
  card('ch4-3', 'пережиток', 'Relic', 'Noun: "a relic / a survival" — something obsolete that lingers on.', [{ form: 'пережиток', gloss: 'relic', role: 'noun' }]),
  card('ch4-4', 'пережиток прошлого', 'Relic of the past', 'Fixed phrase: "a relic of the past" — an outdated leftover.', [{ form: 'пережиток', gloss: 'relic', role: 'noun' }, { form: 'прошлого', gloss: 'of the past', role: 'noun' }], 'Это пережиток прошлого', 'This is a relic of the past'),
  card('ch4-5', 'это', 'This', 'Pronoun: "this".', [{ form: 'это', gloss: 'this', role: 'pronoun' }]),
  card('ch4-6', 'это пережиток прошлого', 'This is a relic of the past', 'The full chorus line: "this [is] a relic of the past". Russian drops the verb "is".', [{ form: 'это', gloss: 'this', role: 'pronoun' }, { form: 'пережиток', gloss: 'relic', role: 'noun' }, { form: 'прошлого', gloss: 'of the past', role: 'noun' }], 'Это пережиток прошлого', 'This is a relic of the past'),
  card('ch4-7', 'говорить', 'To say', 'Imperfective infinitive: "to say / to speak".', [{ form: 'говорить', gloss: 'to say', role: 'verb' }]),
  card('ch4-8', 'сейчас', 'Now', 'Adverb: "now". Colloquially clipped to "щас" (see Lesson 5).', [{ form: 'сейчас', gloss: 'now', role: 'adverb' }]),
  card('ch4-9', 'говорить сейчас', 'To say now', 'The lead-in to the quoted command "Проснись и пой".', [{ form: 'говорить', gloss: 'to say', role: 'verb' }, { form: 'сейчас', gloss: 'now', role: 'adverb' }], 'говорить сейчас: «Проснись и пой»', 'to say now: "wake up and sing"'),
]);

const CH_L5 = lesson('sv-ch-5', 'Chorus · Lesson 5', 'Now it\'s great — synthesis', 'waves', [
  card('ch5-1', 'щас', 'Now (colloquial)', 'Clipped colloquial form of "сейчас" (now). Very common in speech and lyrics.', [{ form: 'щас', gloss: 'now', role: 'adverb' }], 'Щас заебись', 'Now it\'s great'),
  card('ch5-2', 'заебись', 'It\'s great (vulgar slang)', 'Vulgar slang predicative: "great / awesome / kick-ass". Coarse but extremely common in informal speech. Recognition item.', [{ form: 'заебись', gloss: "it's great", role: 'adjective' }]),
  card('ch5-3', 'щас заебись', 'Now it\'s great', 'The opening of the chorus\'s punchline line.', [{ form: 'щас', gloss: 'now', role: 'adverb' }, { form: 'заебись', gloss: 'great', role: 'adjective' }], 'Щас заебись, проснись, живой', 'Now it\'s great, wake up, alive one'),
  card('ch5-4', 'середина', 'Middle', 'Noun: "middle / center".', [{ form: 'середина', gloss: 'middle', role: 'noun' }]),
  card('ch5-5', 'посередине', 'In the middle', 'Adverb: "in the middle / halfway".', [{ form: 'посередине', gloss: 'in the middle', role: 'adverb' }], 'Посередине танцевали со злом', 'In the middle we danced with evil'),
  card('ch5-6', 'щас заебись, проснись, живой', 'Now it\'s great, wake up, alive one', 'Full chorus punchline: review of "проснись" + "живой" from Lesson 3.', [{ form: 'щас', gloss: 'now', role: 'adverb' }, { form: 'заебись', gloss: 'great', role: 'adjective' }, { form: 'проснись', gloss: 'wake up!', role: 'verb' }, { form: 'живой', gloss: 'alive', role: 'adjective' }], 'Щас заебись, проснись, живой', 'Now it\'s great, wake up, alive one'),
]);

const CH_L6 = lesson('sv-ch-6', 'Chorus · Lesson 6', 'Against principles — full assembly', 'brain', [
  card('ch6-1', 'мечта', 'A dream', 'Noun: "a dream / an aspiration" (the goal kind, not the sleep kind).', [{ form: 'мечта', gloss: 'a dream', role: 'noun' }]),
  card('ch6-2', 'за мечтой', 'After a dream', '"За" (after/for) + "мечтой" (instrumental of мечта): "after/for a dream".', [{ form: 'за', gloss: 'after', role: 'particle' }, { form: 'мечтой', gloss: 'a dream', role: 'noun' }]),
  card('ch6-3', 'понимать', 'To understand', 'Imperfective infinitive: "to understand / to realize".', [{ form: 'понимать', gloss: 'to understand', role: 'verb' }]),
  card('ch6-4', 'понимали', '(We) understood', 'Past tense: "understood" — subject "we" is implied.', [{ form: 'понимали', gloss: 'understood', role: 'verb' }]),
  card('ch6-5', 'принцип', 'Principle', 'Noun: "a principle / a rule one lives by".', [{ form: 'принцип', gloss: 'principle', role: 'noun' }]),
  card('ch6-6', 'против', 'Against', 'Preposition: "against" (takes the genitive).', [{ form: 'против', gloss: 'against', role: 'particle' }]),
  card('ch6-7', 'против принципов', 'Against (one\'s) principles', '"Против" + "принципов" (genitive plural): "against one\'s principles".', [{ form: 'против', gloss: 'against', role: 'particle' }, { form: 'принципов', gloss: 'principles', role: 'noun' }]),
  card('ch6-8', 'в сторону', 'Aside / to the side', '"В" (to/into) + "сторону" (accusative of сторона, side): "aside / off to the side".', [{ form: 'в', gloss: 'to', role: 'particle' }, { form: 'сторону', gloss: 'side', role: 'noun' }]),
  card('ch6-9', 'если за мечтой, то в сторону', 'If after a dream, then aside', 'The chorus\'s most complex line: chasing a dream pulls you aside, toward what goes against your principles.', [{ form: 'если', gloss: 'if', role: 'particle' }, { form: 'за', gloss: 'after', role: 'particle' }, { form: 'мечтой', gloss: 'a dream', role: 'noun' }, { form: 'то', gloss: 'then', role: 'particle' }, { form: 'в', gloss: 'to', role: 'particle' }, { form: 'сторону', gloss: 'side', role: 'noun' }], 'Понимали если за мечтой, то в сторону, где было против принципов', 'We understood that if you chase a dream, it\'s aside, where it went against principles'),
]);

// ═══════════════════════════════════════════════════════════════════
// VERSE 2 SUB-DECK — 6 lessons × ~8 cards each
// Reflection: мечтать, красивых, местах, никогда, мир, падает,
// нарратив, проталина
// ═══════════════════════════════════════════════════════════════════

const V2_L1 = lesson('sv-v2-1', 'Verse 2 · Lesson 1', 'Dreaming + beautiful places', 'brain', [
  card('v2-1-1', 'всегда', 'Always', 'Adverb: "always".', [{ form: 'всегда', gloss: 'always', role: 'adverb' }]),
  card('v2-1-2', 'я всегда', 'I always', null, [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'всегда', gloss: 'always', role: 'adverb' }]),
  card('v2-1-3', 'любить', 'To love', 'Infinitive: "to love". Stronger than "нравиться" (to please/like).', [{ form: 'любить', gloss: 'to love', role: 'verb' }]),
  card('v2-1-4', 'любил', 'Loved', 'Past tense, masculine: "loved".', [{ form: 'любил', gloss: 'loved', role: 'verb' }]),
  card('v2-1-5', 'я всегда любил', 'I always loved', null, [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'всегда', gloss: 'always', role: 'adverb' }, { form: 'любил', gloss: 'loved', role: 'verb' }], 'Я всегда любил мечтать', 'I always loved dreaming'),
  card('v2-1-6', 'мечтать', 'To dream', 'Infinitive: "to dream / to daydream".', [{ form: 'мечтать', gloss: 'to dream', role: 'verb' }]),
  card('v2-1-7', 'красивый', 'Beautiful', 'Adjective: "beautiful / pretty".', [{ form: 'красивый', gloss: 'beautiful', role: 'adjective' }]),
  card('v2-1-8', 'место', 'Place', 'Noun: "a place".', [{ form: 'место', gloss: 'place', role: 'noun' }]),
  card('v2-1-9', 'красивых местах', 'Beautiful places', 'Plural prepositional: "in beautiful places".', [{ form: 'красивых', gloss: 'beautiful', role: 'adjective' }, { form: 'местах', gloss: 'places', role: 'noun' }], 'о красивых местах', 'about beautiful places'),
]);

const V2_L2 = lesson('sv-v2-2', 'Verse 2 · Lesson 2', 'Never found + look', 'brain', [
  card('v2-2-1', 'никогда', 'Never', 'Adverb: "never". From "никогда" = ни + когда (not + when).', [{ form: 'никогда', gloss: 'never', role: 'adverb' }]),
  card('v2-2-2', 'никогда не', 'Never not / never', null, [{ form: 'никогда', gloss: 'never', role: 'adverb' }, { form: 'не', gloss: 'not', role: 'particle' }]),
  card('v2-2-3', 'найти', 'To find', 'Infinitive: "to find". Perfective.', [{ form: 'найти', gloss: 'to find', role: 'verb' }]),
  card('v2-2-4', 'найдёшь', 'You\'ll find', 'Future, second person: "you will find".', [{ form: 'найдёшь', gloss: "you'll find", role: 'verb' }]),
  card('v2-5-5', 'никогда не найдёшь', 'Will never find', null, [{ form: 'никогда', gloss: 'never', role: 'adverb' }, { form: 'не', gloss: 'not', role: 'particle' }, { form: 'найдёшь', gloss: 'find', role: 'verb' }], 'нас никогда не найдёшь', 'you\'ll never find us'),
  card('v2-2-6', 'посмотреть', 'To look', 'Infinitive: "to look / to take a look". Perfective.', [{ form: 'посмотреть', gloss: 'to look', role: 'verb' }]),
  card('v2-2-7', 'посмотри', 'Look!', 'Imperative: "look!" — a command.', [{ form: 'посмотри', gloss: 'look!', role: 'verb' }], 'Но посмотри, мир стал другим', 'But look, the world became different'),
  card('v2-2-8', 'там', 'There', 'Adverb: "there" — at that place.', [{ form: 'там', gloss: 'there', role: 'adverb' }], 'Там, где нас никогда не найдёшь', 'There, where no one will find us'),
]);

const V2_L3 = lesson('sv-v2-3', 'Verse 2 · Lesson 3', 'The world is falling', 'brain', [
  card('v2-3-1', 'мир', 'World', 'Noun: "world / peace".', [{ form: 'мир', gloss: 'world', role: 'noun' }]),
  card('v2-3-2', 'стать', 'To become', 'Infinitive: "to become".', [{ form: 'стать', gloss: 'to become', role: 'verb' }]),
  card('v2-3-3', 'стал', 'Became', 'Past tense, masculine: "became".', [{ form: 'стал', gloss: 'became', role: 'verb' }]),
  card('v2-3-4', 'другой', 'Different / another', 'Adjective feminine: "different".', [{ form: 'другой', gloss: 'different', role: 'adjective' }]),
  card('v2-3-5', 'другим', 'Different (instrumental)', 'Instrumental case: "became different" requires instrumental.', [{ form: 'другим', gloss: 'different', role: 'adjective' }]),
  card('v2-3-6', 'мир стал другим', 'The world became different', null, [{ form: 'мир', gloss: 'world', role: 'noun' }, { form: 'стал', gloss: 'became', role: 'verb' }, { form: 'другим', gloss: 'different', role: 'adjective' }], 'мир стал другим', 'the world became different'),
  card('v2-3-7', 'падать', 'To fall', 'Infinitive: "to fall". Imperfective.', [{ form: 'падать', gloss: 'to fall', role: 'verb' }]),
  card('v2-3-8', 'падает', 'Is falling', 'Present tense, third person: "it falls / it is falling".', [{ form: 'падает', gloss: 'falls', role: 'verb' }]),
  card('v2-3-9', 'он падает', 'It\'s falling', null, [{ form: 'он', gloss: 'it', role: 'pronoun' }, { form: 'падает', gloss: 'falls', role: 'verb' }], 'Он падает, но не к нам на руки', 'It\'s falling, but not into our arms'),
]);

const V2_L4 = lesson('sv-v2-4', 'Verse 2 · Lesson 4', 'Waiting in the mirage', 'brain', [
  card('v2-4-1', 'старый', 'Old', 'Adjective: "old" (age/wear).', [{ form: 'старый', gloss: 'old', role: 'adjective' }]),
  card('v2-4-2', 'старого', 'The old one', 'Genitive/accusative masculine of "старый": "the old one" — the adjective stands in for a noun.', [{ form: 'старого', gloss: 'the old one', role: 'adjective' }], 'старого ждёшь', 'you wait for the old one'),
  card('v2-4-3', 'ждать', 'To wait', 'Imperfective infinitive: "to wait". Takes the accusative/genitive of who/what you wait for.', [{ form: 'ждать', gloss: 'to wait', role: 'verb' }]),
  card('v2-4-4', 'ждёшь', 'You wait', 'Present tense, second person: "you wait / you are waiting".', [{ form: 'ждёшь', gloss: 'you wait', role: 'verb' }], 'Ты тут старого ждёшь', 'You wait here for the old one'),
  card('v2-4-5', 'мираж', 'Mirage', 'Noun: "a mirage" — an optical illusion, or figuratively a false hope.', [{ form: 'мираж', gloss: 'mirage', role: 'noun' }]),
  card('v2-4-6', 'усталый', 'Weary', 'Adjective: "tired / weary". "В этом мираже усталом" = "in this weary mirage".', [{ form: 'усталый', gloss: 'weary', role: 'adjective' }]),
  card('v2-4-7', 'ночь', 'Night', 'Review from Verse 1: noun "night".', [{ form: 'ночь', gloss: 'night', role: 'noun' }]),
  card('v2-4-8', 'скоротать ночь', 'To while away the night', '"Скоротать" = "to while away / to pass (time)". "Скоротать ночь" = "to while away the night".', [{ form: 'скоротать', gloss: 'to while away', role: 'verb' }, { form: 'ночь', gloss: 'night', role: 'noun' }], 'в этом мираже усталом скоротать ночь', 'to while away the night in this weary mirage'),
]);

const V2_L5 = lesson('sv-v2-5', 'Verse 2 · Lesson 5', 'Never good at narrative', 'brain', [
  card('v2-5-1', 'уметь', 'To know how / to be able', 'Imperfective infinitive: "to know how / to have the skill". Distinct from "мочь" (to be able/can) — "уметь" means having the learned skill.', [{ form: 'уметь', gloss: 'to know how', role: 'verb' }]),
  card('v2-5-2', 'умел', 'Knew how / was able', 'Past tense, masculine: "knew how / was able".', [{ form: 'умел', gloss: 'knew how', role: 'verb' }]),
  card('v2-5-3', 'я не умел', 'I didn\'t know how', 'Review negation: "я" + "не" + "умел".', [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'не', gloss: 'not', role: 'particle' }, { form: 'умел', gloss: 'knew how', role: 'verb' }]),
  card('v2-5-4', 'нарратив', 'Narrative', 'Noun (borrowed): "a narrative / storyline".', [{ form: 'нарратив', gloss: 'narrative', role: 'noun' }]),
  card('v2-5-5', 'в нарратив', 'Into narrative', 'Slangy "в + accusative" = "good at / into" something. "Я не умел в нарратив" = "I was never good at narrative".', [{ form: 'в', gloss: 'into', role: 'particle' }, { form: 'нарратив', gloss: 'narrative', role: 'noun' }]),
  card('v2-5-6', 'я никогда не умел в нарратив', 'I was never good at narrative', 'Full line: "никогда" (never) + the negated skill.', [{ form: 'я', gloss: 'I', role: 'pronoun' }, { form: 'никогда', gloss: 'never', role: 'adverb' }, { form: 'не', gloss: 'not', role: 'particle' }, { form: 'умел', gloss: 'knew how', role: 'verb' }, { form: 'в', gloss: 'into', role: 'particle' }, { form: 'нарратив', gloss: 'narrative', role: 'noun' }], 'Я никогда не умел в нарратив', 'I was never good at narrative'),
  card('v2-5-7', 'надо', 'Necessary / one must', 'Predicative: "it\'s necessary / one must". No subject — impersonal.', [{ form: 'надо', gloss: 'necessary', role: 'particle' }]),
  card('v2-5-8', 'надо ли?', 'Is it necessary?', '"Ли" = a yes/no question particle. "Надо ли?" = "is it necessary? / must one?"', [{ form: 'надо', gloss: 'necessary', role: 'particle' }, { form: 'ли', gloss: '?', role: 'particle' }], 'А надо ли? Нет', 'But is it necessary? No'),
]);

const V2_L6 = lesson('sv-v2-6', 'Verse 2 · Lesson 6', 'Valentin + a patch of hope', 'heart', [
  card('v2-6-1', 'домой', 'Home / homeward', 'Adverb: "home / homeward" (motion toward home).', [{ form: 'домой', gloss: 'home', role: 'adverb' }]),
  card('v2-6-2', 'вернуться', 'To return', 'Perfective reflexive infinitive: "to return" (-ся = reflexive; you return yourself).', [{ form: 'вернуться', gloss: 'to return', role: 'verb' }]),
  card('v2-6-3', 'вернулся', 'Returned', 'Past tense, masculine: "returned".', [{ form: 'вернулся', gloss: 'returned', role: 'verb' }]),
  card('v2-6-4', 'Валентин домой вернулся', 'Valentin returned home', 'The line\'s opening. (The crude suffix "без члена и стоп" is left out of the drill.)', [{ form: 'домой', gloss: 'home', role: 'adverb' }, { form: 'вернулся', gloss: 'returned', role: 'verb' }], 'Валентин домой вернулся', 'Valentin returned home'),
  card('v2-6-5', 'верить', 'To believe', 'Imperfective infinitive: "to believe".', [{ form: 'верить', gloss: 'to believe', role: 'verb' }]),
  card('v2-6-6', 'хочу верить', 'I want to believe', 'Review "хотеть" → "хочу" (I want) + infinitive.', [{ form: 'хочу', gloss: 'I want', role: 'verb' }, { form: 'верить', gloss: 'to believe', role: 'verb' }], 'Хочу верить', 'I want to believe'),
  card('v2-6-7', 'проталина', 'A thawed patch', 'Noun: a spot where snow has melted, exposing the earth — a small, specific spring image. Here a metaphor for a patch of hope.', [{ form: 'проталина', gloss: 'a thawed patch', role: 'noun' }]),
  card('v2-6-8', 'его ждёт проталина', 'A thawed patch awaits him', '"Ждёт" (awaits) + "его" (him). Full line: "Хочу верить, что его ждёт проталина" — I want to believe a thawed patch awaits him.', [{ form: 'его', gloss: 'him', role: 'pronoun' }, { form: 'ждёт', gloss: 'awaits', role: 'verb' }, { form: 'проталина', gloss: 'a thawed patch', role: 'noun' }], 'Хочу верить, что его ждёт проталина', 'I want to believe a thawed patch awaits him'),
]);

// ═══════════════════════════════════════════════════════════════════
// OUTRO SUB-DECK — 3 lessons × ~6-8 cards each
// Quiet conclusion: гости, просто, мысли, кости, забывайся, падла
// ═══════════════════════════════════════════════════════════════════

const OUTRO_L1 = lesson('sv-out-1', 'Outro · Lesson 1', 'We\'re just guests', 'sparkles', [
  card('o1-1', 'просто', 'Just / simply', 'Adverb: "just / simply". Softens a statement.', [{ form: 'просто', gloss: 'just', role: 'adverb' }]),
  card('o1-2', 'гость', 'Guest', 'Noun: "guest / visitor". Singular.', [{ form: 'гость', gloss: 'guest', role: 'noun' }]),
  card('o1-3', 'гости', 'Guests', 'Nominative plural: "guests".', [{ form: 'гости', gloss: 'guests', role: 'noun' }]),
  card('o1-4', 'мы просто гости', 'We\'re just guests', null, [{ form: 'мы', gloss: 'we', role: 'pronoun' }, { form: 'просто', gloss: 'just', role: 'adverb' }, { form: 'гости', gloss: 'guests', role: 'noun' }], 'Мы просто тут гости', 'We\'re just guests here'),
  card('o1-5', 'тут', 'Here', 'Adverb: "here" (review from Verse 1).', [{ form: 'тут', gloss: 'here', role: 'adverb' }]),
  card('o1-6', 'мы просто тут гости', 'We\'re just guests here', 'The full outro line.', [{ form: 'мы', gloss: 'we', role: 'pronoun' }, { form: 'просто', gloss: 'just', role: 'adverb' }, { form: 'тут', gloss: 'here', role: 'adverb' }, { form: 'гости', gloss: 'guests', role: 'noun' }], 'Мы просто тут гости', 'We\'re just guests here'),
]);

const OUTRO_L2 = lesson('sv-out-2', 'Outro · Lesson 2', 'Beautiful bones', 'sparkles', [
  card('o2-1', 'мысль', 'Thought', 'Noun: "a thought".', [{ form: 'мысль', gloss: 'thought', role: 'noun' }]),
  card('o2-2', 'мысли', 'Thoughts', 'Nominative plural: "thoughts".', [{ form: 'мысли', gloss: 'thoughts', role: 'noun' }]),
  card('o2-3', 'сумбурный', 'Chaotic', 'Adjective: "chaotic / jumbled / disorganized".', [{ form: 'сумбурный', gloss: 'chaotic', role: 'adjective' }]),
  card('o2-4', 'сумбурные мысли', 'Chaotic thoughts', null, [{ form: 'сумбурные', gloss: 'chaotic', role: 'adjective' }, { form: 'мысли', gloss: 'thoughts', role: 'noun' }], 'Сумбурные мысли', 'Chaotic thoughts'),
  card('o2-5', 'кость', 'Bone', 'Noun: "bone". Singular.', [{ form: 'кость', gloss: 'bone', role: 'noun' }]),
  card('o2-6', 'кости', 'Bones', 'Nominative plural: "bones".', [{ form: 'кости', gloss: 'bones', role: 'noun' }]),
  card('o2-7', 'прекрасный', 'Beautiful', 'Adjective: "beautiful / magnificent".', [{ form: 'прекрасный', gloss: 'beautiful', role: 'adjective' }]),
  card('o2-8', 'прекрасные кости', 'Beautiful bones', null, [{ form: 'прекрасные', gloss: 'beautiful', role: 'adjective' }, { form: 'кости', gloss: 'bones', role: 'noun' }], 'прекрасные кости', 'beautiful bones'),
]);

const OUTRO_L3 = lesson('sv-out-3', 'Outro · Lesson 3', 'Don\'t forget yourself — synthesis', 'sparkles', [
  card('o3-1', 'забывать', 'To forget', 'Imperfective infinitive: "to forget" (process/habitual).', [{ form: 'забывать', gloss: 'to forget', role: 'verb' }]),
  card('o3-2', 'забыться', 'To forget oneself / get carried away', 'Reflexive (-ся): "to forget oneself / to get carried away" — to lose one\'s sense of proportion.', [{ form: 'забыться', gloss: 'to forget oneself', role: 'verb' }]),
  card('o3-3', 'забывайся', 'Forget yourself!', 'Imperative of "забыться": "forget yourself! / get carried away!".', [{ form: 'забывайся', gloss: 'forget yourself!', role: 'verb' }]),
  card('o3-4', 'не забывайся', 'Don\'t forget yourself', 'Negated imperative: "don\'t forget yourself / don\'t get carried away".', [{ form: 'не', gloss: 'not', role: 'particle' }, { form: 'забывайся', gloss: 'forget yourself!', role: 'verb' }], 'Падла, не забывайся', 'Don\'t forget yourself, you bastard'),
  card('o3-5', 'падла', 'Bastard / scoundrel', 'Slang noun (mildly derogatory): "bastard / creep / scoundrel".', [{ form: 'падла', gloss: 'bastard', role: 'noun' }]),
  card('o3-6', 'мы просто тут гости', 'We\'re just guests here', 'Review: the outro\'s key line from Lesson 1.', [{ form: 'мы', gloss: 'we', role: 'pronoun' }, { form: 'просто', gloss: 'just', role: 'adverb' }, { form: 'тут', gloss: 'here', role: 'adverb' }, { form: 'гости', gloss: 'guests', role: 'noun' }], 'мы просто тут гости', 'we\'re just guests here'),
  card('o3-7', 'сумбурные мысли, прекрасные кости', 'Chaotic thoughts, beautiful bones', 'Review: the outro\'s closing image from Lesson 2 — beneath the chaos, beauty.', [{ form: 'сумбурные', gloss: 'chaotic', role: 'adjective' }, { form: 'мысли', gloss: 'thoughts', role: 'noun' }, { form: 'прекрасные', gloss: 'beautiful', role: 'adjective' }, { form: 'кости', gloss: 'bones', role: 'noun' }], 'Сумбурные мысли, прекрасные кости', 'Chaotic thoughts, beautiful bones'),
]);

// ═══════════════════════════════════════════════════════════════════
// EXPORT: structured as sub-decks (sections). `lyricSectionId` joins each
// sub-deck to its raw-lyrics section in svetoforSong.ts.
// ═══════════════════════════════════════════════════════════════════

export const SVETOFOR_SUBDECKS: SubDeck[] = [
  { id: 'sv-intro', label: 'Intro', kind: 'intro', lyricSectionId: 'intro', lessons: INTRO_LESSONS },
  { id: 'sv-verse-1', label: 'Verse 1', kind: 'verse', lyricSectionId: 'verse-1', lessons: [V1_L1, V1_L2, V1_L3, V1_L4, V1_L5, V1_L6, V1_L7, V1_L8] },
  { id: 'sv-chorus', label: 'Chorus', kind: 'chorus', lyricSectionId: 'chorus', lessons: [CH_L1, CH_L2, CH_L3, CH_L4, CH_L5, CH_L6] },
  { id: 'sv-verse-2', label: 'Verse 2', kind: 'verse', lyricSectionId: 'verse-2', lessons: [V2_L1, V2_L2, V2_L3, V2_L4, V2_L5, V2_L6] },
  { id: 'sv-outro', label: 'Outro', kind: 'outro', lyricSectionId: 'outro', lessons: [OUTRO_L1, OUTRO_L2, OUTRO_L3] },
];

// Flatten for the deck system (keeps backwards compat with getLesson).
export const ALL_SVETOFOR_LESSONS: Lesson[] = SVETOFOR_SUBDECKS.flatMap((sd) => sd.lessons);
