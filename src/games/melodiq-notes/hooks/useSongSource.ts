import { useCallback, useMemo, useState } from 'react';
import { DEMO_SONGS } from '../demoSongs';
import { resolveSongSource, type SongSource } from '../logic/songSource';
import { extractPartsFromXml } from '../logic/musicXmlParser';
import { computeEffectiveBpm } from '../logic/playbackTiming';
import type { ScorePartInfo } from '../types';

/** The loaded song, its parts and its tempo (score BPM, overridable by OSMD detection). */
export const useSongSource = (speedPercent: number) => {
  const [source, setSource] = useState<SongSource>({ kind: 'demo', song: DEMO_SONGS[0] });
  const resolved = useMemo(() => resolveSongSource(source), [source]);
  const [baseBpm, setBaseBpm] = useState<number>(resolved.baseBpm);

  const parts = useMemo<ScorePartInfo[]>(
    () => extractPartsFromXml(resolved.xmlContent),
    [resolved.xmlContent],
  );
  const effectiveBpm = computeEffectiveBpm(baseBpm, speedPercent);

  const loadSource = useCallback((next: SongSource) => {
    setSource(next);
    setBaseBpm(resolveSongSource(next).baseBpm);
  }, []);

  const handleBpmDetected = useCallback((bpm: number) => {
    if (bpm > 0) setBaseBpm(bpm);
  }, []);

  return { source, resolved, parts, effectiveBpm, loadSource, handleBpmDetected };
};
