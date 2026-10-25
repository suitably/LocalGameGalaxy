import React, { useState } from 'react';
import { Box, Typography, Button, IconButton, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import ZoomInIcon from '@mui/icons-material/ZoomInRounded';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMapRounded';
import { useTranslation } from 'react-i18next';
import type { CardWidget } from '../../logic/types';
import { fanLayout } from '../../logic/handFan';
import { useElementWidth } from '../../hooks/useElementWidth';
import { CardZoomDialog, type CardZoomTarget } from '../surface/CardZoomDialog';
import { HandCardItem } from './HandCardItem';

/** Width of a controller hand card (`HandCardItem`). */
const CONTROLLER_CARD_W = 80;

interface CardHandDockProps {
  cards: CardWidget[];
  selectedCardId: string | null;
  onSelectCard: (cardId: string) => void;
  onFlickCard: (cardId: string) => void;
  onPlaySelected: () => void;
}

export const CardHandDock: React.FC<CardHandDockProps> = ({
  cards,
  selectedCardId,
  onSelectCard,
  onFlickCard,
  onPlaySelected,
}) => {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState<CardZoomTarget>(null);
  const { ref, width } = useElementWidth<HTMLDivElement>();
  // Overlapping fan, so a phone shows the whole hand instead of four cards and a scrollbar.
  const fan = fanLayout(cards.length, width - 32, CONTROLLER_CARD_W, { maxAngle: 0, maxDrop: 0 });
  const overlap = fan.step - CONTROLLER_CARD_W;

  return (
    <Box
      ref={ref}
      sx={{
        width: '100%',
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        p: 1.5,
        pb: 'max(16px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 16px)))',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
          {t('games.tabletop.my_hand', 'Meine Handkarten')} ({cards.length})
        </Typography>

        <Box display="flex" alignItems="center" gap={0.5}>
          {cards.length > 0 && (
            <Tooltip title={t('games.tabletop.zoomHand', 'Ganze Hand vergrößern')}>
              <IconButton
                size="small"
                onClick={() =>
                  setZoom(
                    selectedCardId ? { kind: 'card', cardId: selectedCardId } : { kind: 'hand' },
                  )
                }
                aria-label={t('games.tabletop.zoomHand', 'Ganze Hand vergrößern')}
              >
                {selectedCardId ? <ZoomInIcon /> : <ZoomOutMapIcon />}
              </IconButton>
            </Tooltip>
          )}
          {selectedCardId && (
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={onPlaySelected}
            >
              {t('games.tabletop.play_card', 'Auf Tisch legen')}
            </Button>
          )}
        </Box>
      </Box>

      {cards.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={120}>
          <Typography variant="body2" color="text.secondary">
            {t(
              'games.tabletop.no_cards_in_hand',
              'Keine Karten auf der Hand. Ziehe eine vom Stapel!',
            )}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            justifyContent: fan.overflow ? 'flex-start' : 'center',
            overflowX: fan.overflow ? 'auto' : 'visible',
            pt: 2.5,
            pb: 1,
            px: 0.5,
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {cards.map((card, i) => (
            <Box
              key={card.id}
              sx={{
                ml: i > 0 ? `${overlap}px` : 0,
                position: 'relative',
                zIndex: selectedCardId === card.id ? 100 : i + 1,
                flexShrink: 0,
              }}
            >
              <HandCardItem
                card={card}
                isSelected={selectedCardId === card.id}
                onSelect={onSelectCard}
                onFlick={onFlickCard}
              />
            </Box>
          ))}
        </Box>
      )}

      <CardZoomDialog
        target={zoom}
        cards={cards}
        onClose={() => setZoom(null)}
        onPlay={onFlickCard}
      />
    </Box>
  );
};
