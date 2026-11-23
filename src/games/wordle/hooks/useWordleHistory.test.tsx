import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/storage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/storage')>()),
  storage: {
    findKeysWithPrefix: (prefix: string) => [
      `${prefix}2026-01-02`,
      `${prefix}2026-01-03`,
      `${prefix}broken`,
    ],
    getJson: () => ({ guesses: ['crane'], evaluations: [], status: 'won' }),
  },
}));
vi.mock('../logic/wordleEngine', () => ({
  wordleEngine: { getDailyTargetWord: () => 'crane' },
}));

import { useWordleHistory } from './useWordleHistory';

describe('useWordleHistory', () => {
  it('has the saved days (newest first) on the first render', () => {
    const Probe = () => {
      const { history } = useWordleHistory('en');
      return <i data-days={history.map((h) => `${h.dateKey}:${h.status}`).join(',')} />;
    };
    expect(renderToString(<Probe />)).toContain('data-days="2026-01-03:won,2026-01-02:won"');
  });
});
