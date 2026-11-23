import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReplayIcon from '@mui/icons-material/ReplayRounded';
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import CasinoOutlinedIcon from '@mui/icons-material/CasinoOutlined';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import { useHeaderLayout } from '../../context/headerLayoutContextCore';

interface QwixxHeaderActionsOptions {
  showDice: boolean;
  onToggleDice: () => void;
  onNewGame: () => void;
  onPlayers: () => void;
}

/** Dice toggle and new game live in the global header, so the sheet keeps the vertical space. */
export const useQwixxHeaderActions = ({
  showDice,
  onToggleDice,
  onNewGame,
  onPlayers,
}: QwixxHeaderActionsOptions): void => {
  const { t } = useTranslation();
  const { setMenuItems } = useHeaderLayout();

  useEffect(() => {
    setMenuItems([
      {
        label: showDice
          ? t('games.qwixx.hide_dice', 'Würfel')
          : t('games.qwixx.show_dice', 'Würfel'),
        icon: showDice ? <CasinoIcon /> : <CasinoOutlinedIcon />,
        action: onToggleDice,
        showAlways: true,
      },
      {
        label: t('common.passAndPlay.players', 'Spieler'),
        icon: <GroupRoundedIcon />,
        action: onPlayers,
      },
      {
        label: t('games.qwixx.new_game', 'Neues Spiel'),
        icon: <ReplayIcon />,
        action: onNewGame,
        showAlways: true,
      },
    ]);
  }, [t, setMenuItems, showDice, onToggleDice, onNewGame, onPlayers]);

  useEffect(() => () => setMenuItems([]), [setMenuItems]);
};
