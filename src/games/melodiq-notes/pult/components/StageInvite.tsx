/**
 * "Invite players" on the stage: one link and QR code per part [ID: GAME-MELODIQ-NOTES-STAGE-INVITE]
 *
 * Mounted once the dialog was first opened, so the room (and its MQTT connection) only exists
 * when someone wants to play on their own device; it stays open while the stage is mounted.
 * The links carry the companion server (`gameRelay`) when one is active.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { getHelperUrl, isHelperActive } from '../../../../lib/companion/companionSettings';
import { useTranslation } from 'react-i18next';
import { ShareSessionLinksDialog, type SessionPlayerItem } from '../../../../modules/sharing';
import type { StageEngine } from '../../stage/engine/StageEngine';
import { pultJoinUrl, pultSongOf } from '../logic/pultSong';
import { useStageRoom } from '../useStageRoom';

const STAGE_ROW = '__stage__';
const newRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

interface StageInviteProps {
  engine: StageEngine;
  open: boolean;
  onClose: () => void;
  /** Hands the page the room's way to send a pult's player away. */
  onRoom: (remove: (remoteId: string) => void) => void;
}

export const StageInvite: React.FC<StageInviteProps> = ({ engine, open, onClose, onRoom }) => {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.pult.${key}`, opts);
  const [roomId] = useState(newRoomId);
  const { members, remove } = useStageRoom(engine, roomId);
  useEffect(() => onRoom(remove), [onRoom, remove]);
  const relay = isHelperActive() ? getHelperUrl() : null;
  const song = engine.song;
  const parts = useMemo(() => (song ? pultSongOf(song).parts : []), [song]);
  const base = `${window.location.origin}${window.location.pathname}`;

  const players: SessionPlayerItem[] = [
    { id: STAGE_ROW, name: k('stage_row') },
    ...parts.map((p) => {
      const m = members.find((x) => x.partId === p.id);
      const label = `${p.name} · ${t(`games.melodiq_notes.stage.instruments.${p.inst}`)}`;
      return { id: p.id, name: m ? `${label} — ${m.name}` : label, isRemote: !!m };
    }),
  ];

  return (
    <ShareSessionLinksDialog
      open={open}
      onClose={onClose}
      sessionId={roomId}
      sessionTitle={k('invite_title', { room: roomId })}
      players={players}
      buildLink={(id) => pultJoinUrl(base, roomId, id === STAGE_ROW ? undefined : id, relay)}
      isPlayerLocal={(id) => id === STAGE_ROW || !members.some((m) => m.partId === id)}
      onMarkPlayerRemote={() => {}}
      descriptionText={k('invite_hint')}
      shareMessageTitle={k('title')}
      shareMessageText={(p, link) => k('invite_message', { part: p.name, link })}
      enablePushBanner={false}
    />
  );
};
