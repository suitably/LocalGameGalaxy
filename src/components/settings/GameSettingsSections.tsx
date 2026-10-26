import React, { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  filterSectionsByAudience,
  type GameSettingsSectionDefinition,
  type GameSettingsViewer,
} from '../../lib/gameSettingsTypes';
import { SettingsSection } from './SettingsSection';

interface GameSettingsSectionsProps {
  sections: readonly GameSettingsSectionDefinition[];
  audience?: GameSettingsViewer;
}

/** A game's settings sections stacked as cards (shared by the settings page and the in-game sheet). */
export const GameSettingsSections: React.FC<GameSettingsSectionsProps> = ({
  sections,
  audience = 'host',
}) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {filterSectionsByAudience(sections, audience).map(
        ({ id, titleKey, icon, component: Section }) => (
          <SettingsSection key={id} id={id} title={t(titleKey)} icon={icon}>
            <Suspense
              fallback={
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} />
                </Box>
              }
            >
              <Section />
            </Suspense>
          </SettingsSection>
        ),
      )}
    </Box>
  );
};
