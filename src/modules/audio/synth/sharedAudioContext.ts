declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let sharedCtx: AudioContext | null = null;

/** The one AudioContext used by the shared synth (previews, calibration beeps); created on first use. */
export function getSharedAudioContext(): AudioContext | null {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    sharedCtx = AudioCtx ? new AudioCtx() : null;
  }
  if (sharedCtx && sharedCtx.state === 'suspended') void sharedCtx.resume();
  return sharedCtx;
}
