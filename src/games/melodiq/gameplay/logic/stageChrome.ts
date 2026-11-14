/** Like a video player: controls leave shortly after the last interaction. */
export const STAGE_CHROME_HIDE_MS = 3500;

/**
 * TV: nobody can bring the header back, and it is read from ~3 m, so the title card at song
 * start stays longer before the video and lyrics own the screen.
 */
export const TV_STAGE_CHROME_HIDE_MS = 8000;

export interface StageTap {
  visible: boolean;
  isPlaying: boolean;
  /** The tap hit a button or another control on the stage. */
  onControl: boolean;
  /** A mouse click; moving the mouse shows the chrome anyway, so a click never hides it. */
  byMouse: boolean;
}

/**
 * What a tap on the stage does to the chrome (header, transport buttons): a touch on the bare
 * stage hides it while the song plays, everything else shows it (and restarts the hide timer).
 */
export const stageTapAction = (tap: StageTap): 'show' | 'hide' =>
  tap.visible && tap.isPlaying && !tap.onControl && !tap.byMouse ? 'hide' : 'show';
