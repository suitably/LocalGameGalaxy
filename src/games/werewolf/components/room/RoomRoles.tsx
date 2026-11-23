/**
 * Every player's role, shown once a room game is over [ID: GAME-WEREWOLF-ROOM-ROLES]
 */
import React from 'react';
import { List, ListItem, ListItemIcon, ListItemText, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Role } from '../../logic/types';
import type { WerewolfRoomView } from '../../logic/werewolfRoomView';
import { RoleIcon } from '../RoleIcon';

export const RoomRoles: React.FC<{ view: WerewolfRoomView; roles: Record<string, Role> }> = ({
  view,
  roles,
}) => {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ mb: 2, textAlign: 'left' }}>
      <List dense aria-label={t('games.werewolf.room.roles_title')}>
        {view.players.map((p) => (
          <ListItem key={p.id}>
            <ListItemIcon>
              <RoleIcon icon={roles[p.id]} fontSize="1.5rem" />
            </ListItemIcon>
            <ListItemText
              primary={p.name}
              secondary={t(`games.werewolf.roles.${roles[p.id]}`)}
              sx={{ opacity: p.isAlive ? 1 : 0.6 }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
