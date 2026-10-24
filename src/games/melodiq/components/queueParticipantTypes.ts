/** A singer in a queue item or in the current song (shape stored in `QueueItem.participants`). */
export interface ParticipantEntry {
  profileId?: string;
  deviceId?: string;
  name?: string;
  hue?: number;
  isRemote?: boolean;
}

/** A profile that can be added as a participant (local profile, connected phone or the bot). */
export interface ParticipantProfile {
  id: string;
  name: string;
  hue?: number;
  peerId?: string;
  isRemote?: boolean;
}

export const BOT_PROFILE_ID = 'BOT';

export const isLocalHuman = (p: ParticipantEntry): boolean =>
  !p.isRemote && p.profileId !== BOT_PROFILE_ID;

/** Index of a local human among the local humans before it (= its microphone slot). */
export const localSlotIndexOf = (participants: ParticipantEntry[], index: number): number =>
  participants.slice(0, index).filter(isLocalHuman).length;

export const isParticipating = (
  participants: ParticipantEntry[],
  profile: ParticipantProfile,
): boolean =>
  participants.some(
    (p) =>
      p.profileId === profile.id ||
      p.deviceId === profile.id ||
      (!!profile.peerId && p.deviceId === profile.peerId),
  );
