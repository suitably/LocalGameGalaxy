/**
 * Who plays on this device: names for a pass-and-play game [ID: MOD-PASS-AND-PLAY-PLAYERS]
 *
 * Applying the list starts a new game, so the dialog says so on its button.
 */
import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, IconButton } from '@mui/material';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import { useTranslation } from 'react-i18next';
import {
  addPlayerToLobby,
  PlayerManagerCard,
  removePlayerFromLobby,
  type LobbyPlayerItem,
} from '../player-management';

interface LocalPlayersDialogProps {
  open: boolean;
  names: string[];
  maxPlayers?: number;
  onApply: (names: string[]) => void;
  onClose: () => void;
}

const LocalPlayersForm: React.FC<Omit<LocalPlayersDialogProps, 'open'>> = ({
  names,
  maxPlayers,
  onApply,
  onClose,
}) => {
  const { t } = useTranslation();
  const [players, setPlayers] = useState<LobbyPlayerItem[]>(() => names.map((name) => ({ name })));
  return (
    <>
      <DialogContent sx={{ p: 1 }}>
        <PlayerManagerCard
          players={players}
          minPlayers={1}
          maxPlayers={maxPlayers}
          cardVariant="outlined"
          title={t('common.passAndPlay.playersTitle')}
          description={t('common.passAndPlay.playersHint')}
          onAddPlayer={(name) => {
            const result = addPlayerToLobby(players, name, { maxPlayers });
            if (result.success) setPlayers(result.players);
            return result.success;
          }}
          onRemovePlayer={(name, index) =>
            setPlayers((prev) => removePlayerFromLobby(prev, index ?? name))
          }
        />
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} sx={{ minHeight: 44 }}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          disabled={players.length === 0}
          onClick={() => onApply(players.map((p) => p.name))}
          sx={{ minHeight: 44, fontWeight: 800 }}
        >
          {t('common.passAndPlay.playersApply')}
        </Button>
      </DialogActions>
    </>
  );
};

export const LocalPlayersDialog: React.FC<LocalPlayersDialogProps> = ({ open, ...props }) => (
  <Dialog open={open} onClose={props.onClose} fullWidth maxWidth="xs">
    {/* Mounted per opening, so the form starts from the current names each time. */}
    {open && <LocalPlayersForm {...props} />}
  </Dialog>
);

/** Opens the player list; for a game's toolbar. */
export const LocalPlayersButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <IconButton
      onClick={onClick}
      color="inherit"
      aria-label={t('common.passAndPlay.players')}
      sx={{ width: 44, height: 44 }}
    >
      <GroupRoundedIcon />
    </IconButton>
  );
};
