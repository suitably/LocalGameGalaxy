import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslation } from 'react-i18next';
import type { CardWidget } from '../../logic/types';
import { HandCardItem } from './HandCardItem';

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

  return (
    <Box
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
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
          {t('games.tabletop.my_hand', 'Meine Handkarten')} ({cards.length})
        </Typography>

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

      {cards.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={120}>
          <Typography variant="body2" color="text.secondary">
            {t('games.tabletop.no_cards_in_hand', 'Keine Karten auf der Hand. Ziehe eine vom Stapel!')}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            overflowX: 'auto',
            py: 1,
            px: 0.5,
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {cards.map((card) => (
            <HandCardItem
              key={card.id}
              card={card}
              isSelected={selectedCardId === card.id}
              onSelect={onSelectCard}
              onFlick={onFlickCard}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
