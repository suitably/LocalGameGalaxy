import { storage, STORAGE_KEYS } from '../../../lib/storage';
import type { StageEngine } from './engine/StageEngine';

/** The stage's stored drum lane options (percussion judged or display-only, #571). */
export function loadDrumOptions<E extends StageEngine>(engine: E): E {
  const judgePercussion = storage.get(STORAGE_KEYS.MELODIQ_NOTES_JUDGE_PERCUSSION) === '1';
  engine.drumOptions = { ...engine.drumOptions, judgePercussion };
  return engine;
}

/** Judges the percussion lane from now on (or makes it display-only again) and remembers it. */
export function setJudgePercussion(engine: StageEngine, on: boolean) {
  storage.set(STORAGE_KEYS.MELODIQ_NOTES_JUDGE_PERCUSSION, on ? '1' : '0');
  if (on === engine.drumOptions.judgePercussion) return;
  engine.drumOptions = { ...engine.drumOptions, judgePercussion: on };
  engine.reset(); // a new chart: the round starts over
}
