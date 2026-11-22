/**
 * Night in a Werewolf room game: the called role acts on its own phones, everyone else sleeps
 * [ID: GAME-WEREWOLF-ROOM-NIGHT]
 *
 * The pass-and-play role views run unchanged on the table the host sealed for this turn
 * (`RoomTurn.players`, no roles); the wolves and the seer get room versions because their
 * pass-and-play views read roles from the table.
 */
import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkModeRounded';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import { useTranslation } from 'react-i18next';
import type { NightAction } from '../../logic/types';
import type { RoomTurn, WerewolfRoomView } from '../../logic/werewolfRoomView';
import { PlayerSelectionView } from '../PlayerSelectionView';
import { CupidView } from '../roles/CupidView';
import { GuardianView } from '../roles/GuardianView';
import { WitchView } from '../roles/WitchView';

interface Props {
  view: WerewolfRoomView;
  onAction: (action: NightAction) => void;
  onSkip: () => void;
  /** Host only: ends a pack vote the wolves cannot settle. */
  onEndPackVote?: () => void;
}

/** Every wolf's pick so far; the kill happens once they all match. */
const PackPicks: React.FC<{ turn: RoomTurn; meId: string }> = ({ turn, meId }) => {
  const { t } = useTranslation();
  const name = (id: string) => turn.players.find((p) => p.id === id)?.name ?? '';
  const wolves = turn.players.filter((p) => p.id === meId || turn.partners.includes(p.id));
  const target = (id: string) => {
    const pick = turn.picks[id];
    if (pick === undefined) return t('games.werewolf.room.pack_choosing');
    return pick === null ? t('games.werewolf.room.pack_nobody') : name(pick);
  };
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t('games.werewolf.room.pack_agree')}
      </Typography>
      {wolves.map((w) => (
        <Typography key={w.id} fontWeight="bold">
          {t('games.werewolf.room.pack_pick', { name: w.name, target: target(w.id) })}
        </Typography>
      ))}
    </Box>
  );
};

const TurnView: React.FC<Props & { turn: RoomTurn }> = ({ view, turn, onAction, onSkip }) => {
  const { t } = useTranslation();
  const me = view.me;
  const alive = turn.players.filter((p) => p.isAlive);
  const common = { players: turn.players, onAction, onSkip };
  switch (turn.role) {
    case 'WEREWOLF': {
      const pack = new Set([...turn.partners, me?.id]);
      return (
        <PlayerSelectionView
          icon={<DarkModeIcon sx={{ fontSize: 60, color: 'secondary.main' }} />}
          title={t('games.werewolf.roles.WEREWOLF')}
          subtitle={
            me && me.id in turn.picks
              ? t('games.werewolf.room.your_vote', {
                  name:
                    turn.players.find((p) => p.id === turn.picks[me.id])?.name ??
                    t('games.werewolf.room.pack_nobody'),
                })
              : undefined
          }
          instruction={t('games.werewolf.narrator.select_victim')}
          players={alive.filter((p) => !pack.has(p.id))}
          onSelect={(id) => onAction({ type: 'KILL', targetId: id })}
          onSkip={onSkip}
          skipLabel={t('common.skip')}
          buttonColor="error"
          extraContent={<PackPicks turn={turn} meId={me?.id ?? ''} />}
        />
      );
    }
    case 'SEER':
      return (
        <PlayerSelectionView
          icon={<VisibilityIcon sx={{ fontSize: 60 }} />}
          title={t('games.werewolf.roles.SEER')}
          instruction={t('games.werewolf.ui.seer.instruction')}
          players={alive.filter((p) => p.id !== me?.id)}
          onSelect={(id) => onAction({ type: 'CHECK_ROLE', targetId: id })}
          onSkip={onSkip}
          skipLabel={t('common.skip')}
          buttonColor="primary"
        />
      );
    case 'WITCH':
      return <WitchView {...common} powerState={me?.powerState} />;
    case 'CUPID':
      return <CupidView {...common} />;
    case 'GUARDIAN':
      return <GuardianView {...common} />;
    default:
      return null;
  }
};

export const RoomNight: React.FC<Props> = (props) => {
  const { t } = useTranslation();
  const { view } = props;
  const me = view.me;
  const endPack = props.onEndPackVote && view.calling === 'WEREWOLF' && (
    <Box textAlign="center" mt={3}>
      <Button variant="text" onClick={props.onEndPackVote}>
        {t('games.werewolf.room.end_pack_vote')}
      </Button>
    </Box>
  );
  if (me?.turn)
    return (
      <>
        <TurnView {...props} turn={me.turn} />
        {endPack}
      </>
    );
  const finding = me?.insights.find((i) => i.round === view.round);
  const name = (id: string) => view.players.find((p) => p.id === id)?.name ?? '';
  return (
    <Box textAlign="center" mt={4}>
      <DarkModeIcon sx={{ fontSize: 72, color: 'secondary.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        {t('games.werewolf.room.night_title', { round: view.round })}
      </Typography>
      {view.calling && (
        <Typography variant="h6" color="secondary" gutterBottom>
          {t('games.werewolf.room.narrate_call', {
            role: t(`games.werewolf.roles.${view.calling}`),
          })}
        </Typography>
      )}
      <Typography color="text.secondary">
        {me && !me.isAlive ? t('games.werewolf.room.dead_hint') : t('games.werewolf.room.sleep')}
      </Typography>
      {finding && (
        <Typography sx={{ mt: 3 }} fontWeight="bold">
          {t('games.werewolf.room.insight', {
            name: name(finding.targetId),
            role: t(`games.werewolf.roles.${finding.role}`),
          })}
        </Typography>
      )}
      {endPack}
    </Box>
  );
};
