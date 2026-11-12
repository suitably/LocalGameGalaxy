import { createContext, useContext } from 'react';

/** What a phone's lyrics need to offer a mic per part (duet: P1 / P2, solo: the one lane). */
export interface LyricsPartChoice {
  /** Part this phone sings; null while it only watches (spectator). */
  activeTrack: number | null;
  /** Sing `trackIndex`: switches the part, or joins the song as a singer first. */
  select: (trackIndex: number, trackCount: number) => void;
}

/** Provided only on phones; the host and the TV render the lyrics without part mics. */
export const LyricsPartContext = createContext<LyricsPartChoice | null>(null);

export const useLyricsPartChoice = () => useContext(LyricsPartContext);
