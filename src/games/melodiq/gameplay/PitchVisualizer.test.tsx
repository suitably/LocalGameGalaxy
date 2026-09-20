import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createRef } from 'react';
import { PitchVisualizer, type SongWithNotes, type SungSegment } from './PitchVisualizer';
import { type PitchResult } from '../audio/MicrophoneManager';

describe('PitchVisualizer', () => {
    it('renders to HTML string without crashing and handles new ref objects on re-render', () => {
        const dummySong: SongWithNotes = {
            id: 'test-song-1',
            title: 'Test Song',
            artist: 'Test Artist',
            bpm: 120,
            gap: 0,
            notes: []
        };
        const audioRef = createRef<HTMLAudioElement>();
        const initialPitchRef = { current: { note: 60, frequency: 261.63, clarity: 0.9, volume: 0.5 } as PitchResult | null };
        const initialSungSegmentsRef = { current: {} as Record<number, SungSegment[]> };

        // Render initial
        const html1 = renderToString(
            <PitchVisualizer
                song={dummySong}
                audioRef={audioRef}
                currentPitchRef={initialPitchRef}
                sungSegmentsRef={initialSungSegmentsRef}
            />
        );

        expect(html1).toContain('<canvas');

        // Re-render with new ref object instances
        const updatedPitchRef = { current: { note: 72, frequency: 523.25, clarity: 0.95, volume: 0.8 } as PitchResult | null };
        const updatedSungSegmentsRef = {
            current: {
                0: [{ noteIndex: 0, startBeat: 0, endBeat: 4, trackIndex: 0 }]
            } as Record<number, SungSegment[]>
        };

        const html2 = renderToString(
            <PitchVisualizer
                song={dummySong}
                audioRef={audioRef}
                currentPitchRef={updatedPitchRef}
                sungSegmentsRef={updatedSungSegmentsRef}
            />
        );

        expect(html2).toContain('<canvas');
    });
});
