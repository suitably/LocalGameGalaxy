/**
 * Day in a Werewolf room game: last night's deaths, the vote on every phone, the hunter's shot
 * [ID: GAME-WEREWOLF-ROOM-DAY]
 */
import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import HowToVoteIcon from '@mui/icons-material/HowToVoteRounded';
import { useTranslation } from 'react-i18next';
import { asPlayers, type WerewolfRoomView } from '../../logic/werewolfRoomView';
import { HunterShotView } from '../HunterShotView';
import { PlayerSelectionView } from '../PlayerSelectionView';
import { RoleIcon } from '../RoleIcon';

interface Props {
  view: WerewolfRoomView;
  onStartVote?: () => void;
  onVote: (target: string) => void;
  onShoot: (target: string) => void;
}

export const RoomDay: React.FC<Props> = ({ view, onStartVote, onVote, onShoot }) => {
  const { t } = useTranslation();
  const me = view.me;
  const players = asPlayers(view.players);
  const name = (id: string | null) => view.players.find((p) => p.id === id)?.name ?? '';
  const aliveCount = view.players.filter((p) => p.isAlive).length;

  if (view.phase === 'HUNTER_SHOT') {
    const hunter = players.find((p) => p.id === view.hunter);
    if (hunter && me?.id === hunter.id)
      return <HunterShotView hunter={hunter} players={players} onShot={onShoot} />;
    return (
      <Typography textAlign="center" mt={4}>
        {t('games.werewolf.room.narrate_hunter', { name: name(view.hunter) })}
      </Typography>
    );
  }

  if (view.phase === 'VOTING') {
    if (me?.isAlive && !me.vote)
      return (
        <PlayerSelectionView
          icon={<HowToVoteIcon sx={{ fontSize: 60, color: 'primary.text' }} />}
          title={t('games.werewolf.voting.title', { round: view.round })}
          instruction={t('games.werewolf.voting.select_player')}
          players={players.filter((p) => p.isAlive && p.id !== me.id)}
          onSelect={onVote}
          buttonColor="primary"
        />
      );
    return (
      <Box textAlign="center" mt={4}>
        {me?.vote && (
          <Typography gutterBottom>
            {t('games.werewolf.room.your_vote', { name: name(me.vote) })}
          </Typography>
        )}
        <Typography color="text.secondary">
          {t('games.werewolf.room.voted_waiting', { count: view.votedCount, total: aliveCount })}
        </Typography>
      </Box>
    );
  }

  return (
    <Box textAlign="center" mt={4}>
      <RoleIcon icon="MORNING" fontSize={72} />
      <Typography variant="h5" gutterBottom>
        {view.victims.length > 0
          ? t('games.werewolf.room.narrate_day', { names: view.victims.map(name).join(', ') })
          : t('games.werewolf.room.narrate_day_none')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t('games.werewolf.room.discuss_hint')}
      </Typography>
      {onStartVote && (
        <Button variant="contained" onClick={onStartVote} sx={{ minHeight: 48 }}>
          {t('games.werewolf.room.start_vote')}
        </Button>
      )}
    </Box>
  );
};
