import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import { useHeaderLayout } from '../../../context/headerLayoutContextCore';

interface SudokuHeaderActionsOptions {
  onOpenStats: () => void;
  onOpenHelp: () => void;
}

/** Stats and rules live in the GlobalHeader (stats visible on phones, rules in the overflow). */
export const useSudokuHeaderActions = ({
  onOpenStats,
  onOpenHelp,
}: SudokuHeaderActionsOptions): void => {
  const { t } = useTranslation();
  const { setMenuItems } = useHeaderLayout();
  const handlers = useRef({ onOpenStats, onOpenHelp });
  useEffect(() => {
    handlers.current = { onOpenStats, onOpenHelp };
  });

  useEffect(() => {
    setMenuItems([
      {
        label: t('sudoku.menu.stats', 'Statistiken'),
        icon: <BarChartRoundedIcon />,
        action: () => handlers.current.onOpenStats(),
        showAlways: true,
      },
      {
        label: t('sudoku.menu.help', 'Regeln'),
        icon: <HelpOutlineRoundedIcon />,
        action: () => handlers.current.onOpenHelp(),
      },
    ]);
    return () => setMenuItems([]);
  }, [t, setMenuItems]);
};
