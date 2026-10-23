import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { StageEngine } from './engine/StageEngine';
import { BrowserStageSound } from './engine/browserSound';
import type { StageTexts } from './render/common';

const MAX_FRAME_SEC = 0.05;
const UI_REFRESH_MS = 100;

/** One engine and one audio context per mounted stage; the engine advances on the audio clock every frame. */
export function useStage() {
  const [engine] = useState(() => new StageEngine());
  const soundRef = useRef<BrowserStageSound | null>(null);
  const version = useSyncExternalStore(engine.subscribe, engine.getVersion);

  useEffect(() => {
    const sound = new BrowserStageSound();
    soundRef.current = sound;
    engine.attachSound(sound);
    let last = sound.now();
    let lastNotify = 0;
    let raf = 0;
    const loop = () => {
      const now = sound.now();
      engine.tick(Math.min(MAX_FRAME_SEC, Math.max(0, now - last)));
      last = now;
      if (engine.state === 'playing' && performance.now() - lastNotify > UI_REFRESH_MS) {
        lastNotify = performance.now();
        engine.notify();
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

/** Localised words for the canvas renderer. */
export function useStageTexts(): StageTexts {
  const { t, i18n } = useTranslation();
  return useMemo(
    () => ({
      player: (no) => t('games.melodiq_notes.stage.player', { no }),
      keyboardFocus: t('games.melodiq_notes.stage.keyboard_focus'),
      instrument: (kind) => t(`games.melodiq_notes.stage.instruments.${kind}`),
      drum: (id) => t(`games.melodiq_notes.stage.drums.${id}`),
      nextGrip: t('games.melodiq_notes.stage.next_grip'),
      fromFret: (fret) => t('games.melodiq_notes.stage.from_fret', { fret }),
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
