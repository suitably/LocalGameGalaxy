import React from 'react';
import { pieceNeutrals, piecePalette } from '../../../themeTokens';
import { alpha, Box, Paper } from '@mui/material';
import type { QwixxSheetType, RowColor, SheetRowDefinition } from '../logic/types';
import { getSheetDefinition, getSheetRows } from '../logic/sheetDefinitions';

interface QwixxMiniSheetProps {
  sheetType: QwixxSheetType;
  presetIndex?: number;
  customRows?: SheetRowDefinition[];
  height?: number | string;
}

const ROW_COLORS: Record<RowColor, { bg: string }> = {
  red: { bg: piecePalette.red },
  yellow: { bg: piecePalette.yellow },
  green: { bg: piecePalette.green },
  blue: { bg: piecePalette.blue },
};

export const QwixxMiniSheet: React.FC<QwixxMiniSheetProps> = ({
  sheetType,
  presetIndex,
  customRows,
}) => {
  const sheetDef = getSheetDefinition(sheetType);
  const rows = getSheetRows(sheetType, presetIndex, customRows);

  return (
    <Paper
      elevation={2}
      sx={{
        p: 1,
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.background.default, 0.85),
        border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.6,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {rows.slice(0, 4).map((rowDef, index) => (
        <React.Fragment key={rowDef.id}>
          <Box
            sx={{
              display: 'flex',
              gap: 0.3,
              p: 0.4,
              borderRadius: 1,
              bgcolor: ROW_COLORS[rowDef.defaultColor]?.bg || piecePalette.green,
              alignItems: 'center',
            }}
          >
            {rowDef.cells.map((cell, idx) => (
              <Box
                key={idx}
                sx={{
                  flex: 1,
                  height: 12,
                  borderRadius: 0.5,
                  bgcolor: cell.color ? ROW_COLORS[cell.color]?.bg : pieceNeutrals.white,
                  opacity: cell.color && cell.color !== rowDef.defaultColor ? 0.95 : 0.85,
                  border: cell.isStair || cell.isDouble ? '1.5px solid' : 'none',
                  borderColor: cell.isStair ? 'primary.main' : 'text.primary',
                }}
              />
            ))}
            {/* Mini Lock Circle */}
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.3),
              }}
            />
          </Box>

          {/* Big Points Bonus Rows inserted after row index 1 and 3 */}
          {(index === 1 || index === 3) &&
            sheetDef.hasBonusRows &&
            sheetDef.bonusRows?.[index === 1 ? 0 : 1] && (
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.3,
                  p: 0.3,
                  borderRadius: 1,
                  bgcolor: (theme) =>
                    alpha(
                      index === 1 ? theme.palette.primary.main : theme.palette.success.main,
                      0.25,
                    ),
                  border: '1px dashed',
                  borderColor: index === 1 ? 'primary.main' : 'success.main',
                }}
              >
                {sheetDef.bonusRows[index === 1 ? 0 : 1].cells.map((_, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      flex: 1,
                      height: 8,
                      borderRadius: 0.5,
                      bgcolor: index === 1 ? 'primary.main' : 'success.main',
                    }}
                  />
                ))}
              </Box>
            )}
        </React.Fragment>
      ))}
    </Paper>
  );
};
