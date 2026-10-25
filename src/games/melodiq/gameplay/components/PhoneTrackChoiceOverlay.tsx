import React from 'react';
import type { Song } from '../../db';
import type { ActivePlayer } from '../../types';
import { useParsedSong } from '../hooks/useParsedSong';
import { usePhoneTrackChoice } from '../hooks/usePhoneTrackChoice';
import { PhoneTrackPicker } from './PhoneTrackPicker';

interface PhoneTrackChoiceOverlayProps {
  song: Song;
  clientDeviceId?: string;
  activeSessionOverride?: ActivePlayer[] | null;
}

/** Duet part picker on top of the phone's session view; renders nothing for solo songs. */
export const PhoneTrackChoiceOverlay: React.FC<PhoneTrackChoiceOverlayProps> = ({
  song,
  clientDeviceId,
  activeSessionOverride,
}) => {
  const { parsedSong } = useParsedSong(song);
  const choice = usePhoneTrackChoice({
    isClient: true,
    parsedSong,
    clientDeviceId,
    activeSessionOverride,
  });
  if (!choice.canChoose) return null;
  return (
    <PhoneTrackPicker
      trackNames={choice.trackNames}
      value={choice.trackIndex}
      onChange={choice.select}
    />
  );
};
