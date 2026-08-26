import React from 'react';
import { Box } from '@mui/material';
import { QwixxRow } from './QwixxRow';
import { QwixxScoreSummary } from './QwixxScoreSummary';
import type { PlayerSheet, RowColor } from '../logic/types';

interface QwixxSheetProps {
    sheet: PlayerSheet;
    onCrossNumber: (color: RowColor, number: number) => void;
    onLockRow: (color: RowColor) => void;
    onAddMiss: () => void;
    onRemoveMiss: () => void;
    readOnly?: boolean;
}

export const QwixxSheet: React.FC<QwixxSheetProps> = ({
    sheet,
    onCrossNumber,
    onLockRow,
    onAddMiss,
    onRemoveMiss,
    readOnly = false
}) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 1.5 } }}>
            <QwixxRow
                color="red"
                rowState={sheet.red}
                onCrossNumber={onCrossNumber}
                onLockRow={onLockRow}
                disabled={readOnly}
            />
            <QwixxRow
                color="yellow"
                rowState={sheet.yellow}
                onCrossNumber={onCrossNumber}
                onLockRow={onLockRow}
                disabled={readOnly}
            />
            <QwixxRow
                color="green"
                rowState={sheet.green}
                onCrossNumber={onCrossNumber}
                onLockRow={onLockRow}
                disabled={readOnly}
            />
            <QwixxRow
                color="blue"
                rowState={sheet.blue}
                onCrossNumber={onCrossNumber}
                onLockRow={onLockRow}
                disabled={readOnly}
            />

            <QwixxScoreSummary
                sheet={sheet}
                onAddMiss={onAddMiss}
                onRemoveMiss={onRemoveMiss}
                disabled={readOnly}
            />
        </Box>
    );
};
