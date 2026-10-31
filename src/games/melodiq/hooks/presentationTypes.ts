// Minimal Presentation API Type Definitions
interface PresentationConnectionCloseEvent extends Event {
  reason: 'error' | 'closed' | 'wentaway';
  message: string;
}

export interface PresentationConnection extends EventTarget {
  id: string;
  state: 'connecting' | 'connected' | 'closed' | 'terminated';
  send(message: string | ArrayBuffer): void;
  close(): void;
  terminate(): void;
  onconnect: ((this: PresentationConnection, ev: Event) => void) | null;
  onclose: ((this: PresentationConnection, ev: PresentationConnectionCloseEvent) => void) | null;
  onterminate: ((this: PresentationConnection, ev: Event) => void) | null;
  onmessage: ((this: PresentationConnection, ev: MessageEvent) => void) | null;
}

interface PresentationRequest extends EventTarget {
  start(): Promise<PresentationConnection>;
  reconnect(id: string): Promise<PresentationConnection>;
  getAvailability(): Promise<PresentationAvailability>;
  onconnectionavailable:
    ((this: PresentationRequest, ev: PresentationConnectionAvailableEvent) => void) | null;
}

interface PresentationConnectionAvailableEvent extends Event {
  connection: PresentationConnection;
}

interface PresentationAvailability extends EventTarget {
  value: boolean;
  onchange: ((this: PresentationAvailability, ev: Event) => void) | null;
}

declare global {
  interface Window {
    PresentationRequest: {
      new (urls: string | string[]): PresentationRequest;
    };
  }
}
