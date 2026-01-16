export interface PitchResult {
    frequency: number;
    note: number; // MIDI note number (float)
    volume: number; // 0.0 to 1.0 (approx)
}

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

    public async start(): Promise<void> {
        if (this.audioContext) return;

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;

            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.source.connect(this.analyser);

            this.buffer = new Float32Array(this.analyser.fftSize);
        } catch (err) {
            console.error('Error initializing microphone:', err);
            throw err;
        }
    }

    public stop(): void {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.analyser = null;
        this.source = null;
        this.buffer = null;
    }

    public get isActive(): boolean {
        return !!this.audioContext;
    }

    public getPitch(): PitchResult | null {
        if (!this.analyser || !this.buffer || !this.audioContext) return null;

        this.analyser.getFloatTimeDomainData(this.buffer as unknown as Float32Array);

        const volume = this.computeRMS(this.buffer);
        if (volume < 0.01) {
            // Signal too quiet
            return null;
        }

        const frequency = this.autoCorrelate(this.buffer, this.audioContext.sampleRate);
        if (frequency === -1) {
            return null;
        }

        const note = this.freqToMidi(frequency);

        return { frequency, note, volume };
    }

    private computeRMS(buffer: Float32Array): number {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
        }
        return Math.sqrt(sum / buffer.length);
    }

    // A simple autocorrelation algorithm
    private autoCorrelate(buffer: Float32Array, sampleRate: number): number {
        const SIZE = buffer.length;
        let sumOfSquares = 0;
        for (let i = 0; i < SIZE; i++) {
            const val = buffer[i];
            sumOfSquares += val * val;
        }

        const rootMeanSquare = Math.sqrt(sumOfSquares / SIZE);
        if (rootMeanSquare < 0.01) {
            return -1; // Not enough signal
        }

        let r1 = 0;
        let r2 = SIZE - 1;
        const threshold = 0.2;

        // Trim buffer to meaningful signal start/end
        for (let i = 0; i < SIZE / 2; i++) {
            if (Math.abs(buffer[i]) < threshold) {
                r1 = i;
                break;
            }
        }
        for (let i = 1; i < SIZE / 2; i++) {
            if (Math.abs(buffer[SIZE - i]) < threshold) {
                r2 = SIZE - i;
                break;
            }
        }

        const trimmedBuffer = buffer.slice(r1, r2);
        const c = new Array(trimmedBuffer.length).fill(0);

        for (let i = 0; i < trimmedBuffer.length; i++) {
            for (let j = 0; j < trimmedBuffer.length - i; j++) {
                c[i] = c[i] + trimmedBuffer[j] * trimmedBuffer[j + i];
            }
        }

        let d = 0;
        while (c[d] > c[d + 1]) d++;

        let maxval = -1;
        let maxpos = -1;

        for (let i = d; i < c.length; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }

        // Parabolic interpolation usually helps with precision, but basic is okay for now
        let T0 = maxpos;

        // Parabolic interpolation
        const x1 = c[T0 - 1];
        const x2 = c[T0];
        const x3 = c[T0 + 1];
        const a = (x1 + x3 - 2 * x2) / 2;
        const b = (x3 - x1) / 2;
        if (a) T0 = T0 - b / (2 * a);

        return sampleRate / T0;
    }

    private freqToMidi(frequency: number): number {
        // MIDI note conversion: Note = 69 + 12 * log2(freq / 440)
        return 69 + 12 * Math.log2(frequency / 440);
    }
}
