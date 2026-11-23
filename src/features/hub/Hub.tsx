/**
 * The hub: saved Stammtisch rooms and the party room first, then every game grouped by area, tools last (ADR-0011) [ID: COMP-HUB]
 */
import React, { useState } from 'react';
import { Typography, Box, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { hubGames, hubTools, routeOf } from '../../lib/catalog/views';
import { areasFor } from '../../lib/areas';
import { PWAInstallBanner } from '../../components/pwa';
import { PlayModeSheet } from '../../games/tabletop/components/views/PlayModeSheet';
import nexumiaBanner from '../../assets/nexumia-banner.svg';
import nexumiaBannerInk from '../../assets/nexumia-banner-ink.svg';
import { HubAreaFilter, type AreaFilter } from './HubAreaFilter';
import { HubPartyRoom } from './HubPartyRoom';
import { HubSection } from './HubSection';
import { HubStammtische } from './HubStammtische';
import { hubSections } from './hubSections';
import { useHubOpen } from './useHubOpen';

const GAMES = hubGames();
const TOOLS = hubTools();
const AREAS_WITH_GAMES = areasFor([...GAMES, ...TOOLS]);

export const Hub: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Colour marks sit on dark surfaces; light mode uses the ink lock-up (DESIGN.md §8.1).
  const isLight = useTheme().palette.mode === 'light';
  const [selectedArea, setSelectedArea] = useState<AreaFilter>('all');
  const [ownDevices, setOwnDevices] = useState(false);
  const { open, choosing, choose, close } = useHubOpen();
  const sections = hubSections(GAMES, TOOLS, selectedArea, ownDevices);
  const heading = (s: (typeof sections)[number]) =>
    s.area ? (selectedArea === 'all' ? t(s.area.labelKey) : undefined) : t('hub.sections.tools');

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

      <HubStammtische />

      <HubPartyRoom onOpen={() => navigate(routeOf('party') ?? '/party')} />

      <HubAreaFilter
        areas={AREAS_WITH_GAMES}
        selected={selectedArea}
        onSelect={setSelectedArea}
        ownDevices={ownDevices}
        onToggleOwnDevices={() => setOwnDevices((v) => !v)}
      />

      {sections.map((s) => (
        <HubSection key={s.key} title={heading(s)} entries={s.entries} onOpen={open} />
      ))}
      {sections.length === 0 && (
        <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
          {t('hub.empty')}
        </Typography>
      )}

      <PlayModeSheet
        gameTitle={choosing ? t(choosing.titleKey, choosing.title) : null}
        onClose={close}
        onChoose={choose}
      />

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
