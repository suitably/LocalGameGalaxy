import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DartsScoreboard } from './components/DartsScoreboard';
import { DartsInput } from './components/DartsInput';
import { useDartsGame } from './useDartsGame';
import { DartsGameSetupDialog } from './components/DartsGameSetupDialog';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { usePageTitle } from '../../context/titleContextCore';
import { useHeaderLayout } from '../../context/headerLayoutContextCore';
import { useEffect } from 'react';
import { useState } from 'react';
import TuneIcon from '@mui/icons-material/TuneRounded';
import RestartAltIcon from '@mui/icons-material/RestartAltRounded';

export function DartsGame() {
  const { t } = useTranslation();
  usePageTitle(t('games.darts.title'));
  const { setMenuItems } = useHeaderLayout();
  const gameState = useDartsGame();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmRestartOpen, setConfirmRestartOpen] = useState(false);

  useEffect(() => {
    setMenuItems([
      {
        label: t('games.darts.restart_title'),
        icon: <RestartAltIcon />,
        action: () => setConfirmRestartOpen(true),
      },
      {
        label: t('games.darts.game_setup'),
        icon: <TuneIcon />,
        action: () => setSettingsOpen(true),
      },
    ]);
    return () => setMenuItems([]);
  }, [t, setMenuItems]);

  return (
    <Box
      sx={{
        height: '100%',
        // The only scroll container: the input bar sticks to the bottom while the
        // scoreboard grows with the player list.
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, minHeight: '30dvh' }}>
          <DartsScoreboard state={gameState} />
        </Box>

        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            zIndex: 11,
            flexShrink: 0,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            pb: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <DartsInput state={gameState} />
        </Box>
      </Box>

      <DartsGameSetupDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        state={gameState}
      />

      <ConfirmDialog
        open={confirmRestartOpen}
        title={t('games.darts.restart_title')}
        message={t('games.darts.restart_desc')}
        onConfirm={() => {
          gameState.resetGame();
          setConfirmRestartOpen(false);
        }}
        onCancel={() => setConfirmRestartOpen(false)}
      />
    </Box>
  );
}
