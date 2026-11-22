/**
 * Puts a running story into the global header [ID: HOOK-STORY-HEADER]
 *
 * Back arrow = leave the story (homeAction), title = name/turn/writer, actions = menu items
 * (phones: "read" and a pending "write here" stay visible, the rest in the burger menu).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PhonelinkRingRoundedIcon from '@mui/icons-material/PhonelinkRingRounded';
import TransferWithinAStationRoundedIcon from '@mui/icons-material/TransferWithinAStationRounded';
import { useHeaderLayout } from '../../../context/HeaderLayoutContext';
import { StoryHeaderTitle } from '../components/StoryHeaderTitle';
import type { StoryGameRecord } from '../types';

export interface StoryHeaderOptions {
  game: StoryGameRecord;
  isCurrentTurnLocal: boolean;
  onExit: () => void;
  onOpenReader: () => void;
  onOpenEdit: () => void;
  onOpenShare: () => void;
  onToggleLocalRemote: () => void;
}

export function useStoryHeader(options: StoryHeaderOptions): void {
  const { game, isCurrentTurnLocal } = options;
  const { t } = useTranslation();
  const { setHomeAction, setCustomHeaderTitle, setMenuItems } = useHeaderLayout();

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
      setMenuItems([]);
    };
  }, [setHomeAction, setCustomHeaderTitle, setMenuItems]);

  const title = useMemo(
    () => <StoryHeaderTitle game={game} isCurrentTurnLocal={isCurrentTurnLocal} />,
    [game, isCurrentTurnLocal],
  );
  useEffect(() => {
    setCustomHeaderTitle(title);
  }, [title, setCustomHeaderTitle]);

  useEffect(() => {
    setMenuItems([
      {
        label: t('storyteller.readStory'),
        icon: <MenuBookRoundedIcon />,
        action: () => callbacks.current.onOpenReader(),
        showAlways: true,
      },
      {
        label: isCurrentTurnLocal ? t('storyteller.markAsRemote') : t('storyteller.claimLocalTurn'),
        icon: isCurrentTurnLocal ? (
          <PhonelinkRingRoundedIcon />
        ) : (
          <TransferWithinAStationRoundedIcon color="warning" />
        ),
        action: () => callbacks.current.onToggleLocalRemote(),
        showAlways: !isCurrentTurnLocal,
      },
      {
        label: t('storyteller.shareLinksTitle'),
        icon: <ShareRoundedIcon />,
        action: () => callbacks.current.onOpenShare(),
      },
      {
        label: t('storyteller.editStory'),
        icon: <EditRoundedIcon />,
        action: () => callbacks.current.onOpenEdit(),
      },
    ]);
  }, [t, isCurrentTurnLocal, setMenuItems]);
}
