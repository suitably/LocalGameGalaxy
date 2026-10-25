import React from 'react';
import { Box, Paper, useMediaQuery } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import StarIcon from '@mui/icons-material/StarRounded';
import type { RowColor, RowState, SheetRowDefinition, QwixxSheetType } from '../logic/types';
import { getRowCrossCount } from '../logic/qwixxReducer';
import { buildRowSegments, isCellClickable, splitSegmentsIntoLines } from '../logic/rowLayout';
import { QwixxCell } from './QwixxCell';
import { QwixxLockButton } from './QwixxLockButton';
import { getRowTone } from './rowTone';

interface QwixxRowProps {
  color: RowColor;
  rowDef: SheetRowDefinition;
  rowState: RowState;
  sheetType?: QwixxSheetType;
  onCrossNumber: (color: RowColor, number: number, isBonusRow?: boolean, rowId?: string) => void;
  onLockRow: (color: RowColor) => void;
  onUnlockRow: (color: RowColor) => void;
  disabled?: boolean;
  highlightedNumbers?: number[];
}

/** xs = two-line layout on phones (<600px): every slot is a 48x48 touch target. */
const SLOT_SIZE = { width: { xs: 48, sm: 38, md: 46 }, height: { xs: 48, sm: 40, md: 48 } };

export const QwixxRow: React.FC<QwixxRowProps> = ({
  color,
  rowDef,
  rowState,
  sheetType,
  onCrossNumber,
  onLockRow,
  onUnlockRow,
  disabled = false,
  highlightedNumbers,
}) => {
  const theme = useTheme();
  const isBonusRow = !!rowDef.isBonusRow;
  const isMulti = new Set(rowDef.cells.map((c) => c.color)).size > 1;
  const hasModifier = rowDef.cells.some((c) => !!c.bonusEffect || !!c.isDouble || !!c.chainId);
  const numbers = rowDef.cells.map((c) => c.number);
  const minCrosses = sheetType === 'longo' ? 6 : 5;
  const canLock =
    !isBonusRow &&
    getRowCrossCount(rowDef, rowState, sheetType) >= minCrosses &&
    rowState.crossed.includes(rowDef.lockNumber) &&
    !rowState.isLocked;
  const twoLines = useMediaQuery(theme.breakpoints.down('sm'));
  const allSegments = buildRowSegments(rowDef);
  const lines = twoLines ? splitSegmentsIntoLines(allSegments) : [allSegments];
  const pad = { xs: 0.75, sm: 1.25 };
  const modifierPad = { xs: 1.2, sm: 1.5 };

  let background: string = getRowTone(theme, color).fill;
  let border = `2px solid ${background}`;
  if (isBonusRow) {
    background = theme.palette.background.paper;
    border = `2px solid ${theme.palette.primary.main}`;
  } else if (isMulti) {
    background = theme.palette.background.paper;
    border = `2px solid ${alpha(theme.palette.text.primary, 0.2)}`;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: background,
        border,
        borderRadius: 3,
        p: isMulti ? 0 : pad,
        pt: hasModifier ? modifierPad : isMulti ? 0 : pad,
        display: 'flex',
        alignItems: 'stretch',
        opacity: rowState.isLocked ? 0.75 : 1,
        overflow: 'visible',
        position: 'relative',
      }}
    >
      <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', gap: { xs: 0.5, sm: 0 } }}>
        {lines.map((segments, lineIdx) => (
          <Box key={lineIdx} sx={{ display: 'flex', alignItems: 'stretch' }}>
            {segments.map((seg, segIdx) => {
              const tone = getRowTone(theme, seg.color);
              const isFirst = segIdx === 0;
              const isLastSeg = segIdx === segments.length - 1;
              const radius = (edge: boolean) => (isMulti && edge ? 10 : 0);

              return (
                <Box
                  key={segIdx}
                  sx={{
                    bgcolor: isMulti ? tone.fill : 'transparent',
                    p: isMulti ? { xs: 0.6, sm: 1 } : 0,
                    pt: isMulti ? (hasModifier ? modifierPad : { xs: 0.6, sm: 1 }) : 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: { xs: 0, sm: 0.8 },
                    flex: isMulti ? seg.cells.length + (seg.isLastSegment ? 1 : 0) : 1,
                    justifyContent: 'space-around',
                    borderRight:
                      isMulti && !isLastSeg
                        ? `1.5px solid ${alpha(theme.palette.piece.contrastText, 0.4)}`
                        : 'none',
                    borderTopLeftRadius: radius(isFirst),
                    borderBottomLeftRadius: radius(isFirst),
                    borderTopRightRadius: radius(isLastSeg),
                    borderBottomRightRadius: radius(isLastSeg),
                  }}
                >
                  {seg.cells.map((cell) => {
                    const num = cell.number;
                    const isCrossed = rowState.crossed.includes(num);
                    return (
                      <QwixxCell
                        key={`${rowDef.id}-${num}`}
                        cell={cell}
                        color={seg.color}
                        chainKey={cell.chainId ? `${rowDef.id}-${num}` : undefined}
                        isCrossed={isCrossed}
                        isSubCrossed={!!rowState.subCrossed?.includes(num)}
                        isClickable={isCellClickable(cell, numbers, rowState)}
                        disabled={disabled || rowState.isLocked}
                        isHighlighted={!isCrossed && !!highlightedNumbers?.includes(num)}
                        isLastNumber={num === rowDef.lockNumber}
                        isBonusRow={isBonusRow}
                        onTap={() => onCrossNumber(color, num, isBonusRow, rowDef.id)}
                      />
                    );
                  })}

                  {seg.isLastSegment && !isBonusRow && (
                    <QwixxLockButton
                      color={seg.color}
                      isLocked={rowState.isLocked}
                      canLock={canLock}
                      onLock={() => onLockRow(color)}
                      onUnlock={() => onUnlockRow(color)}
                    />
                  )}

                  {/* Keeps bonus rows vertically aligned with the lock button column above */}
                  {seg.isLastSegment && isBonusRow && (
                    <Box
                      sx={{
                        ...SLOT_SIZE,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.85,
                      }}
                    >
                      <StarIcon
                        sx={{ fontSize: { xs: '1.1rem', sm: '1.4rem' }, color: 'primary.main' }}
                      />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
