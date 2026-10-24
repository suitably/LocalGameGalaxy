import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyBarMarksToMusicXml,
  type AlignProgress,
  type BarMark,
  type ScoreSong,
} from '../../../modules/music-score';
import {
  companionUrl,
  fetchCompanionFile,
  getBarMarks,
  isCompanionEnabled,
  type CompanionScore,
  type CompanionSong,
} from '../../../lib/companion/songScoresApi';
import {
  getNotesMarks,
  type NotesPiece,
  type NotesPieceScore,
} from '../../../lib/companion/notesLibraryApi';
import { saveStageToServer } from './logic/notesLibrarySync';
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
  | { kind: 'server'; title: string; songId: string; scoreFile: string }
  | { kind: 'notes'; title: string; pieceId: string; scoreFile: string };

export interface RecordingSource {
  name: string;
  url: string;
  /** Local file (object URL) or server media; local files are released when replaced. */
  local: boolean;
  /** A local recording that is not in the Notes library yet. */
  file?: File;
}

export type AlignState =
  | { kind: 'none' }
  | { kind: 'running'; stage: Parameters<AlignProgress>[0]; fraction: number }
  | { kind: 'done' }
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
  const [offset, setOffset] = useState(0);
  const [align, setAlign] = useState<AlignState>({ kind: 'none' });
  const [saved, setSaved] = useState(false);
  // the score file as opened, so the library gets the original (.mxl, .mid) rather than a copy
  const openedFile = useRef<File | null>(null);
  // bumped whenever the song or the recording changes; async results for an older one are dropped
  const generation = useRef(0);

  const show = useCallback(
    (next: ScoreSong, nextXml: string | null, nextOrigin: SongOrigin) => {
      generation.current++;
      openedFile.current = null;
      engine.loadSong(next);
      setSong(next);
      setXml(nextXml);
      setOrigin(nextOrigin);
      setError(null);
      setMarks(null);
      setOffset(0);
      setAlign({ kind: 'none' });
      setSaved(false);
    },
    [engine],
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
        openedFile.current = file;
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
          setMarks(stored.marks);
          setOffset(stored.offsetSec);
          setAlign({ kind: 'done' });
          setSaved(true);
        }
      }),
    [run, show, replaceRecording],
  );

  const loadNotesPiece = useCallback(
    (piece: NotesPiece, score: NotesPieceScore) =>
      run(async () => {
        const loaded = readScoreFile(score.file, await fetchCompanionFile(score.url));
        loaded.song.title = piece.title;
        loaded.song.artist = piece.artist;
        show(loaded.song, loaded.xml, {
          kind: 'notes',
          title: piece.title,
          pieceId: piece.id,
          scoreFile: score.file,
        });
        const loadedAs = generation.current;
        const stored = score.hasMarks ? await getNotesMarks(piece.id, score.file) : null;
        if (loadedAs !== generation.current) return;
        const audio =
          piece.recordings.find((r) => r.file === stored?.audio) ?? piece.recordings[0] ?? null;
        replaceRecording(
          audio ? { name: audio.file, url: companionUrl(audio.url), local: false } : null,
        );
        // straight from the library: nothing to save until something changes
        setSaved(true);
        if (stored && audio?.file === stored.audio) {
          setMarks(stored.marks);
          setOffset(stored.offsetSec);
          setAlign({ kind: 'done' });
          setSaved(true);
        }
      }),
    [run, show, replaceRecording],
  );

  const setRecordingFile = useCallback(
    (file: File) => {
      generation.current++;
      replaceRecording({ name: file.name, url: URL.createObjectURL(file), local: true, file });
      setMarks(null);
      setOffset(0);
      setAlign({ kind: 'none' });
      setSaved(false);
    },
    [replaceRecording],
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
      setMarks(result);
      setOffset(0);
      setSaved(false);
      setAlign({ kind: 'done' });
    } catch (e) {
      if (current()) setAlign({ kind: 'failed', error: errorText(e) });
    }
  }, [song, recording]);

  /** Melodiq songs get their marks; anything else goes to the Notes library with what is missing. */
  const saveToServer = useCallback(async () => {
    if (!song) return;
    const savingAs = generation.current;
    try {
      const result = await saveStageToServer(
        origin?.kind === 'server' || origin?.kind === 'notes' ? origin : null,
        {
          title: song.title,
          artist: song.artist,
          scoreFile: openedFile.current,
          xml,
          recordingFile: recording?.file ?? null,
          recordingName: recording && !recording.file ? recording.name : null,
          marks,
          offsetSec: offset,
        },
      );
      if (savingAs !== generation.current) return;
      if (result) {
        setOrigin({
          kind: 'notes',
          title: song.title,
          pieceId: result.pieceId,
          scoreFile: result.scoreFile,
        });
        // the recording keeps playing from its object URL, but counts as stored now
        if (recording?.file && result.recordingName) {
          setRecording({ name: result.recordingName, url: recording.url, local: true });
        }
      }
      setSaved(true);
    } catch (e) {
      setError(errorText(e));
    }
  }, [song, origin, xml, marks, offset, recording]);

  const canSaveToServer =
    !!song && isCompanionEnabled() && (origin?.kind === 'server' ? !!marks : !!xml);

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
    offset,
    align,
    saved,
    canExport: !!xml && !!marks,
    loadExample,
    loadFile,
    loadServerScore,
    loadNotesPiece,
    setRecordingFile,
    alignNow,
    saveToServer,
    canSaveToServer,
    exportScore,
    nudge,
    clearError: () => setError(null),
  };
}

export type StageSongState = ReturnType<typeof useStageSong>;
