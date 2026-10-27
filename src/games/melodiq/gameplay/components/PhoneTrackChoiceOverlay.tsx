import React from 'react';
import type { ActivePlayer } from '../../types';
import { usePhoneTrackChoice } from '../hooks/usePhoneTrackChoice';
import { PhoneTrackPicker } from './PhoneTrackPicker';

interface PhoneTrackChoiceOverlayProps {
  clientDeviceId?: string;
  activeSessionOverride?: ActivePlayer[] | null;
}

/** Duet part picker on top of the phone's session view; renders nothing for solo songs. */
export const PhoneTrackChoiceOverlay: React.FC<PhoneTrackChoiceOverlayProps> = ({
  clientDeviceId,
  activeSessionOverride,
}) => {
  const choice = usePhoneTrackChoice({
    isClient: true,
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
