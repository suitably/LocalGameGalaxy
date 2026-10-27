import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nudgeOffset } from './logic/tuning';
import {
  applyBarMarksToMusicXml,
  type AlignProgress,
  type AlignResult,
  type BarMark,
  nearestBar,
  pinBar,
  type ScoreSong,
} from '../../../modules/music-score';
import { isCompanionEnabled, type CompanionSong } from '../../../lib/companion/songScoresApi';
import type { CatalogScore } from './logic/scoreCatalog';
import {
  loadKaraokeVocals,
  loadSongScore,
  type RecordingSource,
  type ServerScoreLoad,
  type SongOrigin,
} from './serverScoreLoad';
import { musicXmlFile, saveToNotesLibrary } from './logic/notesLibrarySync';
import { alignRecordingInBrowser, createElementRecording } from './engine/browserRecording';
import type { StageEngine } from './engine/StageEngine';
import {
  browserXml,
  downloadText,
  readMusicXmlText,
  readScoreFile,
  serializeXml,
} from './loadScore';

export type { SongOrigin, RecordingSource };

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
  // the score file as opened, so the library gets the original (.mxl, .mid) rather than a copy
  const openedFile = useRef<File | null>(null);
  const replaceMarks = useCallback((next: BarMark[] | null) => {
    setMarks(next);
    setPins([]);
  }, []);
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
        openedFile.current = file;
        replaceRecording(null);
      }),
    [run, show, replaceRecording],
  );

  /** Shows a score loaded from the companion server, unless another song was chosen meanwhile. */
  const loadFromServer = useCallback(
    (fetchScore: () => Promise<ServerScoreLoad>) => {
      const startedAs = generation.current;
      return run(async () => {
        const { loaded, origin: next, recording: rec, marks: stored } = await fetchScore();
        if (startedAs !== generation.current) return;
        show(loaded.song, loaded.xml, next);
        replaceRecording(rec);
        // straight from the server: nothing to save until something changes
        setSaved(true);
        if (stored) {
          replaceMarks(stored.marks);
          setOffset(stored.offsetSec);
          setAlign({ kind: 'done' });
        }
      });
    },
    [run, show, replaceRecording, replaceMarks],
  );

  /** Opens a Melodiq song's karaoke vocals with the song's mix and computed bar marks (#566). */
  const loadKaraoke = useCallback(
    (karaokeSong: CompanionSong) => loadFromServer(() => loadKaraokeVocals(karaokeSong)),
    [loadFromServer],
  );

  /** Opens a score from a song folder, with the song's mix when it has one. */
  const loadCatalogScore = useCallback(
    (item: CatalogScore) => loadFromServer(() => loadSongScore(item.song, item.score)),
    [loadFromServer],
  );

  const setRecordingFile = useCallback(
    (file: File) => {
      generation.current++;
      replaceRecording({ name: file.name, url: URL.createObjectURL(file), local: true, file });
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

  // a karaoke `.txt` on stage is stored already; only a new recording of it can be saved
  const stored = useMemo(() => {
    if (origin?.kind === 'notes') return { songId: origin.songId, scoreFile: origin.scoreFile };
    return origin?.kind === 'karaoke' ? { songId: origin.songId, scoreFile: null } : null;
  }, [origin]);

  /** Everything goes to the song folder (#568): the score if missing, a recording, the marks. */
  const saveToServer = useCallback(async () => {
    if (!song) return;
    const savingAs = generation.current;
    try {
      const result = await saveToNotesLibrary({
        stored,
        title: song.title,
        artist: song.artist,
        scoreFile: openedFile.current,
        xml,
        recordingFile: recording?.file ?? null,
        // marks for the song's mix name no recording
        recordingName: recording && !recording.file && !recording.songMix ? recording.name : null,
        marks,
        offsetSec: offset,
      });
      if (savingAs !== generation.current) return;
      if (result.scoreFile) {
        setOrigin({
          kind: 'notes',
          title: song.title,
          songId: result.songId,
          scoreFile: result.scoreFile,
        });
      }
      // the recording keeps playing from its object URL, but counts as stored now
      if (recording?.file && result.recordingName) {
        setRecording({ name: result.recordingName, url: recording.url, local: true });
      }
      setSaved(true);
    } catch (e) {
      setError(errorText(e));
    }
  }, [song, stored, xml, marks, offset, recording]);

  // a stored score only needs marks or a recording; anything else needs its MusicXML to upload
  const canSaveToServer = !!song && isCompanionEnabled() && (!!stored || !!xml);

  /** The score on stage as a file: the one opened, else its MusicXML. */
  const currentScoreFile = useCallback(
    () => openedFile.current ?? (xml && song ? musicXmlFile(xml, song.title) : null),
    [xml, song],
  );

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

  const setOffsetSec = useCallback((sec: number) => {
    setOffset(nudgeOffset(sec, 0));
    setSaved(false);
  }, []);

  const nudge = useCallback((deltaSec: number) => {
    setOffset((o) => nudgeOffset(o, deltaSec));
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
    loadCatalogScore,
    loadKaraoke,
    setRecordingFile,
    alignNow,
    saveToServer,
    canSaveToServer,
    currentScoreFile,
    exportScore,
    nudge,
    setOffsetSec,
    pinBarNow,
    clearError: () => setError(null),
  };
}

export type StageSongState = ReturnType<typeof useStageSong>;
