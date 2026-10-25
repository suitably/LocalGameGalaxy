import { spawn } from 'node:child_process';
import fs from 'node:fs';

/**
 * Whether the server may open the user's browser: never in Docker/CI or when
 * NO_BROWSER=true, since there is no desktop to open it on.
 */
export const canOpenBrowser = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.NO_BROWSER !== 'true' && !env.CI && !fs.existsSync('/.dockerenv');

/** Opens `url` in the default browser; failures are ignored (the URL is printed anyway). */
export const openBrowser = (url: string): void => {
  const [cmd, args]: [string, string[]] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '""', url.replace(/&/g, '^&')]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    child.on('error', () => undefined);
    child.unref();
  } catch {
    // No browser available: the console shows the URL.
  }
};
