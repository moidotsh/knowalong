// utils/knowalong/fixtures/sampleSong.ts
// Prototype song + CLCC analysis result — mock data for the lyric-learning
// feature. Each section (verse/chorus/bridge) carries its lines + the
// CLCCs identified in those lines + which the learner knows. The consumer
// app renders this as an interactive section-by-section lesson. When the
// real analysis pipeline is wired, this fixture is replaced by the
// analysis_proposals → section → CLCC mapping.

export interface LyricLine {
  ordinal: number;
  text: string;
  translation: string;
  concepts: string[]; // concept codes present in this line
}

export interface SongSection {
  id: string;
  kind: 'verse' | 'chorus' | 'bridge';
  label: string;
  lines: LyricLine[];
  /** All concept codes in this section. */
  allConcepts: string[];
  /** Concepts the learner already knows (from their progress). */
  knownConcepts: string[];
  /** Concepts that are NEW to the learner in this section. */
  newConcepts: string[];
}

export const SAMPLE_SONG: {
  title: string;
  artist: string;
  language: string;
  sections: SongSection[];
} = {
  title: 'Sample Song',
  artist: 'KnowAlong Demo',
  language: 'ru',
  sections: [
    {
      id: 'verse-1',
      kind: 'verse',
      label: 'Verse 1',
      lines: [
        { ordinal: 1, text: 'Я вижу море.', translation: 'I see the sea.', concepts: ['1', '2', '9'] },
        { ordinal: 2, text: 'Я не знаю, куда иду.', translation: "I don't know where I'm going.", concepts: ['1', '8', '5'] },
        { ordinal: 3, text: 'Но я хочу жить.', translation: 'But I want to live.', concepts: ['1', '4', '6'] },
      ],
      allConcepts: ['1', '2', '5', '4', '6', '8', '9'],
      knownConcepts: ['1', '2', '3'],
      newConcepts: ['5', '4', '6', '8', '9'],
    },
    {
      id: 'chorus',
      kind: 'chorus',
      label: 'Chorus',
      lines: [
        { ordinal: 4, text: 'Мне нравится этот мир.', translation: 'I like this world.', concepts: ['7'] },
        { ordinal: 5, text: 'Я знаю ответ.', translation: 'I know the answer.', concepts: ['1', '3'] },
      ],
      allConcepts: ['1', '3', '7'],
      knownConcepts: ['1', '2', '3'],
      newConcepts: ['7'],
    },
    {
      id: 'bridge',
      kind: 'bridge',
      label: 'Bridge',
      lines: [
        { ordinal: 6, text: 'Я хочу чай.', translation: 'I want tea.', concepts: ['1', '4', '10'] },
        { ordinal: 7, text: 'Я живу здесь.', translation: 'I live here.', concepts: ['1', '6'] },
      ],
      allConcepts: ['1', '4', '6', '10'],
      knownConcepts: ['1', '2', '3'],
      newConcepts: ['4', '6', '10'],
    },
  ],
};
