import React, { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from '../../../components/settings';
import type { GameDefinition } from '../../../lib/gameRegistry';
import { useSettingsHighlight } from '../hooks/useSettingsHighlight';

interface GameSettingsDetailProps {
  game: GameDefinition;
  /** Section id or highlight to scroll to; ignored when it does not exist. */
  focusId?: string;
}

/** A game's settings page: its host/all sections stacked as cards. */
export const GameSettingsDetail: React.FC<GameSettingsDetailProps> = ({ game, focusId }) => {
  const { t } = useTranslation();
  const sections = (game.settings?.sections ?? []).filter((s) => s.audience !== 'client');
  useSettingsHighlight(focusId, [game.id]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {sections.map(({ id, titleKey, icon, component: Section }) => (
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
      ))}
    </Box>
  );
};
