import { useCallback, useState } from 'react';
import {
  deleteSongFile,
  updateSongMeta,
  uploadSongFile,
} from '../../../lib/companion/notesLibraryApi';
import { getCompanionSong, type CompanionSong } from '../../../lib/companion/songScoresApi';
import {
  initialDraft,
  metaUpdate,
  type SongFileRow,
  type SongFilesDraft,
} from './logic/songFileEdits';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Keeps the user's unsaved labels when the song is re-read after an upload or delete. */
function mergeDraft(draft: SongFilesDraft, song: CompanionSong): SongFilesDraft {
  const fresh = initialDraft(song);
  const labels = Object.fromEntries(
    Object.entries(fresh.labels).map(([file, label]) => [file, draft.labels[file] ?? label]),
  );
  return { ...draft, labels };
}

/**
 * State of the "manage files" dialog of one library song: the song as the server last answered,
 * the edited draft, and the actions (save labels / title / artist, upload, delete).
 * `changed` tells the library to reload once the dialog closes.
 */
export function useSongFilesManager(initial: CompanionSong) {
  const [song, setSong] = useState(initial);
  const [draft, setDraft] = useState(() => initialDraft(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  const run = useCallback(async (action: () => Promise<CompanionSong | null>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await action();
      if (next) {
        setSong(next);
        setDraft((d) => mergeDraft(d, next));
      }
      setChanged(true);
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const update = metaUpdate(song, draft);

  const save = useCallback(async () => {
    if (update.kind !== 'update') return update.kind === 'none';
    return run(() => updateSongMeta(song.id, update.input));
  }, [run, song.id, update]);

  const upload = useCallback(
    (files: File[]) =>
      run(async () => {
        let latest: CompanionSong | null = null;
        for (const file of files) {
          latest = (await uploadSongFile(song.id, file)).song ?? latest;
          // a later file may fail; the stored ones still need a library reload
          setChanged(true);
        }
        return latest ?? getCompanionSong(song.id);
      }),
    [run, song.id],
  );

  const remove = useCallback(
    (row: SongFileRow) =>
      run(async () => {
        await deleteSongFile(song.id, row.file);
        return getCompanionSong(song.id);
      }),
    [run, song.id],
  );

  /** The song as another action (a new recording) left it on the server. */
  const adopt = useCallback((next: CompanionSong) => void run(async () => next), [run]);

  const setTitle = (title: string) => setDraft((d) => ({ ...d, title }));
  const setArtist = (artist: string) => setDraft((d) => ({ ...d, artist }));
  const setLabel = (file: string, label: string) =>
    setDraft((d) => ({ ...d, labels: { ...d.labels, [file]: label } }));

  return {
    song,
    draft,
    update,
    busy,
    error,
    changed,
    clearError: () => setError(null),
    setTitle,
    setArtist,
    setLabel,
    save,
    upload,
    remove,
    adopt,
  };
}

export type SongFilesManager = ReturnType<typeof useSongFilesManager>;
