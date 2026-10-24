/**
 * Full-screen cover between two players on one device [ID: MOD-PASS-AND-PLAY-COVER]
 *
 * Opaque, so hands and other private content of the previous player stay hidden until the
 * next player taps. Other players can be picked on the cover.
 */
import React from 'react';
import { Box, Button, Chip, IconButton, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from 'react-i18next';
import type { HandoverPlayer } from './handover';

interface HandoverCoverProps {
  player: HandoverPlayer;
  players: HandoverPlayer[];
  onReveal: () => void;
  onRetarget: (playerId: string) => void;
  onCancel: () => void;
}

export const HandoverCover: React.FC<HandoverCoverProps> = ({
  player,
  players,
  onReveal,
  onRetarget,
  onCancel,
}) => {
  const { t } = useTranslation();
  return (
    <Box
      role="dialog"
      aria-modal="true"
      aria-label={t('common.passAndPlay.coverTitle', { name: player.name })}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal + 10,
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        px: 2,
        pt: 'max(16px, env(safe-area-inset-top))',
        pb: 'max(16px, env(safe-area-inset-bottom))',
        textAlign: 'center',
      }}
    >
      <IconButton
        onClick={onCancel}
        aria-label={t('common.cancel', 'Abbrechen')}
        sx={{ position: 'absolute', top: 'max(8px, env(safe-area-inset-top))', right: 8 }}
      >
        <CloseRoundedIcon />
      </IconButton>

      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          bgcolor: player.color || 'primary.main',
          border: 3,
          borderColor: 'background.paper',
          boxShadow: 0,
        }}
      />
      <Typography variant="h4" component="p" fontWeight={800} sx={{ wordBreak: 'break-word' }}>
        {t('common.passAndPlay.coverTitle', 'Gib das Gerät an {{name}}', { name: player.name })}
      </Typography>

      <Button
        variant="contained"
        size="large"
        onClick={onReveal}
        sx={{ minHeight: 56, minWidth: 240, borderRadius: 3, fontSize: '1.1rem', fontWeight: 800 }}
      >
        {t('common.passAndPlay.reveal', 'Ich bin {{name}} – aufdecken', { name: player.name })}
      </Button>

      {players.length > 2 && (
        <Stack spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {t('common.passAndPlay.otherPlayer', 'Jemand anderes ist dran?')}
          </Typography>
          <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1}>
            {players
              .filter((p) => p.id !== player.id)
              .map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  onClick={() => onRetarget(p.id)}
                  sx={{
                    minHeight: 44,
                    px: 1,
                    fontWeight: 700,
                    borderLeft: 6,
                    borderColor: p.color || 'divider',
                  }}
                />
              ))}
          </Stack>
        </Stack>
      )}
    </Box>
  );
};
