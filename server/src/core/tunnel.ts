import { spawn, type ChildProcess } from 'child_process';

export class CloudflareTunnel {
  private process: ChildProcess | null = null;
  private tunnelUrl: string | null = null;

  public async start(localPort: number): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        // Run cloudflared tunnel --url http://localhost:PORT
        this.process = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${localPort}`], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;
        let resolved = false;

        const handleOutput = (data: Buffer) => {
          const text = data.toString();
          const match = text.match(urlRegex);
          if (match && !resolved) {
            resolved = true;
            this.tunnelUrl = match[0];
            resolve(this.tunnelUrl);
          }
        };

        this.process.stdout?.on('data', handleOutput);
        this.process.stderr?.on('data', handleOutput);

        this.process.on('error', (err) => {
          console.warn('[Tunnel] cloudflared not found or error:', err.message);
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        });

        // 12s timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(this.tunnelUrl);
          }
        }, 12000);
      } catch (e) {
        console.warn('[Tunnel] Failed to start tunnel:', e);
        resolve(null);
      }
    });
  }

  public getUrl(): string | null {
    return this.tunnelUrl;
  }

  public stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

export const cloudflareTunnel = new CloudflareTunnel();
