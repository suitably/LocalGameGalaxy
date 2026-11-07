import React, { useState } from 'react';
import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { InvitePlayersButton } from '../../../features/party/components/InvitePlayersButton';
import { universalPartyManager } from '../../../features/party/logic/universalPartyManager';
import { useWakeLock } from '../../../hooks/useWakeLock';
import { useStoryRoom } from '../hooks/useStoryRoom';
import { StoryWriterView } from './StoryWriterView';
import { StoryReaderModal } from './StoryReaderModal';
import { useFollowPartyLobby } from '../../../features/party/hooks/useFollowPartyLobby';

/** Storyteller played live in a party room: the room's players write in turn. */
export const StoryRoomGame: React.FC<{ roomId: string; language: string }> = ({
  roomId,
  language,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useFollowPartyLobby(roomId);
  useWakeLock(true);
  const live = useStoryRoom(roomId, language);
  const [readerOpen, setReaderOpen] = useState(false);
  const { game, entries } = live.state;
  const done = game?.status === 'completed';

  const backToParty = () => {
    if (live.isHost) universalPartyManager.returnToLobby(roomId);
    navigate(`/party?room=${roomId}`);
  };

  const writer = game?.players[game.currentPlayerIndex];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ p: 1 }}>
        <Button size="small" startIcon={<ArrowBackRoundedIcon />} onClick={backToParty}>
          {t('storyteller.roomBack', 'Zur Lobby')}
        </Button>
        <Box flex={1} />
        {game && (
          <Button
            size="small"
            startIcon={<MenuBookRoundedIcon />}
            onClick={() => setReaderOpen(true)}
          >
            {t('storyteller.roomRead', 'Lesen')}
          </Button>
        )}
        <InvitePlayersButton game="storyteller" variant="icon" />
        <Chip size="small" color="primary" label={roomId} />
      </Stack>

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
