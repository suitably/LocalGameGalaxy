import type { MelodiqProfile, MelodiqParticipant, ActivePlayer } from '../types';

export function enrichQueueParticipants(
  activeSession: ActivePlayer[],
  storedProfiles: MelodiqProfile[],
): MelodiqParticipant[] {
  return activeSession.map((p) => {
    if (p.profileId === 'BOT')
      return { ...p, name: 'Bot Player', hue: 330, isRemote: false, deviceId: p.deviceId };
    const profile = storedProfiles.find((prof) => prof.id === p.profileId);
    return profile
      ? {
          ...p,
          name: profile.name,
          hue: profile.hue,
          isRemote: p.isRemote ?? false,
          deviceId: p.deviceId,
        }
      : { ...p, deviceId: p.deviceId };
  });
}

/** Profile data for a participant that is added by a toggle. */
export interface ToggleParticipantProfile {
  name?: string;
  hue?: number;
  isRemote?: boolean;
  peerId?: string;
}

/**
 * Adds or removes one participant. `id` is a device id or profile id; a participant also matches
 * when its device id is the profile's peer id. New entries use `id` as device and profile id.
 */
export function toggleParticipant(
  participants: MelodiqParticipant[],
  id: string,
  profile?: ToggleParticipantProfile,
): MelodiqParticipant[] {
  const matches = (p: MelodiqParticipant) =>
    p.deviceId === id || p.profileId === id || (!!profile?.peerId && p.deviceId === profile.peerId);
  if (participants.some(matches)) return participants.filter((p) => !matches(p));
  return [
    ...participants,
    {
      profileId: id,
      deviceId: id,
      volume: 0.8,
      muted: false,
      latency: 0,
      isRemote: profile?.isRemote || false,
      name: profile?.name,
      hue: profile?.hue,
    },
  ];
}

/** Moves the participant at `startIndex` to `endIndex`; out-of-range indexes change nothing. */
export function moveParticipant(
  participants: MelodiqParticipant[],
  startIndex: number,
  endIndex: number,
): MelodiqParticipant[] {
  if (startIndex >= participants.length || endIndex >= participants.length) return participants;
  const next = [...participants];
  const [moved] = next.splice(startIndex, 1);
  next.splice(endIndex, 0, moved);
  return next;
}
