/**
 * Default-template buttons of the save dialog [ID: COMP-TABLETOP-TEMPLATE-ACTIONS]
 *
 * Server games: store the table as the server's template (#538, `allowTabletopTemplates`).
 * Device-only and starter games: store it as this device's template, or reset to the original
 * game (#547).
 */
import React from 'react';
import { Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TableSaves } from '../../hooks/useTableSaves';

export type TemplateAction = 'template' | 'localTemplate' | 'resetTemplate';

interface Props {
  saves: TableSaves;
  onPick: (action: TemplateAction) => void;
}

export const TemplateActions: React.FC<Props> = ({ saves, onPick }) => {
  const { t } = useTranslation();

  if (saves.localTemplateAllowed) {
    return (
      <Box sx={{ mr: 'auto', display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        <Button color="warning" disabled={saves.busy} onClick={() => onPick('localTemplate')}>
          {t('games.tabletop.saves.saveLocalTemplate')}
        </Button>
        {saves.hasLocalTemplate && (
          <Button color="warning" disabled={saves.busy} onClick={() => onPick('resetTemplate')}>
            {t('games.tabletop.saves.resetTemplate')}
          </Button>
        )}
      </Box>
    );
  }

  if (!saves.serverAvailable || !saves.permissions.saveTemplates) return null;
  return (
    <Button
      color="warning"
      disabled={saves.busy}
      onClick={() => onPick('template')}
      sx={{ mr: 'auto' }}
    >
      {t('games.tabletop.saves.saveTemplate')}
    </Button>
  );
};
