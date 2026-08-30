import React, { useRef } from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { useTranslation } from 'react-i18next';
import { QwixxRow } from './QwixxRow';
import { QwixxScoreSummary } from './QwixxScoreSummary';
import { QwixxChainOverlay } from './QwixxChainOverlay';
import type { PlayerSheet, RowColor } from '../logic/types';
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

export const QwixxSheet: React.FC<QwixxSheetProps> = ({
    sheet,
    onCrossNumber,
    onLockRow,
    onUnlockRow,
    onAddMiss,
    onRemoveMiss,
    readOnly = false,
    highlightedNumbers = null
}) => {
    const { t } = useTranslation();
    const rowsContainerRef = useRef<HTMLDivElement>(null);
    const sheetDef = getSheetDefinition(sheet.sheetType || 'classic');
    const rows = getSheetRows(sheet.sheetType || 'classic', sheet.presetIndex, sheet.customRows);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 1.5 } }}>
            {/* Rows Container */}
            <Box ref={rowsContainerRef} sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 1.5 } }}>
                {sheet.sheetType === 'connected_chains' && <QwixxChainOverlay containerRef={rowsContainerRef} />}

                {/* Standard Rows (Red & Yellow) */}
                {rows.slice(0, 2).map((rowDef) => (
                    <QwixxRow
                        key={rowDef.id}
                        color={rowDef.defaultColor}
                        rowDef={rowDef}
                        rowState={sheet[rowDef.defaultColor]}
                        sheetType={sheet.sheetType}
                        onCrossNumber={onCrossNumber}
                        onLockRow={onLockRow}
                        onUnlockRow={onUnlockRow}
                        disabled={readOnly}
                        highlightedNumbers={highlightedNumbers?.[rowDef.defaultColor]}
                    />
                ))}

                {/* Big Points Bonus Row 1 (Red-Yellow) */}
                {sheetDef.hasBonusRows && sheetDef.bonusRows?.[0] && sheet.bonusRows && (
                    <Box sx={{ my: 0.25 }}>
                        <Typography variant="caption" sx={{ color: '#ffd54f', fontWeight: 'bold', px: 1 }}>
                            {t('games.qwixx.bonus_red_yellow', '★ Bonusreihe Rot-Gelb (zählt für beide Reihen)')}
                        </Typography>
                        <QwixxRow
                            color="red"
                            rowDef={sheetDef.bonusRows[0]}
                            rowState={sheet.bonusRows.bonus_red_yellow || { crossed: [], isLocked: false }}
                            sheetType={sheet.sheetType}
                            onCrossNumber={onCrossNumber}
                            onLockRow={onLockRow}
                            onUnlockRow={onUnlockRow}
                            disabled={readOnly}
                        />
                    </Box>
                )}

                {/* Standard Rows (Green & Blue) */}
                {rows.slice(2, 4).map((rowDef) => (
                    <QwixxRow
                        key={rowDef.id}
                        color={rowDef.defaultColor}
                        rowDef={rowDef}
                        rowState={sheet[rowDef.defaultColor]}
                        sheetType={sheet.sheetType}
                        onCrossNumber={onCrossNumber}
                        onLockRow={onLockRow}
                        onUnlockRow={onUnlockRow}
                        disabled={readOnly}
                        highlightedNumbers={highlightedNumbers?.[rowDef.defaultColor]}
                    />
                ))}

                {/* Big Points Bonus Row 2 (Green-Blue) */}
                {sheetDef.hasBonusRows && sheetDef.bonusRows?.[1] && sheet.bonusRows && (
                    <Box sx={{ my: 0.25 }}>
                        <Typography variant="caption" sx={{ color: '#81c784', fontWeight: 'bold', px: 1 }}>
                            {t('games.qwixx.bonus_green_blue', '★ Bonusreihe Grün-Blau (zählt für beide Reihen)')}
                        </Typography>
                        <QwixxRow
                            color="green"
                            rowDef={sheetDef.bonusRows[1]}
                            rowState={sheet.bonusRows.bonus_green_blue || { crossed: [], isLocked: false }}
                            sheetType={sheet.sheetType}
                            onCrossNumber={onCrossNumber}
                            onLockRow={onLockRow}
                            onUnlockRow={onUnlockRow}
                            disabled={readOnly}
                        />
                    </Box>
                )}
            </Box>

            {/* Bonus Icons Legend & Active Shield Tracker */}
            {sheet.sheetType === 'bonus' && (
                <Paper
                    elevation={2}
                    sx={{
                        p: { xs: 1.25, sm: 1.5 },
                        borderRadius: 2.5,
                        bgcolor: 'rgba(25, 28, 40, 0.85)',
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: '#ffd700', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            ✨ {t('games.qwixx.bonus_legend_title', 'Bonus-Symbole & Effekte')}
                        </Typography>
                        {sheet.shields !== undefined && (
                            <Chip
                                icon={<ShieldIcon sx={{ color: '#ffd700 !important' }} />}
                                label={`${t('games.qwixx.active_shields', 'Aktive Schutzschilde')}: ${sheet.shields}`}
                                size="small"
                                sx={{
                                    bgcolor: sheet.shields > 0 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                    color: sheet.shields > 0 ? '#ffd700' : 'text.secondary',
                                    border: `1px solid ${sheet.shields > 0 ? '#ffd700' : 'rgba(255, 255, 255, 0.2)'}`,
                                    fontWeight: 'bold'
                                }}
                            />
                        )}
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1 }}>
                        {/* Shield */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 0.75, borderRadius: 1.5, bgcolor: 'rgba(255, 255, 255, 0.04)' }}>
                            <ShieldIcon sx={{ color: '#ffd700', fontSize: '1.4rem', mt: 0.2 }} />
                            <Box>
                                <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 'bold', display: 'block' }}>
                                    {t('games.qwixx.bonus_shield_title', 'Schutzschild')}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'block' }}>
                                    {t('games.qwixx.bonus_shield_desc', 'Fängt den nächsten Fehlwurf automatisch ab (-5 Pkt vermieden).')}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Self-Cross */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 0.75, borderRadius: 1.5, bgcolor: 'rgba(255, 255, 255, 0.04)' }}>
                            <Box sx={{ bgcolor: '#2e7d32', borderRadius: '50%', p: 0.2, border: '1px solid #ffffff', display: 'flex', mt: 0.2 }}>
                                <AddCircleIcon sx={{ color: '#ffffff', fontSize: '1rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 'bold', display: 'block' }}>
                                    {t('games.qwixx.bonus_self_title', 'Sofort-Kreuz')}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'block' }}>
                                    {t('games.qwixx.bonus_self_desc', 'Setzt sofort das nächste freie Kreuz in dieser Reihe.')}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Partner-Cross */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 0.75, borderRadius: 1.5, bgcolor: 'rgba(255, 255, 255, 0.04)' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.2 }}>
                                <Box sx={{ display: 'flex', gap: 0.4 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#fbc02d', border: '1px solid #ffffff' }} />
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#1976d2', border: '1px solid #ffffff' }} />
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.4 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#d32f2f', border: '1px solid #ffffff' }} />
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#388e3c', border: '1px solid #ffffff' }} />
                                </Box>
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 'bold', display: 'block' }}>
                                    {t('games.qwixx.bonus_partner_title', 'Partner-Kreuz')}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'block' }}>
                                    {t('games.qwixx.bonus_partner_desc', 'Setzt sofort ein Kreuz in der Zielfarbe (Rot 8➔Gelb, Gelb 3➔Blau, Grün 5➔Rot, Blau 11➔Grün).')}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Score Summary */}
            <QwixxScoreSummary
                sheet={sheet}
                onAddMiss={onAddMiss}
                onRemoveMiss={onRemoveMiss}
                disabled={readOnly}
            />
        </Box>
    );
};
