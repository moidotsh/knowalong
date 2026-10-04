// utils/knowalong/fixtures/contextPhrases.ts
//
// AUTHORED context phrases — the mock stand-in for the Phase 6 Supabase Edge
// Function output (ADR R7). A frontier AI will eventually compose, per target,
// ≥8 fluent morphologically-correct i+1 phrases weaving the target into the
// palette (the AI's composition vocabulary — see palette.ts +
// `knowalong-studio/_reports/lyric-context-generation.md` §3a). The mock cannot
// compose (no morphology metadata), so these are HAND-AUTHORED correct Russian
// that mirror that output. They retire when the Edge Function lands; their real
// value now is proving the palette + composition model contextualizes the actual
// targets (a contract test). See `knowalong/_reports/server-context-generation.md`.
//
// AUTHORING RULES (load-bearing; enforced by contextPhrases.fixture.test.ts):
//  - `surfaceForm` is DERIVED from `words` (p() joins the forms) so display can
//    never diverge from the chip set the learner assembles.
//  - Every non-target word MUST be a palette atom (so the generator's wrappability
//    filter accepts the phrase; any not-yet-graduated one scaffolds cleanly). No
//    novel lyric line-mates — they'd be rejected.
//  - Membership = "the mock can honestly reach ≥8 (authored + lyric windows) for
//    this target." A target NOT in this map falls back to lyric windows only and,
//    if still <8, DEFERS (acquired via the culminating line) — the honest mock
//    ceiling the Edge Function removes. Case-specific nouns (instrumental /
//    genitive: фантомом, грома, дум, …) that the mock cannot place correctly are
//    deliberately omitted.

import type { ContextPhrase } from '../contextProvider';
import type { WordPart } from './learningItems';

/** Build a phrase from raw [form, gloss, role] tuples. `surfaceForm` is DERIVED
 *  from the forms (joined by space) so it always matches the chip set. */
function p(meaning: string, words: ReadonlyArray<[string, string, WordPart['role']]>): ContextPhrase {
  const parts = words.map(([form, gloss, role]) => ({ form, gloss, role }));
  return { surfaceForm: parts.map((w) => w.form).join(' '), meaning, words: parts };
}

export const AUTHORED_CONTEXT_PHRASES: ReadonlyMap<string, readonly ContextPhrase[]> = new Map([
  // ── Intro ─────────────────────────────────────────────────────────────
  ['эй', [
    p('hey, you', [['эй', 'hey', 'particle'], ['ты', 'you (sg.)', 'pronoun']]),
    p("hey, who's here", [['эй', 'hey', 'particle'], ['кто', 'who', 'pronoun'], ['тут', 'here', 'adverb']]),
    p("hey, I'm here", [['эй', 'hey', 'particle'], ['я', 'I', 'pronoun'], ['тут', 'here', 'adverb']]),
    p("hey, he's coming", [['эй', 'hey', 'particle'], ['он', 'he / it', 'pronoun'], ['идёт', 'goes', 'verb']]),
    p("hey, I'm coming", [['эй', 'hey', 'particle'], ['иду', 'I go', 'verb']]),
    p("hey, she's here", [['эй', 'hey', 'particle'], ['она', 'she', 'pronoun'], ['тут', 'here', 'adverb']]),
    p("hey, we're here", [['эй', 'hey', 'particle'], ['мы', 'we', 'pronoun'], ['тут', 'here', 'adverb']]),
    p("hey, he's looking", [['эй', 'hey', 'particle'], ['он', 'he / it', 'pronoun'], ['смотрит', 'looks / watches', 'verb']]),
  ]],
  ['будто', [
    p('as if I see', [['будто', 'as if', 'particle'], ['я', 'I', 'pronoun'], ['вижу', 'I see', 'verb']]),
    p('as if he knows', [['будто', 'as if', 'particle'], ['он', 'he / it', 'pronoun'], ['знает', 'knows', 'verb']]),
    p("as if he's here", [['будто', 'as if', 'particle'], ['он', 'he / it', 'pronoun'], ['тут', 'here', 'adverb']]),
    p('as if I know', [['будто', 'as if', 'particle'], ['я', 'I', 'pronoun'], ['знаю', 'I know', 'verb']]),
    p('as if she sees', [['будто', 'as if', 'particle'], ['она', 'she', 'pronoun'], ['видит', 'sees', 'verb']]),
    p('as if he wants', [['будто', 'as if', 'particle'], ['он', 'he / it', 'pronoun'], ['хочет', 'wants', 'verb']]),
    p("as if we're here", [['будто', 'as if', 'particle'], ['мы', 'we', 'pronoun'], ['тут', 'here', 'adverb']]),
    p('as if this', [['будто', 'as if', 'particle'], ['это', 'this / it is', 'pronoun']]),
  ]],
  ['полетев', [
    p('having flown home', [['полетев', 'having flown', 'verb'], ['домой', 'home (to home)', 'adverb']]),
    p('having flown far', [['полетев', 'having flown', 'verb'], ['далеко', 'far', 'adverb']]),
    p('having flown there', [['полетев', 'having flown', 'verb'], ['туда', 'there (thither)', 'adverb']]),
    p('having flown fast', [['полетев', 'having flown', 'verb'], ['быстро', 'quickly', 'adverb']]),
    p('having flown together', [['полетев', 'having flown', 'verb'], ['вместе', 'together', 'adverb']]),
    p('having flown again', [['полетев', 'having flown', 'verb'], ['опять', 'again', 'adverb']]),
    p('having flown now', [['полетев', 'having flown', 'verb'], ['сейчас', 'now', 'adverb']]),
    p('having flown here', [['полетев', 'having flown', 'verb'], ['здесь', 'here', 'adverb']]),
  ]],

  // ── Verse 1 ───────────────────────────────────────────────────────────
  ['как', [
    // Position variety (R9): как at start, mid, AND end — not always «как ___».
    p('how are you', [['как', 'how/like', 'particle'], ['ты', 'you (sg.)', 'pronoun']]),
    p('how is he', [['как', 'how/like', 'particle'], ['он', 'he / it', 'pronoun']]),
    p('how is it there', [['как', 'how/like', 'particle'], ['там', 'there', 'adverb']]),
    p('as always', [['как', 'how/like', 'particle'], ['всегда', 'always', 'adverb']]),
    p('like him', [['такой', 'such', 'pronoun'], ['как', 'how/like', 'particle'], ['он', 'he / it', 'pronoun']]),
    p('he is like me', [['он', 'he / it', 'pronoun'], ['такой', 'such', 'pronoun'], ['как', 'how/like', 'particle'], ['я', 'I', 'pronoun']]),
    p("I don't know how", [['я', 'I', 'pronoun'], ['не', 'not', 'particle'], ['знаю', 'I know', 'verb'], ['как', 'how/like', 'particle']]),
    p('he knows how', [['он', 'he / it', 'pronoun'], ['знает', 'knows', 'verb'], ['как', 'how/like', 'particle']]),
  ]],
  ['кричал', [
    p('he shouted', [['он', 'he / it', 'pronoun'], ['кричал', 'shouted', 'verb']]),
    p('the boy shouted', [['мальчик', 'boy', 'noun'], ['кричал', 'shouted', 'verb']]),
    p('the friend shouted', [['друг', 'friend', 'noun'], ['кричал', 'shouted', 'verb']]),
    p('the person shouted', [['человек', 'person', 'noun'], ['кричал', 'shouted', 'verb']]),
    p('shouted loudly', [['кричал', 'shouted', 'verb'], ['громко', 'loudly', 'adverb']]),
    p('shouted here', [['кричал', 'shouted', 'verb'], ['тут', 'here', 'adverb']]),
    p('shouted there', [['кричал', 'shouted', 'verb'], ['там', 'there', 'adverb']]),
    p('shouted again', [['кричал', 'shouted', 'verb'], ['опять', 'again', 'adverb']]),
  ]],
  ['тут', [
    p("I'm here", [['я', 'I', 'pronoun'], ['тут', 'here', 'adverb']]),
    p("he's here", [['он', 'he / it', 'pronoun'], ['тут', 'here', 'adverb']]),
    p("we're here", [['мы', 'we', 'pronoun'], ['тут', 'here', 'adverb']]),
    p("who's here", [['кто', 'who', 'pronoun'], ['тут', 'here', 'adverb']]),
    p('here and there', [['тут', 'here', 'adverb'], ['и', 'and', 'particle'], ['там', 'there', 'adverb']]),
    p("it's good here", [['тут', 'here', 'adverb'], ['хорошо', 'well / good', 'adverb']]),
    p('here now', [['тут', 'here', 'adverb'], ['сейчас', 'now', 'adverb']]),
    p('I live here', [['живу', 'I live', 'verb'], ['тут', 'here', 'adverb']]),
  ]],
  ['громко', [
    p('speaks loudly', [['говорит', 'speaks / says', 'verb'], ['громко', 'loudly', 'adverb']]),
    p('sings loudly', [['поёт', 'sings', 'verb'], ['громко', 'loudly', 'adverb']]),
    p('plays loudly', [['играет', 'plays', 'verb'], ['громко', 'loudly', 'adverb']]),
    p('works loudly', [['работает', 'works', 'verb'], ['громко', 'loudly', 'adverb']]),
    p('very loudly', [['очень', 'very', 'adverb'], ['громко', 'loudly', 'adverb']]),
    p('loudly here', [['громко', 'loudly', 'adverb'], ['тут', 'here', 'adverb']]),
    p('loudly there', [['громко', 'loudly', 'adverb'], ['там', 'there', 'adverb']]),
    p('loudly together', [['громко', 'loudly', 'adverb'], ['вместе', 'together', 'adverb']]),
  ]],
  ['перебивал', [
    p('he interrupted', [['он', 'he / it', 'pronoun'], ['перебивал', 'interrupted', 'verb']]),
    p('the boy interrupted', [['мальчик', 'boy', 'noun'], ['перебивал', 'interrupted', 'verb']]),
    p('the friend interrupted', [['друг', 'friend', 'noun'], ['перебивал', 'interrupted', 'verb']]),
    p('the person interrupted', [['человек', 'person', 'noun'], ['перебивал', 'interrupted', 'verb']]),
    p('interrupted loudly', [['перебивал', 'interrupted', 'verb'], ['громко', 'loudly', 'adverb']]),
    p('always interrupted', [['перебивал', 'interrupted', 'verb'], ['всегда', 'always', 'adverb']]),
    p('interrupted here', [['перебивал', 'interrupted', 'verb'], ['тут', 'here', 'adverb']]),
    p('interrupted again', [['перебивал', 'interrupted', 'verb'], ['опять', 'again', 'adverb']]),
  ]],
  ['даже', [
    p('even I', [['даже', 'even', 'particle'], ['я', 'I', 'pronoun']]),
    p('even he', [['даже', 'even', 'particle'], ['он', 'he / it', 'pronoun']]),
    p('even here', [['даже', 'even', 'particle'], ['тут', 'here', 'adverb']]),
    p('even now', [['даже', 'even', 'particle'], ['сейчас', 'now', 'adverb']]),
    p('even this', [['даже', 'even', 'particle'], ['это', 'this / it is', 'pronoun']]),
    p('even good', [['даже', 'even', 'particle'], ['хорошо', 'well / good', 'adverb']]),
    p('even very', [['даже', 'even', 'particle'], ['очень', 'very', 'adverb']]),
    p('even always', [['даже', 'even', 'particle'], ['всегда', 'always', 'adverb']]),
  ]],
  ['ночью', [
    p('he goes at night', [['он', 'he / it', 'pronoun'], ['идёт', 'goes', 'verb'], ['ночью', 'at night', 'adverb']]),
    p("we're here at night", [['мы', 'we', 'pronoun'], ['тут', 'here', 'adverb'], ['ночью', 'at night', 'adverb']]),
    p('it is dark at night', [['ночью', 'at night', 'adverb'], ['темно', 'it is dark', 'adverb']]),
    p('works at night', [['работает', 'works', 'verb'], ['ночью', 'at night', 'adverb']]),
    p('lives at night', [['живёт', 'lives', 'verb'], ['ночью', 'at night', 'adverb']]),
    p('at night again', [['ночью', 'at night', 'adverb'], ['опять', 'again', 'adverb']]),
    p('together at night', [['ночью', 'at night', 'adverb'], ['вместе', 'together', 'adverb']]),
    p('I go at night', [['я', 'I', 'pronoun'], ['иду', 'I go', 'verb'], ['ночью', 'at night', 'adverb']]),
  ]],
  ['давит', [
    p('it presses', [['оно', 'it', 'pronoun'], ['давит', 'presses', 'verb']]),
    p('this presses', [['это', 'this / it is', 'pronoun'], ['давит', 'presses', 'verb']]),
    p('presses hard', [['давит', 'presses', 'verb'], ['сильно', 'hard / strongly', 'adverb']]),
    p('presses here', [['давит', 'presses', 'verb'], ['тут', 'here', 'adverb']]),
    p('always presses', [['давит', 'presses', 'verb'], ['всегда', 'always', 'adverb']]),
    p('presses again', [['давит', 'presses', 'verb'], ['опять', 'again', 'adverb']]),
    p('presses now', [['давит', 'presses', 'verb'], ['сейчас', 'now', 'adverb']]),
    p('everything presses', [['всё', 'everything / all', 'pronoun'], ['давит', 'presses', 'verb']]),
  ]],
  ['громкий', [
    p('a loud voice', [['громкий', 'loud', 'adjective'], ['голос', 'voice', 'noun']]),
    p('a loud sound', [['громкий', 'loud', 'adjective'], ['звук', 'sound', 'noun']]),
    p('a loud knock', [['громкий', 'loud', 'adjective'], ['стук', 'knock', 'noun']]),
    p('a loud boy', [['громкий', 'loud', 'adjective'], ['мальчик', 'boy', 'noun']]),
    p('a loud friend', [['громкий', 'loud', 'adjective'], ['друг', 'friend', 'noun']]),
    p('a loud world', [['громкий', 'loud', 'adjective'], ['мир', 'world', 'noun']]),
    p('this loud one', [['этот', 'this', 'pronoun'], ['громкий', 'loud', 'adjective']]),
    p('very loud', [['очень', 'very', 'adverb'], ['громкий', 'loud', 'adjective']]),
  ]],
  ['стук', [
    p('this knock', [['этот', 'this', 'pronoun'], ['стук', 'knock', 'noun']]),
    p('my knock', [['мой', 'my', 'pronoun'], ['стук', 'knock', 'noun']]),
    p('such a knock', [['такой', 'such', 'pronoun'], ['стук', 'knock', 'noun']]),
    p('a knock here', [['стук', 'knock', 'noun'], ['тут', 'here', 'adverb']]),
    p('a knock there', [['стук', 'knock', 'noun'], ['там', 'there', 'adverb']]),
    p('a knock again', [['стук', 'knock', 'noun'], ['опять', 'again', 'adverb']]),
    p('a knock at night', [['стук', 'knock', 'noun'], ['ночью', 'at night', 'adverb']]),
    p('a loud knock', [['громкий', 'loud', 'adjective'], ['стук', 'knock', 'noun']]),
  ]],
  ['клуб', [
    p('this club', [['этот', 'this', 'pronoun'], ['клуб', 'club', 'noun']]),
    p('my club', [['мой', 'my', 'pronoun'], ['клуб', 'club', 'noun']]),
    p('such a club', [['такой', 'such', 'pronoun'], ['клуб', 'club', 'noun']]),
    p('the club is here', [['клуб', 'club', 'noun'], ['тут', 'here', 'adverb']]),
    p('the club is there', [['клуб', 'club', 'noun'], ['там', 'there', 'adverb']]),
    p('a loud club', [['громкий', 'loud', 'adjective'], ['клуб', 'club', 'noun']]),
    p('a big club', [['большой', 'big', 'adjective'], ['клуб', 'club', 'noun']]),
    p('the club and the house', [['клуб', 'club', 'noun'], ['и', 'and', 'particle'], ['дом', 'house', 'noun']]),
  ]],
  ['стойкий', [
    p('a steadfast spirit', [['стойкий', 'steadfast', 'adjective'], ['дух', 'spirit', 'noun']]),
    p('a steadfast boy', [['стойкий', 'steadfast', 'adjective'], ['мальчик', 'boy', 'noun']]),
    p('a steadfast friend', [['стойкий', 'steadfast', 'adjective'], ['друг', 'friend', 'noun']]),
    p('a steadfast person', [['стойкий', 'steadfast', 'adjective'], ['человек', 'person', 'noun']]),
    p('this steadfast one', [['этот', 'this', 'pronoun'], ['стойкий', 'steadfast', 'adjective']]),
    p('very steadfast', [['очень', 'very', 'adverb'], ['стойкий', 'steadfast', 'adjective']]),
    p('steadfast and strong', [['стойкий', 'steadfast', 'adjective'], ['и', 'and', 'particle'], ['сильный', 'strong', 'adjective']]),
    p('my steadfast one', [['мой', 'my', 'pronoun'], ['стойкий', 'steadfast', 'adjective']]),
  ]],
  ['дух', [
    p('a strong spirit', [['сильный', 'strong', 'adjective'], ['дух', 'spirit', 'noun']]),
    p('a steadfast spirit', [['стойкий', 'steadfast', 'adjective'], ['дух', 'spirit', 'noun']]),
    p('this spirit', [['этот', 'this', 'pronoun'], ['дух', 'spirit', 'noun']]),
    p('my spirit', [['мой', 'my', 'pronoun'], ['дух', 'spirit', 'noun']]),
    p('the spirit is here', [['дух', 'spirit', 'noun'], ['тут', 'here', 'adverb']]),
    p('the spirit lives', [['дух', 'spirit', 'noun'], ['живёт', 'lives', 'verb']]),
    p('a great spirit', [['большой', 'big', 'adjective'], ['дух', 'spirit', 'noun']]),
    p('such a spirit', [['такой', 'such', 'pronoun'], ['дух', 'spirit', 'noun']]),
  ]],
  ['груз', [
    p('a big burden', [['большой', 'big', 'adjective'], ['груз', 'burden', 'noun']]),
    p('a heavy burden', [['сильный', 'strong', 'adjective'], ['груз', 'burden', 'noun']]),
    p('this burden', [['этот', 'this', 'pronoun'], ['груз', 'burden', 'noun']]),
    p('my burden', [['мой', 'my', 'pronoun'], ['груз', 'burden', 'noun']]),
    p('the burden presses', [['груз', 'burden', 'noun'], ['давит', 'presses', 'verb']]),
    p('the burden is here', [['груз', 'burden', 'noun'], ['тут', 'here', 'adverb']]),
    p('such a burden', [['такой', 'such', 'pronoun'], ['груз', 'burden', 'noun']]),
    p('the burden again', [['груз', 'burden', 'noun'], ['опять', 'again', 'adverb']]),
  ]],
  ['он', [
    p('he goes', [['он', 'he / it', 'pronoun'], ['идёт', 'goes', 'verb']]),
    p('he knows', [['он', 'he / it', 'pronoun'], ['знает', 'knows', 'verb']]),
    p("he's here", [['он', 'he / it', 'pronoun'], ['тут', 'here', 'adverb']]),
    p("he's there", [['он', 'he / it', 'pronoun'], ['там', 'there', 'adverb']]),
    p('he wants', [['он', 'he / it', 'pronoun'], ['хочет', 'wants', 'verb']]),
    p('he lives', [['он', 'he / it', 'pronoun'], ['живёт', 'lives', 'verb']]),
    p("he's looking", [['он', 'he / it', 'pronoun'], ['смотрит', 'looks / watches', 'verb']]),
    p('he works', [['он', 'he / it', 'pronoun'], ['работает', 'works', 'verb']]),
  ]],
  ['если', [
    p('if I see', [['если', 'if', 'particle'], ['я', 'I', 'pronoun'], ['вижу', 'I see', 'verb']]),
    p('if he knows', [['если', 'if', 'particle'], ['он', 'he / it', 'pronoun'], ['знает', 'knows', 'verb']]),
    p("if she's here", [['если', 'if', 'particle'], ['она', 'she', 'pronoun'], ['тут', 'here', 'adverb']]),
    p('if we are here', [['если', 'if', 'particle'], ['мы', 'we', 'pronoun'], ['тут', 'here', 'adverb']]),
    p('if he wants', [['если', 'if', 'particle'], ['он', 'he / it', 'pronoun'], ['хочет', 'wants', 'verb']]),
    p('if one may', [['если', 'if', 'particle'], ['можно', 'one may / it is allowed', 'particle']]),
    p('if it is good', [['если', 'if', 'particle'], ['хорошо', 'well / good', 'adverb']]),
    p('if now', [['если', 'if', 'particle'], ['сейчас', 'now', 'adverb']]),
  ]],
  ['то', [
    p('then here', [['то', 'then', 'particle'], ['тут', 'here', 'adverb']]),
    p('then there', [['то', 'then', 'particle'], ['там', 'there', 'adverb']]),
    p('then it is good', [['то', 'then', 'particle'], ['хорошо', 'well / good', 'adverb']]),
    p('then again', [['то', 'then', 'particle'], ['опять', 'again', 'adverb']]),
    p('then together', [['то', 'then', 'particle'], ['вместе', 'together', 'adverb']]),
    p('then now', [['то', 'then', 'particle'], ['сейчас', 'now', 'adverb']]),
    p('then always', [['то', 'then', 'particle'], ['всегда', 'always', 'adverb']]),
    p('then I go', [['то', 'then', 'particle'], ['я', 'I', 'pronoun'], ['иду', 'I go', 'verb']]),
  ]],
  ['выйду', [
    p("I'll go out", [['я', 'I', 'pronoun'], ['выйду', "I'll go out", 'verb']]),
    p("I'll go out there", [['я', 'I', 'pronoun'], ['выйду', "I'll go out", 'verb'], ['туда', 'there (thither)', 'adverb']]),
    p("I'll go out home", [['я', 'I', 'pronoun'], ['выйду', "I'll go out", 'verb'], ['домой', 'home (to home)', 'adverb']]),
    p("I'll go out now", [['я', 'I', 'pronoun'], ['выйду', "I'll go out", 'verb'], ['сейчас', 'now', 'adverb']]),
    p("I'll go out at night", [['я', 'I', 'pronoun'], ['выйду', "I'll go out", 'verb'], ['ночью', 'at night', 'adverb']]),
    p("I'll go out again", [['я', 'I', 'pronoun'], ['выйду', "I'll go out", 'verb'], ['опять', 'again', 'adverb']]),
    p("if I go out", [['если', 'if', 'particle'], ['я', 'I', 'pronoun'], ['выйду', "I'll go out", 'verb']]),
    p("I'll go out and go", [['я', 'I', 'pronoun'], ['выйду', "I'll go out", 'verb'], ['и', 'and', 'particle'], ['иду', 'I go', 'verb']]),
  ]],
  ['но', [
    p('but I see', [['но', 'but', 'particle'], ['я', 'I', 'pronoun'], ['вижу', 'I see', 'verb']]),
    p('but he knows', [['но', 'but', 'particle'], ['он', 'he / it', 'pronoun'], ['знает', 'knows', 'verb']]),
    p("but she's here", [['но', 'but', 'particle'], ['она', 'she', 'pronoun'], ['тут', 'here', 'adverb']]),
    p('but he goes', [['но', 'but', 'particle'], ['он', 'he / it', 'pronoun'], ['идёт', 'goes', 'verb']]),
    p('but it is good', [['но', 'but', 'particle'], ['хорошо', 'well / good', 'adverb']]),
    p('but now', [['но', 'but', 'particle'], ['сейчас', 'now', 'adverb']]),
    p('but again', [['но', 'but', 'particle'], ['опять', 'again', 'adverb']]),
    p('but not now', [['но', 'but', 'particle'], ['не', 'not', 'particle'], ['сейчас', 'now', 'adverb']]),
  ]],
  ['сам', [
    p('I myself', [['я', 'I', 'pronoun'], ['сам', 'myself', 'pronoun']]),
    p('he himself', [['он', 'he / it', 'pronoun'], ['сам', 'myself', 'pronoun']]),
    p('you yourself', [['ты', 'you (sg.)', 'pronoun'], ['сам', 'myself', 'pronoun']]),
    p('I myself am here', [['я', 'I', 'pronoun'], ['сам', 'myself', 'pronoun'], ['тут', 'here', 'adverb']]),
    p('I myself see', [['я', 'I', 'pronoun'], ['сам', 'myself', 'pronoun'], ['вижу', 'I see', 'verb']]),
    p('he himself knows', [['он', 'he / it', 'pronoun'], ['сам', 'myself', 'pronoun'], ['знает', 'knows', 'verb']]),
    p('I myself go', [['я', 'I', 'pronoun'], ['сам', 'myself', 'pronoun'], ['иду', 'I go', 'verb']]),
    p('myself, everything', [['сам', 'myself', 'pronoun'], ['всё', 'everything / all', 'pronoun']]),
  ]],
  ['ненавижу', [
    p('I hate', [['я', 'I', 'pronoun'], ['ненавижу', 'hate', 'verb']]),
    p('I hate this', [['ненавижу', 'hate', 'verb'], ['это', 'this / it is', 'pronoun']]),
    p('I hate it here', [['ненавижу', 'hate', 'verb'], ['тут', 'here', 'adverb']]),
    p('I always hate', [['ненавижу', 'hate', 'verb'], ['всегда', 'always', 'adverb']]),
    p('I hate the night', [['я', 'I', 'pronoun'], ['ненавижу', 'hate', 'verb'], ['ночь', 'night', 'noun']]),
    p('I hate the sound', [['я', 'I', 'pronoun'], ['ненавижу', 'hate', 'verb'], ['звук', 'sound', 'noun']]),
    p('I hate it again', [['ненавижу', 'hate', 'verb'], ['опять', 'again', 'adverb']]),
    p('I hate it now', [['ненавижу', 'hate', 'verb'], ['сейчас', 'now', 'adverb']]),
  ]],
  ['внутри', [
    p("he's inside", [['он', 'he / it', 'pronoun'], ['внутри', 'inside', 'adverb']]),
    p("I'm inside", [['я', 'I', 'pronoun'], ['внутри', 'inside', 'adverb']]),
    p("we're inside", [['мы', 'we', 'pronoun'], ['внутри', 'inside', 'adverb']]),
    p("it's dark inside", [['внутри', 'inside', 'adverb'], ['темно', 'it is dark', 'adverb']]),
    p("it's good inside", [['внутри', 'inside', 'adverb'], ['хорошо', 'well / good', 'adverb']]),
    p('inside again', [['внутри', 'inside', 'adverb'], ['опять', 'again', 'adverb']]),
    p('inside and here', [['внутри', 'inside', 'adverb'], ['и', 'and', 'particle'], ['тут', 'here', 'adverb']]),
    p('lives inside', [['живёт', 'lives', 'verb'], ['внутри', 'inside', 'adverb']]),
  ]],
  ['значит', [
    p('so he is here', [['значит', 'so/means', 'particle'], ['он', 'he / it', 'pronoun'], ['тут', 'here', 'adverb']]),
    p('so I know', [['значит', 'so/means', 'particle'], ['я', 'I', 'pronoun'], ['знаю', 'I know', 'verb']]),
    p('so everything', [['значит', 'so/means', 'particle'], ['всё', 'everything / all', 'pronoun']]),
    p('so it is good', [['значит', 'so/means', 'particle'], ['хорошо', 'well / good', 'adverb']]),
    p('so again', [['значит', 'so/means', 'particle'], ['опять', 'again', 'adverb']]),
    p('so together', [['значит', 'so/means', 'particle'], ['вместе', 'together', 'adverb']]),
    p('so I go', [['значит', 'so/means', 'particle'], ['я', 'I', 'pronoun'], ['иду', 'I go', 'verb']]),
    p('so now', [['значит', 'so/means', 'particle'], ['сейчас', 'now', 'adverb']]),
  ]],
  ['его', [
    p('I see him', [['вижу', 'I see', 'verb'], ['его', 'him', 'pronoun']]),
    p('I know him', [['знаю', 'I know', 'verb'], ['его', 'him', 'pronoun']]),
    p('he knows him', [['он', 'he / it', 'pronoun'], ['его', 'him', 'pronoun'], ['знает', 'knows', 'verb']]),
    p('I love him', [['я', 'I', 'pronoun'], ['его', 'him', 'pronoun'], ['люблю', 'I love', 'verb']]),
    p('he sees him', [['он', 'he / it', 'pronoun'], ['его', 'him', 'pronoun'], ['видит', 'sees', 'verb']]),
    p('he loves him', [['он', 'he / it', 'pronoun'], ['его', 'him', 'pronoun'], ['любит', 'loves', 'verb']]),
    p('this is him', [['это', 'this / it is', 'pronoun'], ['его', 'him', 'pronoun']]),
    p('I see him here', [['я', 'I', 'pronoun'], ['его', 'him', 'pronoun'], ['вижу', 'I see', 'verb'], ['тут', 'here', 'adverb']]),
  ]],
  ['убью', [
    p("I'll kill", [['я', 'I', 'pronoun'], ['убью', "I'll kill", 'verb']]),
    p("I'll kill him", [['я', 'I', 'pronoun'], ['убью', "I'll kill", 'verb'], ['его', 'him', 'pronoun']]),
    p("I myself will kill", [['я', 'I', 'pronoun'], ['сам', 'myself', 'pronoun'], ['убью', "I'll kill", 'verb']]),
    p("I'll kill now", [['я', 'I', 'pronoun'], ['убью', "I'll kill", 'verb'], ['сейчас', 'now', 'adverb']]),
    p("I'll kill at night", [['я', 'I', 'pronoun'], ['убью', "I'll kill", 'verb'], ['ночью', 'at night', 'adverb']]),
    p("I'll kill again", [['я', 'I', 'pronoun'], ['убью', "I'll kill", 'verb'], ['опять', 'again', 'adverb']]),
    p("if I kill", [['если', 'if', 'particle'], ['я', 'I', 'pronoun'], ['убью', "I'll kill", 'verb']]),
    p("I'll kill and go", [['я', 'I', 'pronoun'], ['убью', "I'll kill", 'verb'], ['и', 'and', 'particle'], ['иду', 'I go', 'verb']]),
  ]],
]);
