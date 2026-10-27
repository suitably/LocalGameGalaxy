export interface ComposeHostPaths {
  config: string;
  music: string;
  models: string;
  tabletop: string;
  notes: string;
}

export interface ComposeGeneratorOptions {
  melodiq: boolean;
  tabletop: boolean;
  notes: boolean;
  /** `full` image with PyTorch stem separation and Whisper alignment (Melodiq only). */
  aiImage: boolean;
  signaling: boolean;
  tunnel: boolean;
  port: number;
  signalingPort: number;
  /** Empty: the server generates one and prints it in its log. */
  token: string;
  /** Host folders mounted into the companion container. */
  paths: ComposeHostPaths;
}

export const DEFAULT_COMPOSE_OPTIONS: ComposeGeneratorOptions = {
  melodiq: true,
  tabletop: false,
  notes: false,
  aiImage: false,
  signaling: true,
  tunnel: false,
  port: 3000,
  signalingPort: 8000,
  token: '',
  paths: {
    config: './config',
    music: './music',
    models: './models',
    tabletop: './tabletop',
    notes: './notes',
  },
};

/** Restores saved choices; fields an older version did not store fall back to the defaults. */
export function normalizeComposeOptions(
  saved: Partial<ComposeGeneratorOptions> | null,
): ComposeGeneratorOptions {
  const base = DEFAULT_COMPOSE_OPTIONS;
  if (!saved || typeof saved !== 'object') return base;
  return {
    ...base,
    ...saved,
    port: validPort(saved.port) ?? base.port,
    signalingPort: validPort(saved.signalingPort) ?? base.signalingPort,
    token: sanitizeToken(saved.token ?? ''),
    paths: { ...base.paths, ...(saved.paths ?? {}) },
  };
}

export function validPort(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : null;
}

/** Tokens go into an env line, so only plain characters are kept. */
export const sanitizeToken = (token: string): string => token.replace(/[^A-Za-z0-9_-]/g, '');

export function hasCompanion(options: ComposeGeneratorOptions): boolean {
  return options.melodiq || options.tabletop || options.notes;
}

/** Companion server plugins for the selected games (`PLUGINS` env of `server/`). */
export function companionPlugins(options: ComposeGeneratorOptions): string[] {
  return [
    'relay',
    ...(options.melodiq ? ['melodiq'] : []),
    ...(options.tabletop ? ['tabletop'] : []),
    ...(options.notes ? ['notes'] : []),
  ];
}

/** Double-quoted YAML scalar, so host paths with spaces or colons stay one value. */
const quote = (value: string): string => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const hostPath = (value: string, fallback: string): string => value.trim() || fallback;

function signalingService(options: ComposeGeneratorOptions): string[] {
  return [
    '  # WebRTC signaling (self-hosted tracker for all games)',
    '  signaling:',
    '    image: nexumia/galaxy-signaling:latest',
    '    container_name: galaxy-signaling',
    '    restart: unless-stopped',
    '    ports:',
    `      - ${quote(`${options.signalingPort}:8000`)}`,
    '    environment:',
    '      - PORT=8000',
    '      - NODE_ENV=production',
    '    healthcheck:',
    '      test: ["CMD", "wget", "-qO-", "http://localhost:8000/health"]',
    '      interval: 30s',
    '      timeout: 5s',
    '      retries: 3',
  ];
}

function companionVolumes(options: ComposeGeneratorOptions): string[] {
  const p = options.paths;
  const d = DEFAULT_COMPOSE_OPTIONS.paths;
  const mount = (host: string, fallback: string, target: string, comment: string) =>
    `      - ${quote(`${hostPath(host, fallback)}:${target}`)} # ${comment}`;
  return [
    '    volumes:',
    mount(p.config, d.config, '/app/config', 'config.json with token and API keys'),
    ...(options.melodiq
      ? [
          mount(p.music, d.music, '/app/music', 'Melodiq: UltraStar song library'),
          mount(p.models, d.models, '/app/models', 'Melodiq: AI models'),
        ]
      : []),
    ...(options.tabletop
      ? [mount(p.tabletop, d.tabletop, '/app/tabletop', 'Tabletop: games, saved ones in saved/')]
      : []),
    ...(options.notes
      ? [
          mount(
            p.notes,
            d.notes,
            '/app/notes',
            'old Melodiq Notes library (moved into song folders)',
          ),
        ]
      : []),
  ];
}

function companionService(options: ComposeGeneratorOptions): string[] {
  const image = options.aiImage && options.melodiq ? 'full' : 'latest';
  return [
    '',
    '  # Companion server: one container, one plugin per game',
    '  companion:',
    `    image: nexumia/nexumia-server:${image}`,
    '    container_name: galaxy-companion',
    '    restart: unless-stopped',
    '    ports:',
    `      - ${quote(`${options.port}:3000`)}`,
    ...companionVolumes(options),
    '    environment:',
    '      - PORT=3000',
    '      - NODE_ENV=production',
    `      - PLUGINS=${companionPlugins(options).join(',')}`,
    ...(options.melodiq ? ['      - MUSIC_DIR=/app/music'] : []),
    ...(options.tabletop ? ['      - TABLETOP_DIR=/app/tabletop'] : []),
    ...(options.notes ? ['      - NOTES_DIR=/app/notes'] : []),
    '      - CONFIG_PATH=/app/config/config.json',
    options.token
      ? `      - SECURITY_TOKEN=${sanitizeToken(options.token)}`
      : '      - SECURITY_TOKEN= # empty: generated on first start, see the container log',
    '      - ENABLE_TUNNEL=false',
    '      - ALLOWED_ORIGINS=*',
    '    healthcheck:',
    '      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]',
    '      interval: 30s',
    '      timeout: 10s',
    '      start_period: 60s',
    '      retries: 3',
  ];
}

function tunnelService(name: string, target: string, dependsOn: string): string[] {
  return [
    '',
    '  # Cloudflare quick tunnel (public HTTPS URL, see the container log)',
    `  ${name}:`,
    '    image: cloudflare/cloudflared:latest',
    `    container_name: ${name}`,
    '    restart: unless-stopped',
    `    command: tunnel --no-autoupdate --url ${target}`,
    '    depends_on:',
    `      - ${dependsOn}`,
  ];
}

/**
 * docker-compose.yml for self-hosting. Push notifications need no container: they run via
 * ntfy or the Cloudflare worker in `server/cloudflare-push-relay/`.
 */
export function generateComposeYaml(options: ComposeGeneratorOptions): string {
  const companion = hasCompanion(options);
  const lines = ['services:'];
  if (options.signaling) lines.push(...signalingService(options));
  if (companion) lines.push(...companionService(options));

  if (options.tunnel && companion) {
    lines.push(...tunnelService('companion-tunnel', 'http://companion:3000', 'companion'));
  } else if (options.tunnel && options.signaling) {
    lines.push(...tunnelService('signaling-tunnel', 'http://signaling:8000', 'signaling'));
  }

  if (lines.length === 1) lines.push('  {}');
  return lines.join('\n') + '\n';
}
