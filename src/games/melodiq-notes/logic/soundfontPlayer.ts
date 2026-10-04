import type { InstrumentCategory } from '../types';
import { SOUNDFONT_BASE_URLS, type SoundfontProvider } from './soundSettings';
import { playSynthesizedNote, type ActiveVoice } from './instrumentSynth';

// Pitch number to MIDI note name (e.g. 60 -> "C4", 61 -> "Db4", 69 -> "A4")
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function midiToNoteName(midi: number): string {
    const octave = Math.floor(midi / 12) - 1;
    const name = NOTE_NAMES[midi % 12];
    return `${name}${octave}`;
}

export class SoundfontPlayer {
    private audioCtx: AudioContext;
    private bufferCache: Map<string, AudioBuffer> = new Map();
    private rawDataCache: Map<string, Record<string, string>> = new Map();
    private loadingPromises: Map<string, Promise<void>> = new Map();

    constructor(audioCtx: AudioContext) {
        this.audioCtx = audioCtx;
    }

    /**
     * Converts a base64 data URI into an AudioBuffer
     */
    private async decodeBase64Audio(dataUri: string): Promise<AudioBuffer | null> {
        try {
            const base64Data = dataUri.split(',')[1] || dataUri;
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return await this.audioCtx.decodeAudioData(bytes.buffer.slice(0));
        } catch {
            return null;
        }
    }

    /**
     * Loads a soundfont bank definition without decoding all notes at once
     */
    async loadInstrumentBank(provider: SoundfontProvider, instrumentSlug: string, customBaseUrl?: string): Promise<void> {
        const cacheKey = `${provider}_${instrumentSlug}`;
        if (this.rawDataCache.has(cacheKey)) return;
        const existing = this.loadingPromises.get(cacheKey);
        if (existing) return existing;

        const loadPromise = (async () => {
            const baseUrl = (provider === 'custom' && customBaseUrl)
                ? customBaseUrl
                : SOUNDFONT_BASE_URLS[provider];

            if (!baseUrl) return;

            try {
                const url = `${baseUrl}${instrumentSlug}-mp3.js`;
                const response = await fetch(url);
                if (!response.ok) return;

                const text = await response.text();
                // Extract the JSON object from MIDI.Soundfont.<slug> = { ... }
                const jsonMatch = text.match(/MIDI\.Soundfont\.[a-zA-Z0-9_-]+\s*=\s*(\{[\s\S]*\});?\s*$/);
                if (!jsonMatch) return;

                const rawData = JSON.parse(jsonMatch[1]) as Record<string, string>;
                this.rawDataCache.set(cacheKey, rawData);
            } catch (err) {
                console.warn(`[SoundfontPlayer] Could not load soundfont for ${instrumentSlug}:`, err);
            }
        })();

        this.loadingPromises.set(cacheKey, loadPromise);
        return loadPromise;
    }

    /**
     * Plays a note using either soundfont sample or WebAudio synth fallback
     */
    play(
        provider: SoundfontProvider,
        instrumentSlug: string,
        category: InstrumentCategory,
        midiPitch: number,
        durationSeconds: number = 0.5,
        volume: number = 0.8,
        customBaseUrl?: string
    ): ActiveVoice {
        if (provider === 'synth') {
            return playSynthesizedNote(this.audioCtx, category, midiPitch, durationSeconds, volume);
        }

        const noteName = midiToNoteName(midiPitch);
        const cacheKey = `${provider}_${instrumentSlug}_${noteName}`;
        const cachedBuffer = this.bufferCache.get(cacheKey);

        if (cachedBuffer) {
            const now = this.audioCtx.currentTime;
            const source = this.audioCtx.createBufferSource();
            const gainNode = this.audioCtx.createGain();

            source.buffer = cachedBuffer;
            const dur = Math.max(0.1, durationSeconds);
            gainNode.gain.setValueAtTime(Math.min(1, Math.max(0, volume)), now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + dur);

            source.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
            source.start(now);
            source.stop(now + dur + 0.05);

            return {
                stop: () => {
                    try {
                        const stopNow = this.audioCtx.currentTime;
                        gainNode.gain.linearRampToValueAtTime(0.0001, stopNow + 0.03);
                        source.stop(stopNow + 0.04);
                    } catch { /* ignore */ }
                }
            };
        }

        // Decode single note on-demand if bank data is cached, otherwise fetch bank
        const bankKey = `${provider}_${instrumentSlug}`;
        const rawBank = this.rawDataCache.get(bankKey);
        if (rawBank && rawBank[noteName]) {
            this.decodeBase64Audio(rawBank[noteName]).then(buf => {
                if (buf) this.bufferCache.set(cacheKey, buf);
            });
        } else {
            this.loadInstrumentBank(provider, instrumentSlug, customBaseUrl).catch(() => {});
        }

        // Immediate fallback to synthesized instrument (zero latency)
        return playSynthesizedNote(this.audioCtx, category, midiPitch, durationSeconds, volume);
    }
}
