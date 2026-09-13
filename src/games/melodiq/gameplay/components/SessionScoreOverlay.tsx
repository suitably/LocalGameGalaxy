import React from 'react';
import { Box, Typography, Slider, Button } from '@mui/material';

export interface SessionScoreOverlayProps {
    showDevSlider?: boolean;
    devPitchOverride: number | null;
    onDevPitchChange: (pitch: number | null) => void;
}

export const SessionScoreOverlay: React.FC<SessionScoreOverlayProps> = ({
    showDevSlider,
    devPitchOverride,
    onDevPitchChange
}) => {
    if (!showDevSlider) return null;

    return (
        <Box
            sx={{
                width: 400,
                alignSelf: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: 'rgba(0,0,0,0.5)',
                p: 2,
                borderRadius: 2,
                pointerEvents: 'auto',
                mt: 2
            }}
        >
            <Typography width={140}>
                P1 Dev Pitch: {Math.round(devPitchOverride || 0)}
            </Typography>
            <Slider
                value={devPitchOverride || 60}
                min={36}
                max={84}
                onChange={(_, v) => onDevPitchChange(v as number)}
            />
            <Button
                onClick={() => onDevPitchChange(null)}
                variant="outlined"
                size="small"
            >
                Reset
            </Button>
        </Box>
    );
};
