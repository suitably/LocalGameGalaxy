/**
 * "Invite players" — the one live invite of every multi-device game [ID: COMP-PARTY-INVITE]
 *
 * Opens the lobby of the party room this device is in, or a new one, with the game preselected;
 * the host starts it there once everybody joined (#647).
 */
import React from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { universalPartyManager, type PartyGameType } from '../logic/universalPartyManager';
import { buildInviteRoute } from '../logic/partyRoutes';

export interface InvitePlayersButtonProps {
  game: PartyGameType;
  /** Tabletop: the table game to preselect. */
  gameId?: string;
  variant?: 'icon' | 'button';
}

export const InvitePlayersButton: React.FC<InvitePlayersButtonProps> = ({
  game,
  gameId,
  variant = 'button',
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = t('party.invite_players', 'Mitspieler einladen');
  const open = () =>
    navigate(
      buildInviteRoute(game, { gameId, roomId: universalPartyManager.getRoomState()?.roomId }),
    );

  if (variant === 'icon') {
    return (
      <Tooltip title={label}>
        <IconButton onClick={open} aria-label={label} sx={{ minWidth: 48, minHeight: 48 }}>
          <GroupAddRoundedIcon />
        </IconButton>
      </Tooltip>
    );
  }
  return (
    <Button
      variant="outlined"
      startIcon={<GroupAddRoundedIcon />}
      onClick={open}
      sx={{ minHeight: 48, fontWeight: 700 }}
    >
      {label}
    </Button>
  );
};
