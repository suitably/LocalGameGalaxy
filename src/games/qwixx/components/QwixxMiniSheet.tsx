import React from 'react';
import { Box, Paper } from '@mui/material';
import type { QwixxSheetType, RowColor, SheetRowDefinition } from '../logic/types';
import { getSheetDefinition, getSheetRows } from '../logic/sheetDefinitions';

interface QwixxMiniSheetProps {
    sheetType: QwixxSheetType;
    presetIndex?: number;
    customRows?: SheetRowDefinition[];
    height?: number | string;
}

const ROW_COLORS: Record<RowColor, { bg: string; border: string }> = {
    red: { bg: '#d32f2f', border: '#ef5350' },
    yellow: { bg: '#fbc02d', border: '#ffee58' },
    green: { bg: '#388e3c', border: '#66bb6a' },
    blue: { bg: '#1976d2', border: '#42a5f5' }
};

export const QwixxMiniSheet: React.FC<QwixxMiniSheetProps> = ({
    sheetType,
    presetIndex,
    customRows
}) => {
    const sheetDef = getSheetDefinition(sheetType);
    const rows = getSheetRows(sheetType, presetIndex, customRows);

    return (
        <Paper
            elevation={2}
            sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'rgba(20, 20, 30, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.6,
                width: '100%',
                overflow: 'hidden'
            }}
        >
            {/* Standard Rows 1 & 2 */}
            {rows.slice(0, 2).map((rowDef) => (
                <Box
                    key={rowDef.id}
                    sx={{
                        display: 'flex',
                        gap: 0.3,
                        p: 0.4,
                        borderRadius: 1,
                        bgcolor: ROW_COLORS[rowDef.defaultColor]?.bg || '#d32f2f',
                        alignItems: 'center'
                    }}
                >
                    {rowDef.cells.map((cell, idx) => (
                        <Box
                            key={idx}
                            sx={{
                                flex: 1,
                                height: 12,
                                borderRadius: 0.5,
                                bgcolor: cell.color ? ROW_COLORS[cell.color]?.bg : 'rgba(255, 255, 255, 0.85)',
                                opacity: cell.color && cell.color !== rowDef.defaultColor ? 0.95 : 0.85,
                                border: cell.isStair
                                    ? '1.5px solid #ffd700'
                                    : (cell.isDouble ? '1.5px solid #ffffff' : 'none')
                            }}
                        />
                    ))}
                    {/* Mini Lock Circle */}
                    <Box
                        sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: 'rgba(255, 255, 255, 0.3)'
                        }}
                    />
                </Box>
            ))}

            {/* Big Points Bonus Row 1 */}
            {sheetDef.hasBonusRows && sheetDef.bonusRows?.[0] && (
                <Box
                    sx={{
                        display: 'flex',
                        gap: 0.3,
                        p: 0.3,
                        borderRadius: 1,
                        bgcolor: 'rgba(255, 213, 79, 0.25)',
                        border: '1px dashed #ffd54f'
                    }}
                >
                    {sheetDef.bonusRows[0].cells.map((_, idx) => (
                        <Box
                            key={idx}
                            sx={{
                                flex: 1,
                                height: 8,
                                borderRadius: 0.5,
                                bgcolor: '#ffd54f'
                            }}
                        />
                    ))}
                </Box>
            )}

            {/* Standard Rows 3 & 4 */}
            {rows.slice(2, 4).map((rowDef) => (
                <Box
                    key={rowDef.id}
                    sx={{
                        display: 'flex',
                        gap: 0.3,
                        p: 0.4,
                        borderRadius: 1,
                        bgcolor: ROW_COLORS[rowDef.defaultColor]?.bg || '#388e3c',
                        alignItems: 'center'
                    }}
                >
                    {rowDef.cells.map((cell, idx) => (
                        <Box
                            key={idx}
                            sx={{
                                flex: 1,
                                height: 12,
                                borderRadius: 0.5,
                                bgcolor: cell.color ? ROW_COLORS[cell.color]?.bg : 'rgba(255, 255, 255, 0.85)',
                                opacity: cell.color && cell.color !== rowDef.defaultColor ? 0.95 : 0.85,
                                border: cell.isStair
                                    ? '1.5px solid #ffd700'
                                    : (cell.isDouble ? '1.5px solid #ffffff' : 'none')
                            }}
                        />
                    ))}
                    {/* Mini Lock Circle */}
                    <Box
                        sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: 'rgba(255, 255, 255, 0.3)'
                        }}
                    />
                </Box>
            ))}

            {/* Big Points Bonus Row 2 */}
            {sheetDef.hasBonusRows && sheetDef.bonusRows?.[1] && (
                <Box
                    sx={{
                        display: 'flex',
                        gap: 0.3,
                        p: 0.3,
                        borderRadius: 1,
                        bgcolor: 'rgba(129, 199, 132, 0.25)',
                        border: '1px dashed #81c784'
                    }}
                >
                    {sheetDef.bonusRows[1].cells.map((_, idx) => (
                        <Box
                            key={idx}
                            sx={{
                                flex: 1,
                                height: 8,
                                borderRadius: 0.5,
                                bgcolor: '#81c784'
                            }}
                        />
                    ))}
                </Box>
            )}
        </Paper>
    );
};
