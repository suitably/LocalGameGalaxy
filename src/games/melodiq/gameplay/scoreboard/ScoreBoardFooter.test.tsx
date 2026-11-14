import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ScoreBoardFooter } from './ScoreBoardFooter';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const base = {
  queueLength: 2,
  nextTitle: 'Next Song',
  countdown: null,
  onExit: () => {},
  onCancelAutoPlay: () => {},
};

describe('ScoreBoardFooter', () => {
  it('offers no continue or next to a passive phone, only the main menu', () => {
    const html = renderToString(<ScoreBoardFooter {...base} isPassive onMainMenu={() => {}} />);
    expect(html).toContain('melodiq.scoreboard_waiting_host');
    expect(html).toContain('melodiq.scoreboard_main_menu');
    expect(html).not.toContain('NEXT');
    expect(html).not.toContain('CONTINUE');
  });

  it('shows no main menu button on a passive screen without one (TV)', () => {
    const html = renderToString(<ScoreBoardFooter {...base} isPassive />);
    expect(html).not.toContain('melodiq.scoreboard_main_menu');
  });

  it('lets the host continue to the next song', () => {
    const html = renderToString(<ScoreBoardFooter {...base} />);
    expect(html).toContain('NEXT: NEXT SONG');
  });
});
