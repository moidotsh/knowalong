// utils/knowalong/fixtures/svetoforSong.ts
//
// "Светофор" by Mnogoznaal — a real song broken into sections, each with
// its lines analyzed for CLCCs + progressive vocabulary. The lesson flow:
// Section 1 (Intro/Verse 1) introduces the simplest concepts the learner
// already knows + a few new words. Each subsequent section layers MORE
// vocabulary on top. By the Chorus, the learner is reading real Russian
// hip-hop lines with understanding.
//
// This is the prototype for the lyric-learning experience: import a song →
// see each section → learn the concepts/words it needs → build up to
// reading the full verse.

import type { LearningItem } from './learningItems';

export interface LyricWord {
  form: string;
  gloss: string;
  role: 'pronoun' | 'verb' | 'noun' | 'particle' | 'adjective' | 'adverb';
  isKnown?: boolean; // true if the learner already knows this from the stream
  isNew?: boolean;   // true if this word is introduced in THIS section
}

export interface LyricLine {
  ordinal: number;
  text: string;
  translation: string;
  words: LyricWord[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SongSection {
  id: string;
  kind: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';
  label: string;
  lines: LyricLine[];
  newWords: string[];       // words first introduced in this section
  cumulativeWords: number; // total unique words the learner has after this section
}

// The base CLCC phrases the learner has mastered (from the stream).
const KNOWN = ['я', 'вижу', 'знаю', 'хочу', 'иду', 'живу', 'не', 'мне', 'нравится'];

export const SVETOFOR_SONG: {
  title: string;
  artist: string;
  language: string;
  sections: SongSection[];
} = {
  title: 'Светофор',
  artist: 'Mnogoznaal',
  language: 'ru',
  sections: [
    // ── Intro: establishes mood. Minimal new vocab. ──────────────────
    {
      id: 'intro',
      kind: 'intro',
      label: 'Intro',
      lines: [
        {
          ordinal: 1,
          text: 'Эй',
          translation: 'Hey',
          difficulty: 'easy',
          words: [{ form: 'эй', gloss: 'hey', role: 'particle', isNew: true }],
        },
        {
          ordinal: 2,
          text: 'А, будто полетев фантомом, а',
          translation: 'Ah, as if flying like a phantom, ah',
          difficulty: 'medium',
          words: [
            { form: 'будто', gloss: 'as if', role: 'particle', isNew: true },
            { form: 'полетев', gloss: 'having flown', role: 'verb', isNew: true },
            { form: 'фантомом', gloss: 'phantom', role: 'noun', isNew: true },
          ],
        },
      ],
      newWords: ['эй', 'будто', 'полетев', 'фантомом'],
      cumulativeWords: 4,
    },

    // ── Verse 1: introduces core narrative vocab. Builds on known CLCCs. ──
    {
      id: 'verse-1',
      kind: 'verse',
      label: 'Verse 1',
      lines: [
        {
          ordinal: 3,
          text: 'Будто полетев фантомом вглубь',
          translation: 'As if flying like a phantom deep inside',
          difficulty: 'medium',
          words: [
            { form: 'будто', gloss: 'as if', role: 'particle', isKnown: true },
            { form: 'полетев', gloss: 'having flown', role: 'verb', isKnown: true },
            { form: 'фантомом', gloss: 'phantom', role: 'noun', isKnown: true },
            { form: 'вглубь', gloss: 'deep into', role: 'adverb', isNew: true },
          ],
        },
        {
          ordinal: 4,
          text: 'То, как кричал тут Рома громко, не перебивал тут даже грома стук',
          translation: 'Like how Roma shouted loudly here, didn\'t interrupt even the thunder\'s knock',
          difficulty: 'hard',
          words: [
            { form: 'как', gloss: 'how/like', role: 'particle', isNew: true },
            { form: 'кричал', gloss: 'shouted', role: 'verb', isNew: true },
            { form: 'тут', gloss: 'here', role: 'adverb', isNew: true },
            { form: 'громко', gloss: 'loudly', role: 'adverb', isNew: true },
            { form: 'не', gloss: 'not', role: 'particle', isKnown: true },
            { form: 'перебивал', gloss: 'interrupted', role: 'verb', isNew: true },
            { form: 'даже', gloss: 'even', role: 'particle', isNew: true },
            { form: 'грома', gloss: 'thunder', role: 'noun', isNew: true },
            { form: 'стук', gloss: 'knock', role: 'noun', isNew: true },
          ],
        },
        {
          ordinal: 5,
          text: 'Ночью давит меня громкий клуб, под обломки дум',
          translation: 'At night a loud club presses me, under the fragments of thoughts',
          difficulty: 'hard',
          words: [
            { form: 'ночью', gloss: 'at night', role: 'adverb', isNew: true },
            { form: 'давит', gloss: 'presses', role: 'verb', isNew: true },
            { form: 'меня', gloss: 'me', role: 'pronoun', isKnown: true },
            { form: 'громкий', gloss: 'loud', role: 'adjective', isNew: true },
            { form: 'клуб', gloss: 'club', role: 'noun', isNew: true },
            { form: 'под', gloss: 'under', role: 'particle', isNew: true },
            { form: 'обломки', gloss: 'fragments', role: 'noun', isNew: true },
            { form: 'дум', gloss: 'of thoughts', role: 'noun', isNew: true },
          ],
        },
        {
          ordinal: 6,
          text: 'Стойкий дух безобъёмный груз, он среди них как за каёмкой',
          translation: 'A steadfast spirit, a weightless burden, he among them as if behind a border',
          difficulty: 'hard',
          words: [
            { form: 'стойкий', gloss: 'steadfast', role: 'adjective', isNew: true },
            { form: 'дух', gloss: 'spirit', role: 'noun', isNew: true },
            { form: 'груз', gloss: 'burden', role: 'noun', isNew: true },
            { form: 'он', gloss: 'he', role: 'pronoun', isNew: true },
            { form: 'среди', gloss: 'among', role: 'particle', isNew: true },
            { form: 'них', gloss: 'them', role: 'pronoun', isNew: true },
          ],
        },
        {
          ordinal: 7,
          text: 'Если душновато, то я выйду с ней',
          translation: 'If it\'s stuffy, then I\'ll step out with her',
          difficulty: 'medium',
          words: [
            { form: 'если', gloss: 'if', role: 'particle', isNew: true },
            { form: 'то', gloss: 'then', role: 'particle', isNew: true },
            { form: 'я', gloss: 'I', role: 'pronoun', isKnown: true },
            { form: 'выйду', gloss: 'I\'ll go out', role: 'verb', isNew: true },
            { form: 'с', gloss: 'with', role: 'particle', isNew: true },
            { form: 'ней', gloss: 'her', role: 'pronoun', isNew: true },
          ],
        },
        {
          ordinal: 8,
          text: 'Но я сам ненавижу мизантропа внутри',
          translation: 'But I myself hate the misanthrope inside',
          difficulty: 'hard',
          words: [
            { form: 'но', gloss: 'but', role: 'particle', isNew: true },
            { form: 'я', gloss: 'I', role: 'pronoun', isKnown: true },
            { form: 'сам', gloss: 'myself', role: 'pronoun', isNew: true },
            { form: 'ненавижу', gloss: 'hate', role: 'verb', isNew: true },
            { form: 'внутри', gloss: 'inside', role: 'adverb', isNew: true },
          ],
        },
        {
          ordinal: 9,
          text: 'Значит, я его убью сам',
          translation: 'So, I\'ll kill him myself',
          difficulty: 'medium',
          words: [
            { form: 'значит', gloss: 'so/means', role: 'particle', isNew: true },
            { form: 'я', gloss: 'I', role: 'pronoun', isKnown: true },
            { form: 'его', gloss: 'him', role: 'pronoun', isNew: true },
            { form: 'убью', gloss: 'I\'ll kill', role: 'verb', isNew: true },
            { form: 'сам', gloss: 'myself', role: 'pronoun', isKnown: true },
          ],
        },
      ],
      newWords: ['вглубь', 'как', 'кричал', 'тут', 'громко', 'перебивал', 'даже', 'грома', 'стук', 'ночью', 'давит', 'громкий', 'клуб', 'под', 'обломки', 'дум', 'стойкий', 'дух', 'груз', 'он', 'среди', 'них', 'если', 'то', 'выйду', 'с', 'ней', 'но', 'сам', 'ненавижу', 'внутри', 'значит', 'его', 'убью'],
      cumulativeWords: 38,
    },

    // ── Chorus: the emotional core. Reuses verse vocab + adds key chorus words. ──
    {
      id: 'chorus',
      kind: 'chorus',
      label: 'Chorus',
      lines: [
        {
          ordinal: 10,
          text: 'Когда мы под сценарий перемен',
          translation: 'When we\'re under a script of changes',
          difficulty: 'hard',
          words: [
            { form: 'когда', gloss: 'when', role: 'particle', isNew: true },
            { form: 'мы', gloss: 'we', role: 'pronoun', isNew: true },
            { form: 'под', gloss: 'under', role: 'particle', isKnown: true },
            { form: 'сценарий', gloss: 'script', role: 'noun', isNew: true },
            { form: 'перемен', gloss: 'of changes', role: 'noun', isNew: true },
          ],
        },
        {
          ordinal: 11,
          text: 'Что выглядит будто бы обычный светофор',
          translation: 'That looks like an ordinary traffic light',
          difficulty: 'hard',
          words: [
            { form: 'что', gloss: 'that', role: 'pronoun', isNew: true },
            { form: 'выглядит', gloss: 'looks', role: 'verb', isNew: true },
            { form: 'будто', gloss: 'as if', role: 'particle', isKnown: true },
            { form: 'бы', gloss: 'would (particle)', role: 'particle', isNew: true },
            { form: 'обычный', gloss: 'ordinary', role: 'adjective', isNew: true },
            { form: 'светофор', gloss: 'traffic light', role: 'noun', isNew: true },
          ],
        },
        {
          ordinal: 12,
          text: 'Посередине танцевали со злом, были дураками',
          translation: 'In the middle we danced with evil, we were fools',
          difficulty: 'hard',
          words: [
            { form: 'танцевали', gloss: 'danced', role: 'verb', isNew: true },
            { form: 'со', gloss: 'with', role: 'particle', isNew: true },
            { form: 'злом', gloss: 'evil', role: 'noun', isNew: true },
            { form: 'были', gloss: 'were', role: 'verb', isNew: true },
            { form: 'дураками', gloss: 'fools', role: 'noun', isNew: true },
          ],
        },
        {
          ordinal: 13,
          text: 'Да простит нас Бог',
          translation: 'May God forgive us',
          difficulty: 'medium',
          words: [
            { form: 'да', gloss: 'may/let', role: 'particle', isNew: true },
            { form: 'простит', gloss: 'forgive', role: 'verb', isNew: true },
            { form: 'нас', gloss: 'us', role: 'pronoun', isNew: true },
            { form: 'Бог', gloss: 'God', role: 'noun', isNew: true },
          ],
        },
        {
          ordinal: 14,
          text: 'Проснись и пой, проснись, живой',
          translation: 'Wake up and sing, wake up, alive one',
          difficulty: 'medium',
          words: [
            { form: 'проснись', gloss: 'wake up', role: 'verb', isNew: true },
            { form: 'и', gloss: 'and', role: 'particle', isNew: true },
            { form: 'пой', gloss: 'sing', role: 'verb', isNew: true },
            { form: 'живой', gloss: 'alive', role: 'adjective', isNew: true },
          ],
        },
      ],
      newWords: ['когда', 'мы', 'сценарий', 'перемен', 'что', 'выглядит', 'бы', 'обычный', 'светофор', 'танцевали', 'со', 'злом', 'были', 'дураками', 'да', 'простит', 'нас', 'Бог', 'проснись', 'и', 'пой', 'живой'],
      cumulativeWords: 60,
    },

    // ── Verse 2: reflection. Reuses all prior vocab + adds abstract words. ──
    {
      id: 'verse-2',
      kind: 'verse',
      label: 'Verse 2',
      lines: [
        {
          ordinal: 15,
          text: 'Я всегда любил мечтать о красивых местах',
          translation: 'I always loved dreaming about beautiful places',
          difficulty: 'medium',
          words: [
            { form: 'я', gloss: 'I', role: 'pronoun', isKnown: true },
            { form: 'всегда', gloss: 'always', role: 'adverb', isNew: true },
            { form: 'любил', gloss: 'loved', role: 'verb', isKnown: true },
            { form: 'мечтать', gloss: 'to dream', role: 'verb', isNew: true },
            { form: 'о', gloss: 'about', role: 'particle', isNew: true },
            { form: 'красивых', gloss: 'beautiful', role: 'adjective', isNew: true },
            { form: 'местах', gloss: 'places', role: 'noun', isNew: true },
          ],
        },
        {
          ordinal: 16,
          text: 'Там, где нас никогда не найдёшь',
          translation: 'There, where no one will ever find us',
          difficulty: 'medium',
          words: [
            { form: 'там', gloss: 'there', role: 'adverb', isNew: true },
            { form: 'где', gloss: 'where', role: 'particle', isNew: true },
            { form: 'нас', gloss: 'us', role: 'pronoun', isKnown: true },
            { form: 'никогда', gloss: 'never', role: 'adverb', isNew: true },
            { form: 'не', gloss: 'not', role: 'particle', isKnown: true },
            { form: 'найдёшь', gloss: 'will find', role: 'verb', isNew: true },
          ],
        },
        {
          ordinal: 17,
          text: 'Но посмотри, мир стал другим',
          translation: 'But look, the world has become different',
          difficulty: 'medium',
          words: [
            { form: 'но', gloss: 'but', role: 'particle', isKnown: true },
            { form: 'посмотри', gloss: 'look', role: 'verb', isNew: true },
            { form: 'мир', gloss: 'world', role: 'noun', isKnown: true },
            { form: 'стал', gloss: 'became', role: 'verb', isNew: true },
            { form: 'другим', gloss: 'different', role: 'adjective', isNew: true },
          ],
        },
        {
          ordinal: 18,
          text: 'Он падает, но не к нам на руки',
          translation: 'It\'s falling, but not into our arms',
          difficulty: 'hard',
          words: [
            { form: 'он', gloss: 'it', role: 'pronoun', isKnown: true },
            { form: 'падает', gloss: 'falls', role: 'verb', isNew: true },
            { form: 'но', gloss: 'but', role: 'particle', isKnown: true },
            { form: 'не', gloss: 'not', role: 'particle', isKnown: true },
            { form: 'к', gloss: 'to', role: 'particle', isNew: true },
            { form: 'нам', gloss: 'us', role: 'pronoun', isNew: true },
            { form: 'руки', gloss: 'arms/hands', role: 'noun', isNew: true },
          ],
        },
      ],
      newWords: ['всегда', 'мечтать', 'о', 'красивых', 'местах', 'там', 'где', 'никогда', 'найдёшь', 'посмотри', 'стал', 'другим', 'падает', 'к', 'нам', 'руки'],
      cumulativeWords: 76,
    },

    // ── Outro: quiet reflection. Minimal new vocab — mostly known words. ──
    {
      id: 'outro',
      kind: 'outro',
      label: 'Outro',
      lines: [
        {
          ordinal: 19,
          text: 'Мы просто тут гости',
          translation: 'We\'re just guests here',
          difficulty: 'easy',
          words: [
            { form: 'мы', gloss: 'we', role: 'pronoun', isKnown: true },
            { form: 'просто', gloss: 'just', role: 'adverb', isNew: true },
            { form: 'тут', gloss: 'here', role: 'adverb', isKnown: true },
            { form: 'гости', gloss: 'guests', role: 'noun', isNew: true },
          ],
        },
        {
          ordinal: 20,
          text: 'Сумбурные мысли, прекрасные кости',
          translation: 'Chaotic thoughts, beautiful bones',
          difficulty: 'hard',
          words: [
            { form: 'сумбурные', gloss: 'chaotic', role: 'adjective', isNew: true },
            { form: 'мысли', gloss: 'thoughts', role: 'noun', isNew: true },
            { form: 'прекрасные', gloss: 'beautiful', role: 'adjective', isNew: true },
            { form: 'кости', gloss: 'bones', role: 'noun', isNew: true },
          ],
        },
      ],
      newWords: ['просто', 'гости', 'сумбурные', 'мысли', 'прекрасные', 'кости'],
      cumulativeWords: 82,
    },
  ],
};
