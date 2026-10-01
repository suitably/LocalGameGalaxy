import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DartsScoreboard } from './components/DartsScoreboard';
import { DartsInput } from './components/DartsInput';
import { useDartsGame } from './useDartsGame';
import { DartsSettings } from './components/DartsSettings';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { usePageTitle, useHeaderLayout } from '../../context/LayoutContext';
import { useEffect } from 'react';
import { useState } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

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

        label: t('games.darts.settings'),
        icon: <SettingsIcon />,
        action: () => setSettingsOpen(true),
      },
    ]);
    return () => setMenuItems([]);
  }, [t, setMenuItems]);


  return (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >


      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box sx={{ flex: 1, overflowY: 'auto', minHeight: '30vh' }}>
          <DartsScoreboard state={gameState} />
        </Box>

        <Box
          sx={{
            flexShrink: 0,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <DartsInput state={gameState} />
        </Box>
      </Box>

      <DartsSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} state={gameState} />

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
