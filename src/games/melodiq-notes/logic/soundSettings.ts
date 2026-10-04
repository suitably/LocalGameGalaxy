import { storage, STORAGE_KEYS } from '../../../lib/storage';
import type { InstrumentCategory } from '../types';

export type SoundfontProvider = 'fluid' | 'musyng' | 'synth' | 'custom';

export interface InstrumentSoundConfig {
    provider: SoundfontProvider;
    customBaseUrl?: string;
    /** Map of partId or category to custom GM preset or sample URL */
    customPresets: Record<string, string>;
    customUrls: Record<string, string>;
    volumes: Record<string, number>;
}

export const SOUNDFONT_BASE_URLS: Record<SoundfontProvider, string> = {
    fluid: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/',
    musyng: 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/',
    synth: '',
    custom: '',
};

/**
 * Maps General MIDI program number (1-based) to soundfont filename slug
 */
export const GM_PROGRAM_TO_SOUNDFONT: Record<number, string> = {
    // Piano
    1: 'acoustic_grand_piano',
    2: 'bright_acoustic_piano',
    3: 'electric_grand_piano',
    4: 'honkytonk_piano',
    5: 'electric_piano_1',
    // Guitar
    25: 'acoustic_guitar_nylon',
    26: 'acoustic_guitar_steel',
    27: 'electric_guitar_jazz',
    28: 'electric_guitar_clean',
    29: 'electric_guitar_muted',
    30: 'overdriven_guitar',
    31: 'distortion_guitar',
    // Bass
    33: 'acoustic_bass',
    34: 'electric_bass_finger',
    35: 'electric_bass_pick',
    36: 'fretless_bass',
    37: 'slap_bass_1',
    // Strings
    41: 'violin',
    42: 'viola',
    43: 'cello',
    44: 'contrabass',
    49: 'string_ensemble_1',
    // Flute / Winds
    73: 'piccolo',
    74: 'flute',
    75: 'recorder',
    76: 'pan_flute',
    // Drums / Percussion
    119: 'synth_drum',
    128: 'standard_drum',
};

/**
 * Fallback mapping from instrument category to default soundfont slug
 */
export const CATEGORY_TO_SOUNDFONT: Record<InstrumentCategory, string> = {
    flute: 'flute',
    guitar: 'electric_guitar_clean',
    bass: 'electric_bass_finger',
    strings: 'string_ensemble_1',
    drums: 'synth_drum',
    piano: 'acoustic_grand_piano',
    other: 'acoustic_grand_piano',
};

export const DEFAULT_SOUND_CONFIG: InstrumentSoundConfig = {
    provider: 'fluid',
    customPresets: {},
    customUrls: {},
    volumes: {},
};

export function getStoredSoundConfig(): InstrumentSoundConfig {
    try {
        const stored = storage.getJson<InstrumentSoundConfig | null>(STORAGE_KEYS.MELODIQ_NOTES_SOUND_CONFIG, null);
        if (stored && typeof stored === 'object') {
            return {
                ...DEFAULT_SOUND_CONFIG,
                ...stored,
            };
        }
    } catch {
        // Fall back to default
    }
    return DEFAULT_SOUND_CONFIG;
}

export function saveStoredSoundConfig(config: InstrumentSoundConfig): void {
    storage.setJson(STORAGE_KEYS.MELODIQ_NOTES_SOUND_CONFIG, config);
}

export function resolveSoundfontName(midiProgram?: number, category: InstrumentCategory = 'other'): string {
    if (midiProgram && GM_PROGRAM_TO_SOUNDFONT[midiProgram]) {
        return GM_PROGRAM_TO_SOUNDFONT[midiProgram];
    }
    return CATEGORY_TO_SOUNDFONT[category] || 'acoustic_grand_piano';
}
