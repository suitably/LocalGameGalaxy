import React, { useRef } from 'react';
import { Box, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/StarRounded';
import { useTranslation } from 'react-i18next';
import { QwixxRow } from './QwixxRow';
import { QwixxScoreSummary } from './QwixxScoreSummary';
import { QwixxChainOverlay } from './QwixxChainOverlay';
import { QwixxBonusLegend } from './QwixxBonusLegend';
import type { PlayerSheet, RowColor, RowState } from '../logic/types';
import { getSheetDefinition, getSheetRows } from '../logic/sheetDefinitions';

interface QwixxSheetProps {
  sheet: PlayerSheet;
  onCrossNumber: (color: RowColor, number: number, isBonusRow?: boolean, rowId?: string) => void;
  onLockRow: (color: RowColor) => void;
  onUnlockRow: (color: RowColor) => void;
  onAddMiss: () => void;
  onRemoveMiss: () => void;
  readOnly?: boolean;
  highlightedNumbers?: Partial<Record<RowColor, number[]>> | null;
}

const EMPTY_ROW: RowState = { crossed: [], isLocked: false };
const GAP = { xs: 1, sm: 1.5 };

export const QwixxSheet: React.FC<QwixxSheetProps> = ({
  sheet,
  onCrossNumber,
  onLockRow,
  onUnlockRow,
  onAddMiss,
  onRemoveMiss,
  readOnly = false,
  highlightedNumbers = null,
}) => {
  const { t } = useTranslation();
  const rowsContainerRef = useRef<HTMLDivElement>(null);
  const sheetDef = getSheetDefinition(sheet.sheetType || 'classic');
  const rows = getSheetRows(sheet.sheetType || 'classic', sheet.presetIndex, sheet.customRows);
  const rowHandlers = { sheetType: sheet.sheetType, onCrossNumber, onLockRow, onUnlockRow };

  const renderBonusRow = (index: number) => {
    // A bonus row sits below the 2nd (red-yellow) and 4th (green-blue) row.
    const slot = index === 1 ? 0 : index === 3 ? 1 : -1;
    const bonusDef = slot >= 0 ? sheetDef.bonusRows?.[slot] : undefined;
    if (!sheetDef.hasBonusRows || !bonusDef || !sheet.bonusRows) return null;
    const isRedYellow = slot === 0;

    return (
      <Box sx={{ my: 0.25 }}>
        <Typography
          variant="caption"
          sx={{
            color: isRedYellow ? 'piece.yellow' : 'piece.green',
            fontWeight: 'bold',
            px: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <StarIcon sx={{ fontSize: '1rem' }} />
          {isRedYellow
            ? t('games.qwixx.bonus_red_yellow', 'Bonusreihe Rot-Gelb (zählt für beide Reihen)')
            : t('games.qwixx.bonus_green_blue', 'Bonusreihe Grün-Blau (zählt für beide Reihen)')}
        </Typography>
        <QwixxRow
          color={isRedYellow ? 'red' : 'green'}
          rowDef={bonusDef}
          rowState={
            (isRedYellow ? sheet.bonusRows.bonus_red_yellow : sheet.bonusRows.bonus_green_blue) ||
            EMPTY_ROW
          }
          disabled={readOnly}
          {...rowHandlers}
        />
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
      <Box
        ref={rowsContainerRef}
        sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: GAP }}
      >
        {sheet.sheetType === 'connected_chains' && (
          <QwixxChainOverlay containerRef={rowsContainerRef} />
        )}

        {rows.slice(0, 4).map((rowDef, index) => (
          <React.Fragment key={rowDef.id}>
            <QwixxRow
              color={rowDef.defaultColor}
              rowDef={rowDef}
              rowState={sheet[rowDef.defaultColor]}
              disabled={readOnly}
              highlightedNumbers={highlightedNumbers?.[rowDef.defaultColor]}
              {...rowHandlers}
            />
            {renderBonusRow(index)}
          </React.Fragment>
        ))}
      </Box>

      {sheet.sheetType === 'bonus' && <QwixxBonusLegend shields={sheet.shields} />}

      <QwixxScoreSummary
        sheet={sheet}
        onAddMiss={onAddMiss}
        onRemoveMiss={onRemoveMiss}
        disabled={readOnly}
      />
    </Box>
  );
};
