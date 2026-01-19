declare module 'bittorrent-tracker' {
    interface ClientOptions {
        infoHash: Buffer | string;
        peerId: Buffer | string;
        announce: string[];
        port?: number;
    }

    class Client {
        constructor(options: ClientOptions);
        start(): void;
        destroy(): void;
        on(event: string, listener: (...args: any[]) => void): this;
        once(event: string, listener: (...args: any[]) => void): this;
        off(event: string, listener: (...args: any[]) => void): this;
    }

    export = Client;
}
