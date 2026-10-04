/**
 * Renders glowing outlines over multi-selected widgets [ID: GAME-TABLETOP-SELECTION-HIGHLIGHT]
 */
import React from 'react';
import { Box } from '@mui/material';
import type { TabletopWidget } from '../../logic/types';

interface SelectionHighlightLayerProps {
  selectedWidgetIds: string[];
  widgets: Record<string, TabletopWidget>;
}

export const SelectionHighlightLayer: React.FC<SelectionHighlightLayerProps> = ({
  selectedWidgetIds,
  widgets,
}) => {
  if (selectedWidgetIds.length === 0) return null;

  return (
    <>
      {selectedWidgetIds.map((id) => {
        const w = widgets[id];
        if (!w) return null;

        return (
          <Box
            key={`sel_highlight_${id}`}
            sx={{
              position: 'absolute',
              left: w.x - 4,
              top: w.y - 4,
              width: w.width + 8,
              height: w.height + 8,
              border: '2px solid #00e5ff',
              borderRadius: 2,
              boxShadow: '0 0 14px rgba(0, 229, 255, 0.75)',
              pointerEvents: 'none',
              zIndex: (w.zIndex || 0) + 150,
              transition: 'all 0.1s ease-out',
            }}
          />
        );
      })}
    </>
  );
};
