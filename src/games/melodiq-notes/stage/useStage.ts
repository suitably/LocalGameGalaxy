import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { StageEngine } from './engine/StageEngine';
import { BrowserStageSound } from './engine/browserSound';
import type { StageTexts } from './render/common';

const MAX_FRAME_SEC = 0.05;
/** How strongly the smooth frame clock is pulled towards the audio clock each frame. */
const CLOCK_PULL = 0.05;
/** Beyond this the audio clock jumped (suspended, tab in background): follow it at once. */
const CLOCK_SNAP_SEC = 0.1;
/** The progress bar moves smoothly enough at this rate; everything else is drawn on the canvas. */
const PROGRESS_REFRESH_MS = 250;

/**
 * One engine and one audio context per mounted stage; the engine advances on the audio clock
 * every frame. A pult passes its own engine (`create`), which follows the stage's clock instead.
 */
export function useStage<E extends StageEngine = StageEngine>(
  create: () => E = () => new StageEngine() as E,
) {
  const [engine] = useState(create);
  const soundRef = useRef<BrowserStageSound | null>(null);
  const version = useSyncExternalStore(engine.subscribe, engine.getVersion);

  useEffect(() => {
    const sound = new BrowserStageSound();
    soundRef.current = sound;
    engine.attachSound(sound);
    // The audio clock advances in blocks (10–40 ms on many phones), which makes falling notes
    // stutter. Time runs on the smooth frame clock instead and is pulled towards the audio clock.
    let clock = sound.now();
    let lastFrame = performance.now();
    let lastNotify = 0;
    let lastBeat = engine.beat;
    let raf = 0;
    const loop = () => {
      const frameNow = performance.now();
      const audioNow = sound.now();
      let next = clock + (frameNow - lastFrame) / 1000;
      lastFrame = frameNow;
      const drift = audioNow - next;
      next = Math.abs(drift) > CLOCK_SNAP_SEC ? audioNow : next + drift * CLOCK_PULL;
      engine.tick(Math.min(MAX_FRAME_SEC, Math.max(0, next - clock)));
      clock = Math.max(clock, next);
      if (
        engine.state === 'playing' &&
        engine.beat !== lastBeat &&
        performance.now() - lastNotify > PROGRESS_REFRESH_MS
      ) {
        lastNotify = performance.now();
        lastBeat = engine.beat;
        engine.notifyLive();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      engine.reset();
      engine.attachSound(null);
      soundRef.current = null;
      sound.close();
    };
  }, [engine]);

  /** Audio may only start from a user gesture; call before start or play. */
  const unlockAudio = useCallback(() => soundRef.current?.resume(), []);

  return { engine, version, unlockAudio };
}

/** Re-renders the calling component with the engine's live progress (see `StageEngine.subscribeLive`). */
export function useStageLive(engine: StageEngine) {
  return useSyncExternalStore(engine.subscribeLive, engine.getLiveVersion);
}

/** Remembers a label per key: the renderer asks for the same few labels every frame. */
function cached<K, V>(make: (key: K) => V): (key: K) => V {
  const seen = new Map<K, V>();
  return (key) => {
    if (!seen.has(key)) seen.set(key, make(key));
    return seen.get(key) as V;
  };
}

/** Localised words for the canvas renderer. */
export function useStageTexts(): StageTexts {
  const { t, i18n } = useTranslation();
  return useMemo(
    () => ({
      player: cached((no) => t('games.melodiq_notes.stage.player', { no })),
      keyboardFocus: t('games.melodiq_notes.stage.keyboard_focus'),
      instrument: cached((kind) => t(`games.melodiq_notes.stage.instruments.${kind}`)),
      drum: cached((id) => t(`games.melodiq_notes.stage.drums.${id}`)),
      nextGrip: t('games.melodiq_notes.stage.next_grip'),
      fromFret: cached((fret) => t('games.melodiq_notes.stage.from_fret', { fret })),
      judgement: {
        perfect: t('games.melodiq_notes.stage.judgement.perfect'),
        good: t('games.melodiq_notes.stage.judgement.good'),
        miss: t('games.melodiq_notes.stage.judgement.miss'),
        learn: t('games.melodiq_notes.stage.judgement.learn'),
        wrong: t('games.melodiq_notes.stage.judgement.wrong'),
      },
      combo: t('games.melodiq_notes.stage.combo'),
      noPlayers: t('games.melodiq_notes.stage.no_players'),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- texts change with the language only
    [t, i18n.language],
  );
}
