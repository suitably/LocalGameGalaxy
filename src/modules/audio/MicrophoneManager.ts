import { type PitchResult, computeRMS, autoCorrelate, freqToMidi } from './AudioUtils';

export { type PitchResult };

export interface AudioStats {
  volume: number;
  contextState: string;
}

/**
 * `MicrophoneManager` — Local Microphone Audio Capture & Pitch Detection
 *
 * Manages the complete lifecycle of microphone access and real-time pitch
 * analysis for local users.
 */
export class MicrophoneManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  /** Software input gain (1 = unchanged); boosts quiet microphones before analysis. */
  private gain = 1;

  constructor() {}

  public static async getDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'audioinput');
  }

  public async start(deviceId?: string, gain = this.gain): Promise<void> {
    if (this.audioContext) return;
    this.gain = gain;

    try {
      const audioConstraints: MediaTrackConstraints = {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
      };
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch (constraintErr: unknown) {
        const isOverconstrained =
          constraintErr instanceof DOMException && constraintErr.name === 'OverconstrainedError';
        if (isOverconstrained && deviceId) {
          console.warn(
            `[MicrophoneManager] Device "${deviceId}" not found, falling back to default mic.`,
          );
          this.mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false },
          });
        } else {
          throw constraintErr;
        }
      }

      this.audioContext = new AudioContext({ latencyHint: 'interactive' });

      // Critical: Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        if (!this.audioContext) return;
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.gain;
      this.source.connect(this.gainNode);
      this.gainNode.connect(this.analyser);

      this.buffer = new Float32Array(this.analyser.fftSize);
    } catch (err) {
      console.error('Error initializing microphone:', err);
      throw err;
    }
  }

  public async stop(): Promise<void> {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
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
    this.gainNode = null;
    this.buffer = null;
  }

  /** Changes the input gain, also while running (e.g. from a settings slider). */
  public setGain(gain: number): void {
    this.gain = gain;
    if (this.gainNode) this.gainNode.gain.value = gain;
  }

  public get isActive(): boolean {
    return !!this.audioContext;
  }

  public get context(): AudioContext | null {
    return this.audioContext;
  }

  public getCurrentVolume(): number {
    if (!this.analyser || !this.buffer) return 0;
    this.analyser.getFloatTimeDomainData(this.buffer);
    return computeRMS(this.buffer);
  }

  public getPitch(): PitchResult | null {
    if (!this.analyser || !this.buffer || !this.audioContext) return null;

    this.analyser.getFloatTimeDomainData(this.buffer);

    const volume = computeRMS(this.buffer);
    if (volume < 0.01) {
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
