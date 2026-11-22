/**
 * Puts a running GuessArt game into the global header [ID: HOOK-GUESSART-HEADER]
 *
 * Back arrow = leave the game (homeAction), title = players/round or the secret word,
 * game actions = header menu items (phones: toggle stays visible, the rest in the burger menu).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import TransferWithinAStationRoundedIcon from '@mui/icons-material/TransferWithinAStationRounded';
import PhonelinkRingRoundedIcon from '@mui/icons-material/PhonelinkRingRounded';
import { useHeaderLayout, type MenuItem } from '../../../context/HeaderLayoutContext';
import { GuessArtHeaderTitle } from '../components/GuessArtHeaderTitle';
import { TemporaryTurnChip } from '../components/TemporaryTurnChip';
import { gameNameOverride } from '../logic/gameNameOverride';
import { getTurnPlayers } from '../logic/turnUtils';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';

export interface GuessArtHeaderOptions {
  game: GuessArtGameRecord;
  round: GuessArtRound | null;
  isHost: boolean;
  isCurrentTurnLocal: boolean;
  isTemporaryTurn: boolean;
  onToggleLocalRemote: () => void;
  onExit: () => void;
  onOpenHistory: () => void;
  onEditGame: () => void;
  onOpenShareLinks: () => void;
}

export function useGuessArtHeader(options: GuessArtHeaderOptions): void {
  const { game, round, isHost, isCurrentTurnLocal, isTemporaryTurn } = options;
  const { t } = useTranslation();
  const { setHomeAction, setCustomHeaderTitle, setCustomHeaderActions, setMenuItems } =
    useHeaderLayout();

  // Menu items are compared by label only, so their actions read the latest callbacks.
  const callbacks = useRef(options);
  useEffect(() => {
    callbacks.current = options;
  });

  useEffect(() => {
    setHomeAction(() => callbacks.current.onExit());
    return () => {
      setHomeAction(null);
      setCustomHeaderTitle(null);
      setCustomHeaderActions(null);
      setMenuItems([]);
    };
  }, [setHomeAction, setCustomHeaderTitle, setCustomHeaderActions, setMenuItems]);

  const { drawer, guesser } = getTurnPlayers(game, round);
  const currentDrawer = drawer?.name || round?.drawnByName || 'Spieler 1';
  const currentGuesser = guesser?.name || round?.guesserName || 'Spieler 2';
  const isDrawing = round?.status === 'drawing' || round?.status === 'selecting';
  const switchName = isDrawing ? currentDrawer : currentGuesser;

  const title = useMemo(
    () =>
      round ? (
        <GuessArtHeaderTitle
          game={game}
          round={round}
          isDrawing={isDrawing}
          isCurrentTurnLocal={isCurrentTurnLocal}
          currentDrawer={currentDrawer}
          currentGuesser={currentGuesser}
          effectiveGameName={gameNameOverride.getEffectiveGameName(game.id, game.name)}
        />
      ) : null,
    [game, round, isDrawing, isCurrentTurnLocal, currentDrawer, currentGuesser],
  );

  useEffect(() => {
    setCustomHeaderTitle(title);
  }, [title, setCustomHeaderTitle]);

  useEffect(() => {
    setCustomHeaderActions(isTemporaryTurn ? <TemporaryTurnChip /> : null);
  }, [isTemporaryTurn, setCustomHeaderActions]);

  const hasRound = Boolean(round);
  useEffect(() => {
    const items: MenuItem[] = [];
    if (isHost && hasRound) {
      items.push({
        label: isCurrentTurnLocal
          ? t('guessart.switchToRemote', { name: switchName })
          : t('guessart.switchToLocal', { name: switchName }),
        icon: isCurrentTurnLocal ? (
          <PhonelinkRingRoundedIcon />
        ) : (
          <TransferWithinAStationRoundedIcon />
        ),
        action: () => callbacks.current.onToggleLocalRemote(),
        showAlways: true,
      });
      items.push({
        label: t('guessart.shareGameLink'),
        icon: <ShareRoundedIcon />,
        action: () => callbacks.current.onOpenShareLinks(),
      });
    }
    items.push(
      {
        label: t('guessart.editGame'),
        icon: <EditRoundedIcon />,
        action: () => callbacks.current.onEditGame(),
      },
      {
        label: t('guessart.viewHistory'),
        icon: <HistoryRoundedIcon />,
        action: () => callbacks.current.onOpenHistory(),
      },
    );
    setMenuItems(items);
  }, [t, isHost, hasRound, isCurrentTurnLocal, switchName, setMenuItems]);
}
