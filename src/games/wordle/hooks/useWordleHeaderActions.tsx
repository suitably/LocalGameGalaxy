import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import HistoryIcon from '@mui/icons-material/HistoryRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import { useHeaderLayout } from '../../../context/HeaderLayoutContext';
import type { WordleDialog } from './useWordleScreen';

/**
 * Wordle's dialogs open from the GlobalHeader: statistics stay visible on phones (the single
 * entry point to stats and sharing), history, duel and rules collapse into the overflow menu.
 */
export const useWordleHeaderActions = (open: (dialog: WordleDialog) => void): void => {
  const { t } = useTranslation();
  const { setMenuItems } = useHeaderLayout();
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });

  useEffect(() => {
    setMenuItems([
      {
        label: t('wordle.stats.btn_tooltip'),
        icon: <BarChartRoundedIcon />,
        action: () => openRef.current('stats'),
        showAlways: true,
      },
      {
        label: t('wordle.history.btn_tooltip'),
        icon: <HistoryIcon />,
        action: () => openRef.current('history'),
      },
      {
        label: t('wordle.duel.btn_tooltip'),
        icon: <PersonAddAlt1RoundedIcon />,
        action: () => openRef.current('duel'),
      },
      {
        label: t('wordle.help.title'),
        icon: <HelpOutlineRoundedIcon />,
        action: () => openRef.current('help'),
      },
    ]);
    return () => setMenuItems([]);
  }, [t, setMenuItems]);
};
