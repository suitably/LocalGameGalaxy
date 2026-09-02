import { describe, it, expect } from 'vitest';
import { wordleEngine } from './wordleEngine';

describe('wordleEngine', () => {
  it('evaluates exact match correctly', () => {
    const result = wordleEngine.evaluateGuess('APFEL', 'APFEL');
    expect(result.every((r) => r.status === 'correct')).toBe(true);
  });

  it('evaluates absent letters correctly', () => {
    const result = wordleEngine.evaluateGuess('STURM', 'APFEL');
    expect(result.every((r) => r.status === 'absent')).toBe(true);
  });

  it('handles duplicate letters in guess correctly when target has only one occurrence', () => {
    // Target has 1 'E', guess has 2 'E's
    const result = wordleEngine.evaluateGuess('FEUER', 'BLUME');
    // First 'E' in FEUER is at index 1 -> target BLUME has 'E' at index 4 (present)
    // Second 'E' in FEUER is at index 3 -> should be 'absent' because target only has 1 'E'
    expect(result[1].status).toBe('present');
    expect(result[3].status).toBe('absent');
  });

  it('handles duplicate letters in target correctly', () => {
    // Target SPEED has 2 'E's (index 2 and 3)
    const result = wordleEngine.evaluateGuess('ERASE', 'SPEED');
    // Index 0 ('E'): present (matches index 2 or 3 in target)
    // Index 4 ('E'): correct (matches index 4? No, SPEED has 'E' at 2, 3 and 'D' at 4 -> present)
    expect(result.filter((r) => r.char === 'E' && (r.status === 'present' || r.status === 'correct')).length).toBe(2);
  });

  it('generates consistent deterministic daily words for the same date', () => {
    const word1 = wordleEngine.getDailyTargetWord('de', '2026-09-02');
    const word2 = wordleEngine.getDailyTargetWord('de', '2026-09-02');
    const wordNextDay = wordleEngine.getDailyTargetWord('de', '2026-09-03');

    expect(word1).toBe(word2);
    expect(typeof word1).toBe('string');
    expect(word1.length).toBe(5);
    expect(typeof wordNextDay).toBe('string');
    expect(wordNextDay.length).toBe(5);
  });

  it('encodes and decodes custom duel words correctly', () => {
    const original = 'TIGER';
    const encoded = wordleEngine.encodeDuelWord(original);
    expect(encoded).toBeDefined();

    const decoded = wordleEngine.decodeDuelWord(encoded);
    expect(decoded).toBe(original);
  });

  it('updates stats correctly on win and loss', () => {
    const initial = wordleEngine.getInitialStats();
    const win1 = wordleEngine.updateStats(initial, true, 4, '2026-09-02');
    expect(win1.played).toBe(1);
    expect(win1.wins).toBe(1);
    expect(win1.currentStreak).toBe(1);
    expect(win1.maxStreak).toBe(1);
    expect(win1.guessDistribution[4]).toBe(1);

    // Another win in 3 tries
    const win2 = wordleEngine.updateStats(win1, true, 3, '2026-09-03');
    expect(win2.played).toBe(2);
    expect(win2.wins).toBe(2);
    expect(win2.currentStreak).toBe(2);
    expect(win2.maxStreak).toBe(2);
    expect(win2.guessDistribution[3]).toBe(1);

    // A loss resets current streak
    const loss = wordleEngine.updateStats(win2, false, 6, '2026-09-04');
    expect(loss.played).toBe(3);
    expect(loss.wins).toBe(2);
    expect(loss.currentStreak).toBe(0);
    expect(loss.maxStreak).toBe(2);
  });

  it('generates valid emoji share grid', () => {
    const evaluations = [
      [
        { char: 'A', status: 'correct' as const },
        { char: 'B', status: 'present' as const },
        { char: 'C', status: 'absent' as const },
        { char: 'D', status: 'absent' as const },
        { char: 'E', status: 'correct' as const },
      ],
    ];

    const shareText = wordleEngine.generateShareGrid(evaluations, true, 'daily', '2026-09-02');
    expect(shareText).toContain('🟩🟨⬛⬛🟩');
    expect(shareText).toContain('1/6');
  });
});
