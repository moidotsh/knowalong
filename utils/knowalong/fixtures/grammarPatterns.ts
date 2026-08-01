// utils/knowalong/fixtures/grammarPatterns.ts
// Prototype grammar reference — paradigm tables + pattern explanations the
// learner can browse when confused. Not a lesson — a reference surface.

export interface ParadigmCell {
  case: string;
  singular: string;
  plural: string;
}

export interface GrammarPattern {
  id: string;
  icon: 'book' | 'brain' | 'sparkles' | 'waves';
  title: string;
  category: 'Cases' | 'Verbs' | 'Particles' | 'Pronouns';
  summary: string;
  paradigm?: ParadigmCell[];
  explanation: string;
  example: string;
  exampleTranslation: string;
}

export const GRAMMAR_PATTERNS: readonly GrammarPattern[] = [
  {
    id: 'noun-cases',
    icon: 'book',
    title: 'Noun Cases (стол — table)',
    category: 'Cases',
    summary: 'Russian nouns change form based on their role in the sentence.',
    paradigm: [
      { case: 'Nominative (subject)', singular: 'стол', plural: 'столы' },
      { case: 'Genitive (of)', singular: 'стола', plural: 'столов' },
      { case: 'Dative (to/for)', singular: 'столу', plural: 'столам' },
      { case: 'Accusative (object)', singular: 'стол', plural: 'столы' },
      { case: 'Instrumental (with)', singular: 'столом', plural: 'столами' },
      { case: 'Prepositional (about)', singular: 'столе', plural: 'столах' },
    ],
    explanation: 'Russian has 6 cases. The nominative is the dictionary form (the subject). Every other case signals the noun\'s role — genitive for possession, dative for recipient, accusative for direct object, etc.',
    example: 'Я вижу стол.',
    exampleTranslation: 'I see the table. (стол is accusative — but for inanimate masculine nouns, accusative = nominative)',
  },
  {
    id: 'verb-conjugation',
    icon: 'brain',
    title: 'Verb Conjugation (видеть — to see)',
    category: 'Verbs',
    summary: 'Russian verbs conjugate by person and number in the present tense.',
    paradigm: [
      { case: '1st sg (я)', singular: 'вижу', plural: '' },
      { case: '2nd sg (ты)', singular: 'видишь', plural: '' },
      { case: '3rd sg (он/она)', singular: 'видит', plural: '' },
      { case: '1st pl (мы)', singular: 'видим', plural: '' },
      { case: '2nd pl (вы)', singular: 'видите', plural: '' },
      { case: '3rd pl (они)', singular: 'видят', plural: '' },
    ],
    explanation: 'Present tense has 6 forms. The ending tells you WHO is doing the action — so Russian often drops the pronoun. "Вижу" alone means "I see" (the -у ending signals 1st person).',
    example: 'Я вижу море.',
    exampleTranslation: 'I see the sea.',
  },
  {
    id: 'negation',
    icon: 'sparkles',
    title: 'Negation (не)',
    category: 'Particles',
    summary: 'Place "не" directly before the verb being negated.',
    explanation: 'Russian negation is simple: just put "не" before whatever you\'re negating. "не" before a verb = "don\'t". "не" before an adjective = "not". Unlike English, there\'s no auxiliary ("do/don\'t") — just "не" + verb.',
    example: 'Я не знаю.',
    exampleTranslation: "I don't know. (не + знаю = don't + know)",
  },
  {
    id: 'dative-liking',
    icon: 'waves',
    title: 'Liking Construction (мне нравится)',
    category: 'Pronouns',
    summary: 'Russian says "to me, it pleases" — not "I like".',
    explanation: 'Russian flips the English structure. Instead of "I like X", it says "X pleases to-me" (мне нравится X). The person experiencing the feeling is in the dative case (мне = to me, the dative of я). The thing being liked is the grammatical subject.',
    example: 'Мне нравится музыка.',
    exampleTranslation: 'Literally: "To me is-pleasing music" = "I like music."',
  },
] as const;
