// utils/knowalong/fixtures/basicWords.ts
//
// Concrete high-frequency nouns — the "dog / apple" layer of the spine. They
// are useful vocabulary in their own right AND scaffolding: song-arc context
// cards reuse them as known objects (e.g. "вижу собаку" — I see a dog) so a
// new lyric word is taught i+1 (one new item wrapped in known material).
//
// Like all spine words, they are mastery-keyed by `form`
// (utils/knowalong/mastery.ts): a basic word graduated anywhere counts as
// known in every later context. Starter set — extend as arcs need more objects.

import type { WordPart } from './learningItems';

export const BASIC_WORDS: readonly WordPart[] = [
  { form: 'собака', gloss: 'dog', role: 'noun' },
  { form: 'кошка', gloss: 'cat', role: 'noun' },
  { form: 'яблоко', gloss: 'apple', role: 'noun' },
  { form: 'вода', gloss: 'water', role: 'noun' },
  { form: 'книга', gloss: 'book', role: 'noun' },
  { form: 'дом', gloss: 'house', role: 'noun' },
  { form: 'кот', gloss: 'cat (male)', role: 'noun' },
  { form: 'машина', gloss: 'car', role: 'noun' },
  { form: 'дерево', gloss: 'tree', role: 'noun' },
  { form: 'окно', gloss: 'window', role: 'noun' },
  { form: 'стол', gloss: 'table', role: 'noun' },
  { form: 'хлеб', gloss: 'bread', role: 'noun' },
  { form: 'молоко', gloss: 'milk', role: 'noun' },
  { form: 'город', gloss: 'city', role: 'noun' },
  { form: 'имя', gloss: 'name', role: 'noun' },
];
