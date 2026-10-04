import React, { useRef, useEffect } from 'react';
import { Box, Paper, Typography, Stack, ToggleButtonGroup, ToggleButton, Chip } from '@mui/material';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import { useTranslation } from 'react-i18next';
import type { TimelineTrack, ModernViewSubMode, TargetNote } from '../types';

interface ModernNoteHighwayProps {
    tracks: TimelineTrack[];
    selectedPartId: string;
    subMode: ModernViewSubMode;
    currentBeats: number;
    targetNotes: TargetNote[];
    playedPitches: number[];
    isCurrentNoteHit: boolean;
    isPlaying: boolean;
    effectiveBpm: number;
    onSubModeChange: (mode: ModernViewSubMode) => void;
}

export const ModernNoteHighway: React.FC<ModernNoteHighwayProps> = ({
    tracks,
    selectedPartId,
    subMode,
    currentBeats,
    targetNotes,
    playedPitches,
    isCurrentNoteHit,
    isPlaying,
    effectiveBpm,
    onSubModeChange,
}) => {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const lastStepTimeRef = useRef<number>(0);
    const lastBeatsRef = useRef<number>(currentBeats);

    useEffect(() => {
        lastBeatsRef.current = currentBeats;
        lastStepTimeRef.current = performance.now();
    }, [currentBeats, isPlaying]);

    const activeTrack = tracks.find(tr => tr.part.id === selectedPartId) || tracks[0];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const strikeX = 120;
        const pixelsPerBeat = 75;

        const render = (beats: number) => {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#10121d';
            ctx.fillRect(0, 0, width, height);

            if (subMode === 'focus') {
                const notes = activeTrack?.notes || [];
                const pitches = notes.map(n => n.pitch).filter(p => p > 0);
                const minPitch = pitches.length > 0 ? Math.min(...pitches) - 2 : 40;
                const maxPitch = pitches.length > 0 ? Math.max(...pitches) + 2 : 72;
                const pitchRange = Math.max(12, maxPitch - minPitch);
                const pitchToY = (p: number) => height - 30 - ((p - minPitch) / pitchRange) * (height - 60);

                // Horizontal guidelines
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 1;
                for (let p = minPitch; p <= maxPitch; p += 2) {
                    const y = pitchToY(p);
                    ctx.beginPath();
                    ctx.moveTo(strikeX, y);
                    ctx.lineTo(width, y);
                    ctx.stroke();
                }

                // Vertical Measure beat lines
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
                const startBeat = Math.floor(beats) - 2;
                const endBeat = startBeat + Math.ceil(width / pixelsPerBeat) + 2;
                for (let b = startBeat; b <= endBeat; b++) {
                    const x = strikeX + (b - beats) * pixelsPerBeat;
                    if (x >= strikeX && x <= width) {
                        ctx.beginPath();
                        ctx.moveTo(x, 0);
                        ctx.lineTo(x, height);
                        ctx.stroke();
                    }
                }

                // Strike Line
                ctx.strokeStyle = isCurrentNoteHit ? '#22c55e' : '#3b82f6';
                ctx.lineWidth = 3;
                ctx.shadowColor = ctx.strokeStyle;
                ctx.shadowBlur = isCurrentNoteHit ? 14 : 6;
                ctx.beginPath();
                ctx.moveTo(strikeX, 0);
                ctx.lineTo(strikeX, height);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Streaming Notes
                const visible = notes.filter(n =>
                    n.startBeats + n.durationBeats >= beats - 2 &&
                    n.startBeats <= beats + (width - strikeX) / pixelsPerBeat + 2
                );

                visible.forEach(n => {
                    const x = strikeX + (n.startBeats - beats) * pixelsPerBeat;
                    const w = Math.max(18, n.durationBeats * pixelsPerBeat - 4);
                    const y = pitchToY(n.pitch) - 10;
                    const isTarget = targetNotes.some(tn => tn.pitch === n.pitch && Math.abs(n.startBeats - beats) < 0.5);

                    ctx.fillStyle = isTarget && isCurrentNoteHit ? '#22c55e' : (activeTrack?.part.color || '#f59e0b');
                    ctx.beginPath();
                    ctx.roundRect(x, y, w, 20, 6);
                    ctx.fill();

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 10px monospace';
                    ctx.fillText(n.noteName, x + 5, y + 14);
                });

                // User Pitch Marker
                if (playedPitches.length > 0) {
                    playedPitches.forEach(pitch => {
                        ctx.fillStyle = isCurrentNoteHit ? '#22c55e' : '#60a5fa';
                        ctx.shadowColor = ctx.fillStyle;
                        ctx.shadowBlur = 10;
                        ctx.beginPath();
                        ctx.arc(strikeX, pitchToY(pitch), 8, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    });
                }
            } else {
                // ENSEMBLE VIEW
                const laneHeight = height / Math.max(1, tracks.length);
                tracks.forEach((track, idx) => {
                    const laneY = idx * laneHeight;
                    const isSelected = track.part.id === selectedPartId;

                    ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.08)' : (idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent');
                    ctx.fillRect(0, laneY, width, laneHeight);

                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                    ctx.beginPath();
                    ctx.moveTo(0, laneY + laneHeight);
                    ctx.lineTo(width, laneY + laneHeight);
                    ctx.stroke();

                    ctx.fillStyle = isSelected ? '#ffffff' : track.part.color;
                    ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
                    ctx.fillText(track.part.name, 12, laneY + laneHeight / 2 + 4);

                    const visible = track.notes.filter(n =>
                        n.startBeats + n.durationBeats >= beats - 2 &&
                        n.startBeats <= beats + (width - strikeX) / pixelsPerBeat + 2
                    );

                    visible.forEach(n => {
                        const x = strikeX + (n.startBeats - beats) * pixelsPerBeat;
                        const w = Math.max(10, n.durationBeats * pixelsPerBeat - 2);
                        const h = laneHeight * 0.6;
                        ctx.fillStyle = track.part.color;
                        ctx.beginPath();
                        ctx.roundRect(x, laneY + (laneHeight - h) / 2, w, h, 4);
                        ctx.fill();
                    });
                });

                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(strikeX, 0);
                ctx.lineTo(strikeX, height);
                ctx.stroke();
            }
        };

        let animId: number;
        const tick = () => {
            const now = performance.now();
            if (lastStepTimeRef.current === 0) lastStepTimeRef.current = now;
            const elapsed = (now - lastStepTimeRef.current) / 1000;
            const beats = isPlaying
                ? Math.max(lastBeatsRef.current, lastBeatsRef.current + elapsed * (effectiveBpm / 60))
                : currentBeats;
            render(beats);
            if (isPlaying) {
                animId = requestAnimationFrame(tick);
            }
        };

        animId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animId);
    }, [tracks, selectedPartId, subMode, currentBeats, targetNotes, playedPitches, isCurrentNoteHit, isPlaying, effectiveBpm, activeTrack]);

    return (
        <Paper
            elevation={2}
            sx={{
                position: 'relative',
                width: '100%',
                bgcolor: '#0e101a',
                borderRadius: 2.5,
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                my: 2,
            }}
        >
            <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" fontWeight={700} color="primary.light">
                        {subMode === 'focus' ? `${activeTrack?.part.name || 'Lead'}` : t('games.melodiq_notes.all_instruments', 'Alle Instrumente')}
                    </Typography>
                    <Chip label="60 FPS" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.62rem', color: 'text.secondary' }} />
                </Stack>

                <ToggleButtonGroup size="small" value={subMode} exclusive onChange={(_, val) => val && onSubModeChange(val as ModernViewSubMode)}>
                    <ToggleButton value="focus" sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem' }}>
                        <CenterFocusStrongIcon sx={{ fontSize: 16, mr: 0.5 }} />
                        {t('games.melodiq_notes.submode_focus', 'Fokus')}
                    </ToggleButton>
                    <ToggleButton value="ensemble" sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem' }}>
                        <ViewStreamIcon sx={{ fontSize: 16, mr: 0.5 }} />
                        {t('games.melodiq_notes.submode_ensemble', 'Band')}
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <canvas
                ref={canvasRef}
                width={880}
                height={280}
                style={{ width: '100%', height: '280px', display: 'block' }}
            />
        </Paper>
    );
};
