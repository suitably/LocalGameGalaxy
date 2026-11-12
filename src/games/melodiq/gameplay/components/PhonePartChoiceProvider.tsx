import React from 'react';
import type { ActivePlayer } from '../../types';
import { usePhoneTrackChoice } from '../hooks/usePhoneTrackChoice';
import { LyricsPartContext } from '../lyrics/LyricsPartContext';

interface PhonePartChoiceProviderProps {
  clientDeviceId?: string;
  activeSessionOverride?: ActivePlayer[] | null;
  children: React.ReactNode;
}

/** Gives the phone's lyrics a mic per part, so singers pick their part and spectators can join. */
export const PhonePartChoiceProvider: React.FC<PhonePartChoiceProviderProps> = ({
  clientDeviceId,
  activeSessionOverride,
  children,
}) => {
  const choice = usePhoneTrackChoice({ clientDeviceId, activeSessionOverride });
  return <LyricsPartContext.Provider value={choice}>{children}</LyricsPartContext.Provider>;
};
