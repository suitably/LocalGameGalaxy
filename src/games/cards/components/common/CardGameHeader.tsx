import React, { useEffect, useRef, useState } from 'react';
import { Typography } from '@mui/material';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import { useTranslation } from 'react-i18next';
import { useHeaderLayout } from '../../../../context/HeaderLayoutContext';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';

interface CardGameHeaderProps {
  /** Round indicator, e.g. "Runde 3". The game name lives in GlobalHeader only. */
  roundLabel: string;
  onExit: () => void;
  onRestart: () => void;
  onHistory?: () => void;
  onUndo?: () => void;
}

/**
 * Round indicator for all card trackers. Back (to the lobby), undo, history and restart live in
 * the GlobalHeader: the back arrow is the header's home action, undo stays visible on phones,
 * history and restart collapse into the overflow menu. Restart asks for confirmation first.
 */
export const CardGameHeader: React.FC<CardGameHeaderProps> = ({
  roundLabel,
  onExit,
  onRestart,
  onHistory,
  onUndo,
}) => {
  const { t } = useTranslation();
  const { setMenuItems, setHomeAction } = useHeaderLayout();
  const [confirmRestart, setConfirmRestart] = useState(false);

  // The header context keeps menu items while their labels are unchanged, so actions read
  // the latest callbacks through a ref instead of capturing them.
  const callbacks = useRef({ onExit, onRestart, onHistory, onUndo });
  useEffect(() => {
    callbacks.current = { onExit, onRestart, onHistory, onUndo };
  });

  const canUndo = Boolean(onUndo);
  const canShowHistory = Boolean(onHistory);

  useEffect(() => {
    setMenuItems([
      {
        label: t('games.cards.undo'),
        icon: <UndoRoundedIcon />,
        action: () => callbacks.current.onUndo?.(),
        disabled: !canUndo,
        showAlways: true,
      },
      {
        label: t('games.cards.round_history'),
        icon: <HistoryRoundedIcon />,
        action: () => callbacks.current.onHistory?.(),
        disabled: !canShowHistory,
      },
      {
        label: t('games.cards.restart'),
        icon: <ReplayRoundedIcon />,
        action: () => setConfirmRestart(true),
      },
    ]);
  }, [t, setMenuItems, canUndo, canShowHistory]);

  useEffect(() => {
    setHomeAction(() => callbacks.current.onExit());
    return () => {
      setHomeAction(null);
      setMenuItems([]);
    };
  }, [setHomeAction, setMenuItems]);

  return (
    <>
      <Typography
        variant="h6"
        component="h2"
        align="center"
        sx={{ fontVariantNumeric: 'tabular-nums', mb: 2 }}
      >
        {roundLabel}
      </Typography>
      <ConfirmDialog
        open={confirmRestart}
        title={t('games.cards.restart_title')}
        message={t('games.cards.restart_message')}
        confirmText={t('games.cards.restart')}
        confirmColor="error"
        onConfirm={() => {
          setConfirmRestart(false);
          callbacks.current.onRestart();
        }}
        onCancel={() => setConfirmRestart(false)}
      />
    </>
  );
};
