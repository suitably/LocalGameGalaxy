/**
 * Inserts a ready-made routine ("roll all my dice", "next turn", …) [ID: COMP-TABLETOP-ROUTINE-TEMPLATES]
 */
import React, { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ROUTINE_TEMPLATE_IDS, routineTemplate } from '../../logic/routineTemplates';
import type { RoutineStep, TabletopWidget } from '../../logic/types';

interface RoutineTemplateMenuProps {
  widgets: Record<string, TabletopWidget>;
  onInsert: (steps: RoutineStep[]) => void;
}

export const RoutineTemplateMenu: React.FC<RoutineTemplateMenuProps> = ({ widgets, onInsert }) => {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Button size="small" onClick={(e) => setAnchor(e.currentTarget)}>
        {t('games.tabletop.editor.routine_insert_template')}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {ROUTINE_TEMPLATE_IDS.map((id) => (
          <MenuItem
            key={id}
            onClick={() => {
              onInsert(routineTemplate(id, widgets));
              setAnchor(null);
            }}
          >
            {t(`games.tabletop.editor.routine_template_${id}`)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
