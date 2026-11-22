import React from 'react';
import { Box, Card, CardActionArea, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AreaSymbol } from '../../components/brand/AreaSymbol';
import type { AreaDefinition } from '../../lib/areas';
import type { CatalogEntry } from '../../lib/catalog/types';

interface HubGameCardProps {
  /** A catalogue entry; entries with a page bring their own icon, Spieltisch games show the area symbol. */
  game: CatalogEntry & { icon?: React.ReactNode };
  area: AreaDefinition;
  onOpen: () => void;
}

/** Game tile (DESIGN.md §6): flat card, solid icon plate in the area colour, area label, title, one line of text. */
export const HubGameCard: React.FC<HubGameCardProps> = ({ game, area, onOpen }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const fill = theme.palette.piece[area.color];
  const ink = theme.palette.piece.contrastText;

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 150ms, border-color 150ms',
        '&:hover': { transform: 'translateY(-2px)', borderColor: fill },
        '&:active': { transform: 'translateY(0)' },
      }}
    >
      <CardActionArea onClick={onOpen} sx={{ height: '100%', p: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'row', sm: 'column' },
            alignItems: 'flex-start',
            gap: { xs: 2, sm: 1.5 },
            height: '100%',
          }}
        >
          <Box
            sx={{
              width: { xs: 56, sm: 64 },
              height: { xs: 56, sm: 64 },
              borderRadius: 3,
              bgcolor: fill,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            {React.isValidElement<{ sx?: Record<string, unknown> }>(game.icon) ? (
              React.cloneElement(game.icon, { sx: { fontSize: { xs: 32, sm: 36 }, color: ink } })
            ) : (
              <AreaSymbol area={game.area} color={ink} cut={fill} size={34} />
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, sm: 1.5 } }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: fill }}>
              <AreaSymbol
                area={area.id}
                color={fill}
                cut={theme.palette.background.paper}
                size={16}
              />
              {/* Piece colours are under 4.5:1 on paper: the label text goes neutral in light mode. */}
              <Typography
                variant="caption"
                component="span"
                sx={{ color: theme.palette.mode === 'light' ? 'text.primary' : fill }}
              >
                {t(area.labelKey)}
              </Typography>
            </Box>
            <Typography variant="h5" component="h2">
              {t(game.titleKey, game.title)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(game.descKey)}
            </Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
};
