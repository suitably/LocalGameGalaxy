import { type PitchResult, computeRMS, autoCorrelate, freqToMidi } from './AudioUtils';

export { type PitchResult };

export interface AudioStats {
    volume: number;
    contextState: string;
}

export class MicrophoneManager {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private mediaStream: MediaStream | null = null;
    private buffer: Float32Array | null = null;
    private source: MediaStreamAudioSourceNode | null = null;

    constructor() { }

    public static async getDevices(): Promise<MediaDeviceInfo[]> {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(d => d.kind === 'audioinput');
    }

    public async start(deviceId?: string): Promise<void> {
        if (this.audioContext) return;

        try {
            const audioConstraints: MediaTrackConstraints = {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false
            };
            try {
                this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
            } catch (constraintErr: any) {
                if (constraintErr.name === 'OverconstrainedError' && deviceId) {
                    console.warn(`[MicrophoneManager] Device "${deviceId}" not found, falling back to default mic.`);
                    this.mediaStream = await navigator.mediaDevices.getUserMedia({
                        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false }
                    });
                } else {
                    throw constraintErr;
                }
            }

            this.audioContext = new AudioContext({ latencyHint: 'interactive' });

            // Critical: Resume context if suspended (common in some browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                // Check if stopped during await
                if (!this.audioContext) return;
            }

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;

            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Branch 1: Analysis (Always raw input)
            this.source.connect(this.analyser);

            this.buffer = new Float32Array(this.analyser.fftSize);
        } catch (err) {
            console.error('Error initializing microphone:', err);
            throw err;
        }
    }



    public async stop(): Promise<void> {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        if (this.audioContext) {
            if (this.audioContext.state !== 'closed') {
                try {
                    await this.audioContext.close();
                } catch (e) {
                    console.warn('[MicrophoneManager] Error closing AudioContext:', e);
                }
            }
            this.audioContext = null;
        }
        this.analyser = null;
        this.source = null;
        this.buffer = null;
    }

    public get isActive(): boolean {
        return !!this.audioContext;
    }

    public get context(): AudioContext | null {
        return this.audioContext;
    }

    public getCurrentVolume(): number {
        if (!this.analyser || !this.buffer) return 0;
        this.analyser.getFloatTimeDomainData(this.buffer as any);
        return computeRMS(this.buffer);
    }

    public getPitch(): PitchResult | null {
        if (!this.analyser || !this.buffer || !this.audioContext) return null;

        // Note: getCurrentVolume refills the buffer if called immediately before this, which is fine
        this.analyser.getFloatTimeDomainData(this.buffer as any);

        const volume = computeRMS(this.buffer);
        if (volume < 0.01) {
            // Signal too quiet
            return null;
        }

        const frequency = autoCorrelate(this.buffer, this.audioContext.sampleRate);
        if (frequency === -1) {
            return null;
        }

        const note = freqToMidi(frequency);

        return { frequency, note, volume };
    }
}
