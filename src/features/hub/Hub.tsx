import React, { useState } from 'react';
import { Typography, Box, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { gameRegistry } from '../../lib/gameRegistry';
import { areaOfCategory, areasFor } from '../../lib/areas';
import { PWAInstallBanner } from '../../components/pwa';
import { DICE_GAMES } from '../../games/tabletop/logic/tableCatalog';
import nexumiaBanner from '../../assets/nexumia-banner.svg';
import nexumiaBannerInk from '../../assets/nexumia-banner-ink.svg';
import { HubAreaFilter, type AreaFilter } from './HubAreaFilter';
import { HubGameCard } from './HubGameCard';

const TABLE_GAME_IDS = new Set(DICE_GAMES.map((g) => g.id));

export const Hub: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Colour marks sit on dark surfaces; light mode uses the ink lock-up (DESIGN.md §8.1).
  const isLight = useTheme().palette.mode === 'light';
  const [selectedArea, setSelectedArea] = useState<AreaFilter>('all');

  // Dice games live on the Spieltisch (tabletop lobby), not in the hub; their routes stay.
  const hubGames = gameRegistry.getGamesByCategory('all').filter((g) => !TABLE_GAME_IDS.has(g.id));
  const areaOf = (g: (typeof hubGames)[number]) =>
    areaOfCategory(g.category === 'all' ? 'party' : g.category);
  const displayedGames =
    selectedArea === 'all' ? hubGames : hubGames.filter((g) => areaOf(g).id === selectedArea);
  const areas = areasFor(hubGames.flatMap((g) => (g.category === 'all' ? [] : [g.category])));

  return (
    <Box sx={{ width: '100%', animation: 'fadeIn 0.4s ease-out' }}>
      <Box mb={{ xs: 2.5, sm: 3, md: 4 }} textAlign="center">
        <Box
          component="img"
          src={isLight ? nexumiaBannerInk : nexumiaBanner}
          alt="Nexumia"
          sx={{
            width: '100%',
            maxWidth: { xs: 260, sm: 320, md: 380 },
            height: 'auto',
            mx: 'auto',
            display: 'block',
            mb: { xs: 1.5, sm: 2 },
          }}
        />
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            maxWidth: 600,
            mx: 'auto',
            fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.15rem' },
            fontWeight: 400,
          }}
        >
          {t('app.select_game')}
        </Typography>
      </Box>

      {/* PWA Mobile Fullscreen Install Callout */}
      <PWAInstallBanner />

      <HubAreaFilter areas={areas} selected={selectedArea} onSelect={setSelectedArea} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: { xs: 2.5, sm: 3, md: 4 },
        }}
      >
        {displayedGames.map((game) => (
          <HubGameCard
            key={game.id}
            game={game}
            area={areaOf(game)}
            onOpen={() => navigate(`/${game.route}`)}
          />
        ))}
      </Box>

      <style>
        {`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(16px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
      </style>
    </Box>
  );
};
