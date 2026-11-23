/**
 * A player's own role card: hidden until tapped; pack, lover and seer findings below
 * [ID: GAME-WEREWOLF-ROOM-ROLE-CARD]
 */
import React, { useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';
import { useTranslation } from 'react-i18next';
import type { WerewolfRoomView } from '../../logic/werewolfRoomView';
import { RoleIcon } from '../RoleIcon';

interface Props {
  view: WerewolfRoomView;
  me: NonNullable<WerewolfRoomView['me']>;
  /** Role reveal: confirms the card was read. */
  onSeen?: () => void;
}

export const RoomRoleCard: React.FC<Props> = ({ view, me, onSeen }) => {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  const names = (ids: string[]) =>
    ids.map((id) => view.players.find((p) => p.id === id)?.name ?? '').join(', ');
  const role = (id: string) => t(`games.werewolf.roles.${id}`);

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3, textAlign: 'center' }}>
      {shown ? (
        <>
          <RoleIcon icon={me.role} fontSize={56} />
          <Typography variant="h5" color="secondary" gutterBottom>
            {role(me.role)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(`games.werewolf.role_descriptions.${me.role}`)}
          </Typography>
          {me.pack.length > 0 && (
            <Typography sx={{ mt: 2 }}>
              {t('games.werewolf.room.pack', { names: names(me.pack) })}
            </Typography>
          )}
          {me.lovers.length > 0 && (
            <Typography sx={{ mt: 1 }}>
              {t('games.werewolf.room.lovers', { names: names(me.lovers) })}
            </Typography>
          )}
          {me.insights.map((insight) => (
            <Typography key={`${insight.round}-${insight.targetId}`} sx={{ mt: 1 }}>
              {t('games.werewolf.room.insight', {
                name: names([insight.targetId]),
                role: role(insight.role),
              })}
            </Typography>
          ))}
        </>
      ) : (
        <Box>
          <RoleIcon icon="SECRET" fontSize={56} />
          <Typography color="text.secondary">{t('games.werewolf.room.card_hidden')}</Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2, flexWrap: 'wrap' }}>
        <Button
          variant={shown ? 'outlined' : 'contained'}
          onClick={() => setShown((s) => !s)}
          startIcon={shown ? <VisibilityOffIcon /> : <VisibilityIcon />}
          sx={{ minHeight: 48 }}
        >
          {shown ? t('games.werewolf.room.hide_role') : t('games.werewolf.reveal_role')}
        </Button>
        {onSeen && shown && !me.seen && (
          <Button variant="contained" color="secondary" onClick={onSeen} sx={{ minHeight: 48 }}>
            {t('games.werewolf.room.seen')}
          </Button>
        )}
      </Box>
    </Paper>
  );
};
