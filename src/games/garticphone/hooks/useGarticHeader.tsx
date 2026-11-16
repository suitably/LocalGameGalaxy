/**
 * Puts Gartic Phone into the global header [ID: HOOK-GARTIC-HEADER]
 *
 * Back arrow = party lobby (homeAction), "share lobby" as a header action and, for the host only,
 * "end game for everyone" behind a ConfirmDialog. Returns the dialogs to render.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import StopCircleRoundedIcon from '@mui/icons-material/StopCircleRounded';
import { useHeaderLayout, type MenuItem } from '../../../context/HeaderLayoutContext';
import { usePageTitle } from '../../../context/TitleContext';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { GarticShareDialog } from '../components/GarticShareDialog';

interface GarticHeaderOptions {
  roomId: string;
  isHost: boolean;
  onBack: () => void;
  onEndGame: () => void;
}

export function useGarticHeader(options: GarticHeaderOptions): React.ReactNode {
  const { roomId, isHost } = options;
  const { t } = useTranslation();
  usePageTitle(t('games.garticphone.title', 'Gartic Phone'));
  const { setHomeAction, setMenuItems } = useHeaderLayout();
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  // Menu items are compared by label only, so their actions read the latest callbacks.
  const callbacks = useRef(options);
  useEffect(() => {
    callbacks.current = options;
  });

  useEffect(() => {
    setHomeAction(() => callbacks.current.onBack());
    return () => {
      setHomeAction(null);
      setMenuItems([]);
    };
  }, [setHomeAction, setMenuItems]);

  useEffect(() => {
    const items: MenuItem[] = [
      {
        label: t('party.shareLobbyTooltip', 'Lobby teilen / Freunde einladen'),
        icon: <ShareRoundedIcon />,
        action: () => setShareOpen(true),
        showAlways: true,
      },
    ];
    if (isHost) {
      items.push({
        label: t('party.endGameForEveryone', 'Spiel für alle beenden'),
        icon: <StopCircleRoundedIcon color="error" />,
        action: () => setConfirmEndOpen(true),
      });
    }
    setMenuItems(items);
  }, [t, isHost, setMenuItems]);

  return (
    <>
      <GarticShareDialog open={shareOpen} roomId={roomId} onClose={() => setShareOpen(false)} />
      <ConfirmDialog
        open={confirmEndOpen && isHost}
        title={t('party.confirmEndTitle', 'Spiel wirklich beenden?')}
        message={t('party.confirmEndDesc')}
        confirmText={t('party.endGameBtn', 'Beenden')}
        confirmColor="error"
        onCancel={() => setConfirmEndOpen(false)}
        onConfirm={() => {
          setConfirmEndOpen(false);
          callbacks.current.onEndGame();
        }}
      />
    </>
  );
}
