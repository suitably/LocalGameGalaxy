import React from 'react';
import { Box, ButtonBase, Paper, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CloseIcon from '@mui/icons-material/Close';
import ShieldIcon from '@mui/icons-material/Shield';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import type { RowColor, RowState, SheetRowDefinition, SheetCell, QwixxSheetType } from '../logic/types';
import { canCrossNumber, canUncrossNumber, getRowCrossCount } from '../logic/qwixxReducer';

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

const ROW_COLORS: Record<RowColor, { bg: string; border: string; text: string; buttonBg: string; buttonCrossed: string }> = {
    red: {
        bg: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
        border: '#ef5350',
        text: '#ffffff',
        buttonBg: 'rgba(255, 255, 255, 0.95)',
        buttonCrossed: '#b71c1c'
    },
    yellow: {
        bg: 'linear-gradient(135deg, #fbc02d 0%, #f57f17 100%)',
        border: '#ffee58',
        text: '#212121',
        buttonBg: 'rgba(255, 255, 255, 0.95)',
        buttonCrossed: '#e65100'
    },
    green: {
        bg: 'linear-gradient(135deg, #388e3c 0%, #1b5e20 100%)',
        border: '#66bb6a',
        text: '#ffffff',
        buttonBg: 'rgba(255, 255, 255, 0.95)',
        buttonCrossed: '#1b5e20'
    },
    blue: {
        bg: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
        border: '#42a5f5',
        text: '#ffffff',
        buttonBg: 'rgba(255, 255, 255, 0.95)',
        buttonCrossed: '#0d47a1'
    }
};

interface RowSegment {
    color: RowColor;
    cells: SheetCell[];
    isLastSegment: boolean;
}

const buildRowSegments = (rowDef: SheetRowDefinition): RowSegment[] => {
    const segments: RowSegment[] = [];
    let currentSegment: RowSegment | null = null;

    rowDef.cells.forEach((cell, idx) => {
        const isLastCell = idx === rowDef.cells.length - 1;
        if (!currentSegment || currentSegment.color !== cell.color) {
            if (currentSegment) {
                segments.push(currentSegment);
            }
            currentSegment = {
                color: cell.color,
                cells: [cell],
                isLastSegment: false
            };
        } else {
            currentSegment.cells.push(cell);
        }

        if (isLastCell && currentSegment) {
            currentSegment.isLastSegment = true;
            segments.push(currentSegment);
        }
    });

    return segments;
};

export const QwixxRow: React.FC<QwixxRowProps> = ({
    color,
    rowDef,
    rowState,
    sheetType,
    onCrossNumber,
    onLockRow,
    onUnlockRow,
    disabled = false,
    highlightedNumbers
}) => {
    const isBonusRow = !!rowDef.isBonusRow;
    const isMultiColoredRow = new Set(rowDef.cells.map((c) => c.color)).size > 1;
    const hasModifierInRow = rowDef.cells.some((c) => !!c.bonusEffect || !!c.isDouble || !!c.chainId);
    const defaultTheme = ROW_COLORS[color] || ROW_COLORS.red;
    const numbers = rowDef.cells.map((c) => c.number);
    const lastNumber = rowDef.lockNumber;
    const currentCrossCount = getRowCrossCount(rowDef, rowState, sheetType);
    const minCrosses = sheetType === 'longo' ? 6 : 5;
    const canLock = !isBonusRow && currentCrossCount >= minCrosses && rowState.crossed.includes(lastNumber) && !rowState.isLocked;

    const segments = buildRowSegments(rowDef);

    return (
        <Paper
            elevation={3}
            sx={{
                background: isBonusRow
                    ? 'linear-gradient(135deg, rgba(80, 80, 100, 0.85) 0%, rgba(40, 40, 60, 0.95) 100%)'
                    : (isMultiColoredRow ? 'rgba(0,0,0,0.4)' : defaultTheme.bg),
                border: isBonusRow
                    ? '2px solid #ffd54f'
                    : (isMultiColoredRow ? '2px solid rgba(255, 255, 255, 0.2)' : `2px solid ${defaultTheme.border}`),
                borderRadius: 3,
                p: isMultiColoredRow ? 0 : { xs: 0.75, sm: 1.25 },
                pt: hasModifierInRow ? { xs: 1.2, sm: 1.5 } : (isMultiColoredRow ? 0 : { xs: 0.75, sm: 1.25 }),
                display: 'flex',
                alignItems: 'stretch',
                opacity: rowState.isLocked ? 0.75 : 1,
                boxShadow: 4,
                overflow: 'visible',
                position: 'relative'
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flex: 1,
                    alignItems: 'stretch',
                    minWidth: { xs: 340, sm: 'auto' }
                }}
            >
                {segments.map((seg, segIdx) => {
                    const segTheme = ROW_COLORS[seg.color] || ROW_COLORS.red;
                    const isFirstSegment = segIdx === 0;
                    const isLastSeg = segIdx === segments.length - 1;

                    return (
                        <Box
                            key={segIdx}
                            sx={{
                                background: isMultiColoredRow ? segTheme.bg : 'transparent',
                                p: isMultiColoredRow ? { xs: 0.6, sm: 1 } : 0,
                                pt: (isMultiColoredRow && hasModifierInRow) ? { xs: 1.2, sm: 1.5 } : (isMultiColoredRow ? { xs: 0.6, sm: 1 } : 0),
                                display: 'flex',
                                alignItems: 'center',
                                gap: { xs: 0.4, sm: 0.8 },
                                flex: isMultiColoredRow ? seg.cells.length + (seg.isLastSegment ? 1 : 0) : 1,
                                justifyContent: 'space-around',
                                borderRight: (isMultiColoredRow && !isLastSeg)
                                    ? '1.5px solid rgba(255, 255, 255, 0.4)'
                                    : 'none',
                                borderTopLeftRadius: (isMultiColoredRow && isFirstSegment) ? 10 : 0,
                                borderBottomLeftRadius: (isMultiColoredRow && isFirstSegment) ? 10 : 0,
                                borderTopRightRadius: (isMultiColoredRow && isLastSeg) ? 10 : 0,
                                borderBottomRightRadius: (isMultiColoredRow && isLastSeg) ? 10 : 0
                            }}
                        >
                            {seg.cells.map((cell) => {
                                const num = cell.number;
                                const isCrossed = rowState.crossed.includes(num);
                                const isSubCrossed = rowState.subCrossed?.includes(num);
                                const isAllowed = canCrossNumber(numbers, rowState.crossed, num);
                                const isUncrossable = canUncrossNumber(rowState.crossed, num);
                                const isLast = num === lastNumber;
                                const isHighlighted = !isCrossed && highlightedNumbers?.includes(num);

                                // In double_sub mode: Clicking cycles (1. cross main, 2. cross sub-box, 3. reset)
                                let isClickable = false;
                                if (cell.hasSubBox) {
                                    if (!isCrossed) {
                                        isClickable = isAllowed;
                                    } else if (!isSubCrossed) {
                                        isClickable = true; // Click to check sub-box
                                    } else {
                                        isClickable = true; // Click to uncheck / reset
                                    }
                                } else {
                                    isClickable = isCrossed ? isUncrossable : isAllowed;
                                }

                                // Distinct border & glow for Double Numbers
                                let cellBorder = 'none';
                                let cellBoxShadow = isCrossed ? 'inset 0 2px 4px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.2)';

                                if (cell.isStair) {
                                    cellBorder = '2px dashed #ffd700';
                                } else if (isHighlighted) {
                                    cellBorder = '2px solid #ffd54f';
                                    cellBoxShadow = '0 0 12px 4px rgba(255, 213, 79, 0.85), 0 0 24px 8px rgba(255, 152, 0, 0.4)';
                                } else if (cell.isDouble) {
                                    cellBorder = '2.5px solid #ffb300';
                                    cellBoxShadow = isCrossed
                                        ? 'inset 0 2px 4px rgba(0,0,0,0.5), 0 0 8px rgba(255, 179, 0, 0.6)'
                                        : '0 2px 6px rgba(0,0,0,0.2), 0 0 8px rgba(255, 179, 0, 0.4)';
                                } else if (cell.chainId) {
                                    cellBorder = '2.5px dashed #555555';
                                    cellBoxShadow = isCrossed
                                        ? 'inset 0 2px 4px rgba(0,0,0,0.5), 0 0 4px rgba(0,0,0,0.4)'
                                        : '0 2px 6px rgba(0,0,0,0.2), 0 0 6px rgba(0,0,0,0.25)';
                                }

                                return (
                                    <Box
                                        key={`${rowDef.id}-${num}`}
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            position: 'relative',
                                            gap: 0.25
                                        }}
                                    >
                                        <ButtonBase
                                            data-chain-cell={cell.chainId ? `${rowDef.id}-${num}` : undefined}
                                            onClick={() => {
                                                if (!disabled && !rowState.isLocked && isClickable) {
                                                    onCrossNumber(color, num, isBonusRow, rowDef.id);
                                                }
                                            }}
                                            disabled={disabled || rowState.isLocked || !isClickable}
                                            sx={{
                                                width: { xs: 26, sm: 36, md: 44 },
                                                height: { xs: 32, sm: 40, md: 48 },
                                                borderRadius: 1.5,
                                                bgcolor: isCrossed
                                                    ? segTheme.buttonCrossed
                                                    : segTheme.buttonBg,
                                                color: isCrossed
                                                    ? '#ffffff'
                                                    : (seg.color === 'yellow' ? '#212121' : '#1e1e24'),
                                                fontWeight: '900',
                                                fontSize: { xs: '0.85rem', sm: '1.1rem', md: '1.25rem' },
                                                position: 'relative',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.15s ease',
                                                transform: isCrossed ? 'scale(0.96)' : (isHighlighted ? 'scale(1.08)' : 'none'),
                                                opacity: !isClickable ? 0.35 : 1,
                                                border: cellBorder,
                                                boxShadow: cellBoxShadow,
                                                zIndex: isHighlighted ? 2 : 'auto',
                                                '&:active': {
                                                    transform: 'scale(0.92)'
                                                }
                                            }}
                                        >
                                            {isCrossed ? (
                                                cell.isDouble ? (
                                                    <Typography
                                                        sx={{
                                                            fontSize: { xs: '0.95rem', sm: '1.3rem', md: '1.5rem' },
                                                            fontWeight: '900',
                                                            color: '#ffd700',
                                                            letterSpacing: -1,
                                                            lineHeight: 1,
                                                            textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                                                        }}
                                                    >
                                                        XX
                                                    </Typography>
                                                ) : (
                                                    <CloseIcon sx={{ fontSize: { xs: 22, sm: 28, md: 34 }, color: '#ffffff', stroke: '#ffffff', strokeWidth: 1.5 }} />
                                                )
                                            ) : (
                                                num
                                            )}

                                            {/* Last Number Lock Dot */}
                                            {isLast && !isCrossed && !isBonusRow && (
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 1,
                                                        right: 1,
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: '50%',
                                                        bgcolor: segTheme.border
                                                    }}
                                                />
                                            )}

                                            {/* Sub-dots for Double Numbers (when uncrossed) */}
                                            {cell.isDouble && !isCrossed && (
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        bottom: 2,
                                                        display: 'flex',
                                                        gap: 0.3,
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <Box sx={{ width: 3.5, height: 3.5, borderRadius: '50%', bgcolor: '#ffb300' }} />
                                                    <Box sx={{ width: 3.5, height: 3.5, borderRadius: '50%', bgcolor: '#ffb300' }} />
                                                </Box>
                                            )}
                                        </ButtonBase>

                                        {/* Floating "2×" Stamp Badge for Double Numbers */}
                                        {cell.isDouble && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: { xs: -7, sm: -9, md: -10 },
                                                    right: { xs: -4, sm: -6, md: -7 },
                                                    zIndex: 3,
                                                    background: 'linear-gradient(135deg, #ffd700 0%, #ff8f00 100%)',
                                                    backgroundColor: '#ffb300',
                                                    color: '#1a1a1a',
                                                    fontWeight: '900',
                                                    fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.8rem' },
                                                    px: { xs: 0.45, sm: 0.65 },
                                                    py: 0.15,
                                                    borderRadius: 1.2,
                                                    border: '1.5px solid #ffffff',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                                                    lineHeight: 1,
                                                    letterSpacing: 0.5,
                                                    pointerEvents: 'none'
                                                }}
                                            >
                                                2×
                                            </Box>
                                        )}

                                        {/* Floating Modifier Bubbles for Bonus Icons */}
                                        {cell.bonusEffect && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: { xs: -7, sm: -9, md: -10 },
                                                    right: { xs: -4, sm: -6, md: -7 },
                                                    zIndex: 3,
                                                    pointerEvents: 'none'
                                                }}
                                            >
                                                {/* Shield Bubble */}
                                                {cell.bonusEffect.type === 'shield' && (
                                                    <Box
                                                        sx={{
                                                            width: { xs: 18, sm: 22, md: 24 },
                                                            height: { xs: 18, sm: 22, md: 24 },
                                                            borderRadius: '50%',
                                                            bgcolor: '#ffd700',
                                                            border: '1.5px solid #ffffff',
                                                            boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <ShieldIcon
                                                            sx={{
                                                                fontSize: { xs: '0.75rem', sm: '0.95rem', md: '1.05rem' },
                                                                color: '#212121'
                                                            }}
                                                        />
                                                    </Box>
                                                )}

                                                {/* Self-Cross Bubble */}
                                                {cell.bonusEffect.type === 'self_cross' && (
                                                    <Box
                                                        sx={{
                                                            width: { xs: 18, sm: 22, md: 24 },
                                                            height: { xs: 18, sm: 22, md: 24 },
                                                            borderRadius: '50%',
                                                            bgcolor: '#2e7d32',
                                                            border: '1.5px solid #ffffff',
                                                            boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <AddCircleIcon
                                                            sx={{
                                                                fontSize: { xs: '0.75rem', sm: '0.95rem', md: '1.05rem' },
                                                                color: '#ffffff'
                                                            }}
                                                        />
                                                    </Box>
                                                )}

                                                {/* Partner-Cross Prominent Target Bubble */}
                                                {cell.bonusEffect.type === 'partner_cross' && (() => {
                                                    const targetColor = cell.bonusEffect.targetColor;
                                                    const targetTheme = ROW_COLORS[targetColor] || ROW_COLORS.red;
                                                    const isTargetYellow = targetColor === 'yellow';

                                                    return (
                                                        <Box
                                                            sx={{
                                                                width: { xs: 20, sm: 24, md: 26 },
                                                                height: { xs: 20, sm: 24, md: 26 },
                                                                borderRadius: '50%',
                                                                background: targetTheme.bg,
                                                                border: '2px solid #ffffff',
                                                                boxShadow: '0 2px 8px rgba(0,0,0,0.7)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <ArrowForwardIcon
                                                                sx={{
                                                                    fontSize: { xs: '0.8rem', sm: '1rem', md: '1.15rem' },
                                                                    color: isTargetYellow ? '#212121' : '#ffffff',
                                                                    stroke: isTargetYellow ? '#212121' : '#ffffff',
                                                                    strokeWidth: 0.5
                                                                }}
                                                            />
                                                        </Box>
                                                    );
                                                })()}
                                            </Box>
                                        )}

                                        {/* Sub-Box Indicator for Double Sub Variant */}
                                        {cell.hasSubBox && (
                                            <ButtonBase
                                                onClick={() => {
                                                    if (!disabled && !rowState.isLocked && isClickable) {
                                                        onCrossNumber(color, num, isBonusRow, rowDef.id);
                                                    }
                                                }}
                                                disabled={disabled || rowState.isLocked || !isClickable}
                                                sx={{
                                                    p: 0,
                                                    mt: 0.2,
                                                    opacity: isCrossed ? 1 : 0.25,
                                                    transition: 'all 0.15s ease',
                                                    color: isSubCrossed ? '#4caf50' : (isCrossed ? '#ffd54f' : 'rgba(255, 255, 255, 0.4)')
                                                }}
                                            >
                                                {isSubCrossed ? (
                                                    <CheckBoxIcon sx={{ fontSize: { xs: 16, sm: 20 }, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                                                ) : (
                                                    <CheckBoxOutlineBlankIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                                                )}
                                            </ButtonBase>
                                        )}
                                    </Box>
                                );
                            })}

                            {/* Lock Button on the last segment */}
                            {seg.isLastSegment && !isBonusRow && (
                                <ButtonBase
                                    onClick={() => {
                                        if (rowState.isLocked) {
                                            onUnlockRow(color);
                                        } else if (canLock) {
                                            onLockRow(color);
                                        }
                                    }}
                                    disabled={!canLock && !rowState.isLocked}
                                    sx={{
                                        width: { xs: 28, sm: 38, md: 46 },
                                        height: { xs: 32, sm: 40, md: 48 },
                                        borderRadius: '50%',
                                        bgcolor: rowState.isLocked
                                            ? '#ffffff'
                                            : (canLock ? segTheme.buttonBg : 'rgba(255, 255, 255, 0.25)'),
                                        color: rowState.isLocked
                                            ? (seg.color === 'yellow' ? '#f57f17' : segTheme.buttonCrossed)
                                            : (canLock ? segTheme.buttonCrossed : 'rgba(255, 255, 255, 0.6)'),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: rowState.isLocked ? 3 : 'none',
                                        transition: 'all 0.2s ease',
                                        animation: canLock ? 'pulse 1.5s infinite' : 'none'
                                    }}
                                >
                                    {rowState.isLocked ? (
                                        <LockIcon sx={{ fontSize: { xs: 18, sm: 24, md: 28 } }} />
                                    ) : (
                                        <LockOpenIcon sx={{ fontSize: { xs: 18, sm: 24, md: 28 } }} />
                                    )}
                                </ButtonBase>
                            )}

                            {/* Bonus Row alignment spacer ensuring exact vertical alignment with rows above */}
                            {seg.isLastSegment && isBonusRow && (
                                <Box
                                    sx={{
                                        width: { xs: 28, sm: 38, md: 46 },
                                        height: { xs: 32, sm: 40, md: 48 },
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: 0.85
                                    }}
                                >
                                    <Typography sx={{ fontSize: { xs: '1.1rem', sm: '1.4rem' }, color: '#ffd54f', fontWeight: 'bold' }}>
                                        ★
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </Box>
        </Paper>
    );
};
