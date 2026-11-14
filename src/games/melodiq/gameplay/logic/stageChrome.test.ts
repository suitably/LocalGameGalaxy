import { describe, expect, it } from 'vitest';
import { stageTapAction, type StageTap } from './stageChrome';

const tap = (over: Partial<StageTap> = {}): StageTap => ({
  visible: true,
  isPlaying: true,
  onControl: false,
  byMouse: false,
  ...over,
});

describe('stageTapAction', () => {
  it('toggles on a touch on the bare stage while playing', () => {
    expect(stageTapAction(tap())).toBe('hide');
    expect(stageTapAction(tap({ visible: false }))).toBe('show');
  });

  it('never hides while paused, on a control or by mouse', () => {
    expect(stageTapAction(tap({ isPlaying: false }))).toBe('show');
    expect(stageTapAction(tap({ onControl: true }))).toBe('show');
    expect(stageTapAction(tap({ byMouse: true }))).toBe('show');
  });
});
