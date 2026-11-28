/**
 * The URL the stage plays a recording from: the recording itself when the browser seeks in it
 * exactly, else a WAV of its decoded samples (see `src/modules/audio/exactSeek`). Until the WAV is ready
 * (a few seconds) the original plays.
 */
import { useEffect, useState } from 'react';
import { decodeToWavUrl, seeksExactly } from '../../../modules/audio/exactSeek';
import type { RecordingSource } from './serverScoreLoad';

export function useExactRecordingUrl(recording: RecordingSource | null): string | null {
  const [decoded, setDecoded] = useState<{ from: string; url: string } | null>(null);
  const source = recording?.url ?? null;
  // a server URL ends in the media file's name; a local file's object URL has none
  const exact = !recording || seeksExactly(recording.file?.name ?? recording.url);

  useEffect(() => {
    if (!source || exact) return;
    let cancelled = false;
    let made: string | null = null;
    decodeToWavUrl(source)
      .then((url) => {
        made = url;
        if (cancelled) URL.revokeObjectURL(url);
        else setDecoded({ from: source, url });
      })
      .catch(() => {
        // undecodable here: the original keeps playing with estimated seeks
      });
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [source, exact]);

  if (!source) return null;
  return !exact && decoded?.from === source ? decoded.url : source;
}
