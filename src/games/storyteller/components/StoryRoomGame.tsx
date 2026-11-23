import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { InvitePlayersButton } from '../../../features/party/components/InvitePlayersButton';
import { usePageTitle } from '../../../context/titleContextCore';
import { useHeaderLayout } from '../../../context/headerLayoutContextCore';
import { useWakeLock } from '../../../hooks/useWakeLock';
import { useStoryRoom } from '../hooks/useStoryRoom';
import { StoryWriterView } from './StoryWriterView';
import { StoryReaderModal } from './StoryReaderModal';
import { StorySpectatorView } from './StorySpectatorView';
import { useFollowPartyLobby } from '../../../features/party/hooks/useFollowPartyLobby';

/** Storyteller played live in a party room: the room's players write in turn. */
export const StoryRoomGame: React.FC<{ roomId: string; language: string }> = ({
  roomId,
  language,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageTitle(t('games.storyteller.title', 'Geschichtenschreiber'));
  const { setHomeAction, setCustomHeaderActions, setMenuItems } = useHeaderLayout();
  useFollowPartyLobby(roomId);
  useWakeLock(true);
  const live = useStoryRoom(roomId, language);
  const [readerOpen, setReaderOpen] = useState(false);
  const { game, entries } = live.state;
  const done = game?.status === 'completed';

  // Header: back arrow = lobby (the game goes on while this device visits it, #657).
  useEffect(() => {
    setHomeAction(() => navigate(`/party?room=${roomId}`));
    setCustomHeaderActions(<InvitePlayersButton game="storyteller" variant="icon" />);
    return () => {
      setHomeAction(null);
      setCustomHeaderActions(null);
      setMenuItems([]);
    };
  }, [navigate, roomId, setHomeAction, setCustomHeaderActions, setMenuItems]);

  const hasGame = Boolean(game);
  useEffect(() => {
    setMenuItems(
      hasGame
        ? [
            {
              label: t('storyteller.readStory', 'Geschichte lesen'),
              icon: <MenuBookRoundedIcon />,
              action: () => setReaderOpen(true),
              showAlways: true,
            },
          ]
        : [],
    );
  }, [hasGame, t, setMenuItems]);

  const writer = game?.players[game.currentPlayerIndex];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {!live.synced || !game ? (
          <Stack alignItems="center" gap={2} py={6}>
            <CircularProgress />
            <Typography color="text.secondary" textAlign="center">
              {live.synced && live.isHost
                ? t(
                    'storyteller.roomNeedTwo',
                    'Es werden mindestens 2 Spieler in der Lobby benötigt.',
                  )
                : t('storyteller.roomConnecting', 'Verbinde mit dem Raum …')}
            </Typography>
          </Stack>
        ) : done ? (
          <Stack alignItems="center" gap={2} py={6}>
            <Typography variant="h6">
              {t('storyteller.roomDone', 'Die Geschichte ist fertig!')}
            </Typography>
            <Button variant="contained" onClick={() => setReaderOpen(true)}>
              {t('storyteller.roomRead', 'Lesen')}
            </Button>
          </Stack>
        ) : !game.players.some((p) => p.id === live.myId) ? (
          <StorySpectatorView game={game} entries={entries} />
        ) : live.isMyTurn ? (
          <StoryWriterView
            game={game}
            entries={entries}
            onSubmitTurn={live.submitTurn}
            onFinishStory={live.finishStory}
          />
        ) : (
          <Stack alignItems="center" gap={1} py={6}>
            <CircularProgress size={28} />
            <Typography color="text.secondary" textAlign="center">
              {t('storyteller.roomWaiting', '{{name}} schreibt gerade …', { name: writer?.name })}
            </Typography>
          </Stack>
        )}
      </Box>

      <StoryReaderModal
        open={readerOpen}
        onClose={() => setReaderOpen(false)}
        game={game}
        entries={entries}
      />
    </Box>
  );
};
