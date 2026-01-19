declare module 'simple-peer' {
    namespace SimplePeer {
        interface Options {
            initiator?: boolean;
            channelConfig?: RTCDataChannelInit;
            channelName?: string;
            config?: RTCConfiguration;
            offerOptions?: RTCOfferOptions;
            answerOptions?: RTCAnswerOptions;
            sdpTransform?: (sdp: string) => string;
            stream?: MediaStream;
            streams?: MediaStream[];
            trickle?: boolean;
            allowHalfTrickle?: boolean;
            objectMode?: boolean;
        }

        interface SignalData {
            type?: 'offer' | 'answer' | 'pranswer' | 'rollback';
            sdp?: string;
            candidate?: RTCIceCandidateInit;
        }

        interface Instance {
            signal(data: SignalData): void;
            send(data: string | ArrayBuffer | ArrayBufferView): void;
            destroy(err?: Error): void;
            on(event: 'signal', listener: (data: SignalData) => void): this;
            on(event: 'connect', listener: () => void): this;
            on(event: 'data', listener: (data: ArrayBuffer) => void): this;
            on(event: 'stream', listener: (stream: MediaStream) => void): this;
            on(event: 'track', listener: (track: MediaStreamTrack, stream: MediaStream) => void): this;
            on(event: 'close', listener: () => void): this;
            on(event: 'error', listener: (err: Error) => void): this;
            on(event: string, listener: (...args: any[]) => void): this;
        }
    }

    interface SimplePeerConstructor {
        new(opts?: SimplePeer.Options): SimplePeer.Instance;
        (opts?: SimplePeer.Options): SimplePeer.Instance;
    }

    const SimplePeer: SimplePeerConstructor;
    export = SimplePeer;
}
