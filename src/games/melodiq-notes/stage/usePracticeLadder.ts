/**
 * Drives the guided practice of weak bars (#638) on the engine: loops each weak bar, raises the
 * speed a step (75 → 100 %) after three good passes and pauses with a congratulation once a bar is
 * done. Picking another bar, the mode or the loop by hand ends it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StageEngine } from './engine/StageEngine';
import { sectionScore } from './logic/judging';
import { practiseBars, stopPractising } from './engine/transport';
import {
  afterPass,
  ladderBar,
  ladderSpeed,
  nextBar,
  passScore,
  startLadder,
  type Ladder,
} from './logic/practiceLadder';

export type LadderPhase = 'running' | 'bar_done' | 'all_done';

export interface LadderState {
  ladder: Ladder;
  phase: LadderPhase;
}

const lastOf = (engine: StageEngine, bar: number) => Math.min(bar + 1, engine.sections.length - 1);

export function usePracticeLadder(engine: StageEngine, start: () => void) {
  const [state, setState] = useState<LadderState | null>(null);
  const ref = useRef(state);
  useEffect(() => {
    ref.current = state;
  }, [state]);

  const play = useCallback(
    (ladder: Ladder) => {
      const bar = ladderBar(ladder);
      practiseBars(engine, bar, lastOf(engine, bar));
      engine.setSpeed(ladderSpeed(ladder));
      setState({ ladder, phase: 'running' });
      start();
    },
    [engine, start],
  );

  /** From the results: the picked bar first, then the other weak ones. */
  const begin = useCallback(
    (bar: number) => {
      const sections = engine.focus?.stats.sections ?? [];
      const ladder = startLadder(sections.map(sectionScore), bar);
      if (ladder) play(ladder);
    },
    [engine, play],
  );

  const next = useCallback(() => {
    const current = ref.current;
    const following = current && nextBar(current.ladder);
    if (following) play(following);
    else if (current) setState({ ...current, phase: 'all_done' });
  }, [play]);

  /** All bars done: the whole song in practice mode at 50 %. */
  const wholeSong = useCallback(() => {
    setState(null);
    engine.setLoop(null);
    engine.setMode('practice');
    engine.setSpeed(0.5);
    engine.reset();
    start();
  }, [engine, start]);

  /** "Stop guided practice" and the chip's ×: ends the practice and its loop (#664). */
  const stop = useCallback(() => {
    setState(null);
    stopPractising(engine);
  }, [engine]);

  useEffect(() => {
    const onLoopPass = (e: StageEngine) => {
      const current = ref.current;
      if (!current || current.phase !== 'running' || !e.focus || !e.loop) return;
      const bar = ladderBar(current.ladder);
      // the loop was changed by hand: the guided practice ends
      if (e.mode !== 'practice' || e.sectionAt(e.loop.from) !== bar) {
        setState(null);
        return;
      }
      const result = afterPass(
        current.ladder,
        passScore(e.focus.stats.sections, bar, lastOf(e, bar)),
      );
      if (result.outcome === 'faster') e.setSpeed(ladderSpeed(result.ladder));
      if (result.outcome === 'bar_done') e.pause();
      const phase = result.outcome === 'bar_done' ? 'bar_done' : 'running';
      ref.current = { ladder: result.ladder, phase };
      setState(ref.current);
    };
    engine.configureInput({ onLoopPass });
    return () => engine.configureInput({ onLoopPass: null });
  }, [engine]);

  return { state, begin, next, wholeSong, stop };
}
