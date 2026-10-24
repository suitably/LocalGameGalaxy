import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyBarMarksToMusicXml,
  type AlignProgress,
  type AlignResult,
  type BarMark,
  nearestBar,
  pinBar,
  type ScoreSong,
} from '../../../modules/music-score';
import {
  companionUrl,
  fetchCompanionFile,
  getBarMarks,
  saveBarMarks,
  type CompanionScore,
  type CompanionSong,
} from '../../../lib/companion/songScoresApi';
import { alignRecordingInBrowser, createElementRecording } from './engine/browserRecording';
import type { StageEngine } from './engine/StageEngine';
import {
  browserXml,
  downloadText,
  readMusicXmlText,
  readScoreFile,
  serializeXml,
} from './loadScore';

export type SongOrigin =
  | { kind: 'example'; title: string }
  | { kind: 'file'; title: string }
  | { kind: 'server'; title: string; songId: string; scoreFile: string };

export interface RecordingSource {
  name: string;
  url: string;
  /** Local file (object URL) or server media; local files are released when replaced. */
  local: boolean;
}

export type AlignState =
  | { kind: 'none' }
  | { kind: 'running'; stage: Parameters<AlignProgress>[0]; fraction: number }
  /** `tuning` is known only right after aligning, not for marks loaded from the server. */
  | { kind: 'done'; tuning?: AlignResult['tuning'] }
  | { kind: 'failed'; error: string };

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Which song is on the stage, where it came from, and the recording that plays with it. */
export function useStageSong(engine: StageEngine, initial: { title: string; xml: string }) {
  // the first song is on stage from the first render (loading it again is harmless)
  const [first] = useState(() => {
    const loaded = readMusicXmlText(initial.xml, initial.title);
    engine.loadSong(loaded.song);
    return loaded;
  });
  const [song, setSong] = useState<ScoreSong | null>(first.song);
  const [xml, setXml] = useState<string | null>(first.xml);
  const [origin, setOrigin] = useState<SongOrigin | null>({
    kind: 'example',
    title: initial.title,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState<RecordingSource | null>(null);
  const [marks, setMarks] = useState<BarMark[] | null>(null);
  // bars placed by hand (indices into marks); cleared whenever the marks are replaced
  const [pins, setPins] = useState<number[]>([]);
  const [offset, setOffset] = useState(0);
  const [align, setAlign] = useState<AlignState>({ kind: 'none' });
  const [saved, setSaved] = useState(false);
  const replaceMarks = useCallback((next: BarMark[] | null) => {
    setMarks(next);
    setPins([]);
  }, []);
  // bumped whenever the song or the recording changes; async results for an older one are dropped
  const generation = useRef(0);

  const show = useCallback(
    (next: ScoreSong, nextXml: string | null, nextOrigin: SongOrigin) => {
      generation.current++;
      engine.loadSong(next);
      setSong(next);
      setXml(nextXml);
      setOrigin(nextOrigin);
      setError(null);
      replaceMarks(null);
      setOffset(0);
      setAlign({ kind: 'none' });
      setSaved(false);
    },
    [engine, replaceMarks],
  );

  const replaceRecording = useCallback((next: RecordingSource | null) => {
    setRecording((prev) => {
      if (prev?.local && prev.url !== next?.url) URL.revokeObjectURL(prev.url);
      return next;
    });
  }, []);

  /** Runs a load; resolves to whether it worked (the error is kept for display otherwise). */
  const run = useCallback(async (task: () => Promise<void>) => {
    setLoading(true);
    try {
      await task();
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadExample = useCallback(
    (title: string, xmlText: string) =>
      run(async () => {
        const loaded = readMusicXmlText(xmlText, title);
        show(loaded.song, loaded.xml, { kind: 'example', title });
        replaceRecording(null);
      }),
    [run, show, replaceRecording],
  );

  const loadFile = useCallback(
    (file: File) =>
      run(async () => {
        const loaded = readScoreFile(file.name, await file.arrayBuffer());
        show(loaded.song, loaded.xml, { kind: 'file', title: loaded.song.title });
        replaceRecording(null);
      }),
    [run, show, replaceRecording],
  );

  const loadServerScore = useCallback(
    (entry: CompanionSong, score: CompanionScore) =>
      run(async () => {
        if (!score.url) throw new Error('missing url');
        const loaded = readScoreFile(score.file, await fetchCompanionFile(score.url));
        loaded.song.title = entry.title;
        loaded.song.artist = entry.artist;
        show(loaded.song, loaded.xml, {
          kind: 'server',
          title: entry.title,
          songId: entry.id,
          scoreFile: score.file,
        });
        const audio = entry.originalAudio ?? entry.audio;
        replaceRecording(
          audio ? { name: entry.title, url: companionUrl(audio), local: false } : null,
        );
        const loadedAs = generation.current;
        const stored = score.hasMarks ? await getBarMarks(entry.id, score.file) : null;
        if (stored && loadedAs === generation.current) {
          replaceMarks(stored.marks);
          setOffset(stored.offsetSec);
          setAlign({ kind: 'done' });
          setSaved(true);
        }
      }),
    [run, show, replaceRecording, replaceMarks],
  );

  const setRecordingFile = useCallback(
    (file: File) => {
      generation.current++;
      replaceRecording({ name: file.name, url: URL.createObjectURL(file), local: true });
      replaceMarks(null);
      setOffset(0);
      setAlign({ kind: 'none' });
      setSaved(false);
    },
    [replaceRecording, replaceMarks],
  );

  // the engine follows song, recording and its mapping
  useEffect(() => {
    if (!song || !recording) {
      engine.setRecording(null);
      return;
    }
    const rec = createElementRecording(recording.url, song, marks, offset);
    engine.setRecording(rec);
    return () => {
      rec.pause();
      rec.element.removeAttribute('src');
    };
  }, [engine, song, recording, marks, offset]);

  const alignNow = useCallback(async () => {
    if (!song || !recording) return;
    const startedAs = generation.current;
    const current = () => startedAs === generation.current;
    setAlign({ kind: 'running', stage: 'analyse', fraction: 0 });
    try {
      const data = await (await fetch(recording.url)).arrayBuffer();
      const result = await alignRecordingInBrowser(data, song, (stage, fraction) => {
        if (current()) setAlign({ kind: 'running', stage, fraction });
      });
      if (!current()) return;
      replaceMarks(result.marks);
      setOffset(0);
      setSaved(false);
      setAlign({ kind: 'done', tuning: result.tuning });
    } catch (e) {
      if (current()) setAlign({ kind: 'failed', error: errorText(e) });
    }
  }, [song, recording, replaceMarks]);

  const saveMarks = useCallback(async () => {
    if (origin?.kind !== 'server' || !marks) return;
    try {
      await saveBarMarks(origin.songId, origin.scoreFile, {
        marks,
        offsetSec: offset,
        audio: recording?.name ?? null,
      });
      setSaved(true);
    } catch (e) {
      setError(errorText(e));
    }
  }, [origin, marks, offset, recording]);

  const exportScore = useCallback(() => {
    if (!song || !xml || !marks) return;
    const shifted = marks.map((m) => ({ ...m, sec: m.sec + offset }));
    const out = applyBarMarksToMusicXml(xml, song, shifted, browserXml, serializeXml);
    downloadText(
      `${song.title || 'score'}.musicxml`,
      out,
      'application/vnd.recordare.musicxml+xml',
    );
  }, [song, xml, marks, offset]);

  /** Moves the bar line nearest to what the recording plays now onto this moment and pins it. */
  const pinBarNow = useCallback(() => {
    const now = engine.recording?.time();
    if (!marks || now === undefined) return;
    const sec = now - offset;
    const next = pinBar(marks, pins, nearestBar(marks, sec), sec);
    if (!next) return;
    setMarks(next.marks);
    setPins(next.pins);
    setSaved(false);
  }, [engine, marks, pins, offset]);

  const nudge = useCallback((deltaSec: number) => {
    setOffset((o) => Math.round((o + deltaSec) * 100) / 100);
    setSaved(false);
  }, []);

  return {
    song,
    origin,
    error,
    loading,
    recording,
    marks,
    pins,
    offset,
    align,
    saved,
    canExport: !!xml && !!marks,
    loadExample,
    loadFile,
    loadServerScore,
    setRecordingFile,
    alignNow,
    saveMarks,
    exportScore,
    nudge,
    pinBarNow,
    clearError: () => setError(null),
  };
}

export type StageSongState = ReturnType<typeof useStageSong>;
