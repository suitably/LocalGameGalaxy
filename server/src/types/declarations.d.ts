declare module 'bittorrent-tracker' {
  import type { EventEmitter } from 'node:events';
  import type { IncomingMessage } from 'node:http';
  import type { Duplex } from 'node:stream';

  export interface TrackerServerOptions {
    http?: boolean;
    udp?: boolean;
    ws?: boolean | { noServer?: boolean };
    stats?: boolean;
  }

  export class Server extends EventEmitter {
    constructor(opts?: TrackerServerOptions);
    ws: {
      handleUpgrade: (
        request: IncomingMessage,
        socket: Duplex,
        head: Buffer,
        callback: (ws: unknown) => void
      ) => void;
      emit: (event: string, ...args: unknown[]) => void;
    };
    listen(port: number, hostname?: string, callback?: () => void): void;
    close(callback?: (err?: Error) => void): void;
  }
}
