/**
 * The stage's party room: who plays which part [ID: GAME-MELODIQ-NOTES-STAGE-PARTS]
 *
 * The stage hosts its pult room under the party room's code (#647 S8). Players join through the
 * lobby (`InvitePlayersButton`) and pick their part on their own device; this dialog lists every
 * part with its player and the room's players who have not picked one yet. Always mounted while
 * the stage is in a room, so the room runs whether or not the dialog is open.
 */
import React, { useEffect, useMemo } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { InvitePlayersButton } from '../../../../features/party/components/InvitePlayersButton';
import { usePartyRoomPlayers } from '../../../../features/party/hooks/usePartyRoomPlayers';
import { universalPartyManager } from '../../../../features/party/logic/universalPartyManager';
import type { StageEngine } from '../../stage/engine/StageEngine';
import { pultSongOf } from '../logic/pultSong';
import { useStageRoom } from '../useStageRoom';

interface StagePartsProps {
  engine: StageEngine;
  roomId: string;
  open: boolean;
  onClose: () => void;
  /** Hands the page the room's way to send a pult's player away. */
  onRoom: (remove: (remoteId: string) => void) => void;
}

export const StageParts: React.FC<StagePartsProps> = ({
  engine,
  roomId,
  open,
  onClose,
  onRoom,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.pult.${key}`, opts);
  const { members, remove } = useStageRoom(engine, roomId);
  useEffect(() => onRoom(remove), [onRoom, remove]);
  const { players, isHost } = usePartyRoomPlayers(roomId);
  const song = engine.song;
  const parts = useMemo(() => (song ? pultSongOf(song).parts : []), [song]);
  const waiting = players.filter((p) => !members.some((m) => m.id === p.id));

  const backToParty = () => {
    if (isHost) universalPartyManager.returnToLobby(roomId);
    navigate(`/party?room=${roomId}`);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{k('parts_title', { room: roomId })}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {k('parts_hint')}
        </Typography>
        <List dense>
          {parts.map((p) => {
            const m = members.find((x) => x.partId === p.id);
            return (
              <ListItem key={p.id} disableGutters>
                <ListItemText
                  primary={`${p.name} · ${t(`games.melodiq_notes.stage.instruments.${p.inst}`)}`}
                  secondary={m ? m.name : k('parts_free')}
                />
              </ListItem>
            );
          })}
          {waiting.map((p) => (
            <ListItem key={p.id} disableGutters>
              <ListItemText primary={p.name} secondary={k('parts_no_part')} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <InvitePlayersButton game="melodiq-notes" />
        <Button onClick={backToParty}>{k('parts_back')}</Button>
        <Button onClick={onClose}>{t('common.close', 'Schließen')}</Button>
      </DialogActions>
    </Dialog>
  );
};
