export interface ComposeGeneratorOptions {
  melodiq: boolean;
  tabletop: boolean;
  tunnel: boolean;
}

/** Companion server plugins for the selected games (`PLUGINS` env of `server/`). */
export function companionPlugins(options: ComposeGeneratorOptions): string[] {
  return [
    'relay',
    ...(options.melodiq ? ['melodiq'] : []),
    ...(options.tabletop ? ['tabletop'] : []),
  ];
}

const SIGNALING_SERVICE = [
  '  # ══════════════════════════════════════════════════════════════════',
  '  # 1. WebRTC Signaling (self-hosted tracker for all games)',
  '  # ══════════════════════════════════════════════════════════════════',
  '  signaling:',
  '    image: nexumia/galaxy-signaling:latest',
  '    container_name: galaxy-signaling',
  '    restart: unless-stopped',
  '    ports:',
  '      - "8000:8000"',
  '    environment:',
  '      - PORT=8000',
  '      - NODE_ENV=production',
  '    healthcheck:',
  '      test: ["CMD", "wget", "-qO-", "http://localhost:8000/health"]',
  '      interval: 30s',
  '      timeout: 5s',
  '      retries: 3',
];

function companionService(options: ComposeGeneratorOptions): string[] {
  const volumes = options.melodiq
    ? [
        '    volumes:',
        '      # Pfad zu deinem Musikordner anpassen:',
        '      - ./music:/app/music',
        '      - ./config:/app/config',
        '      - ./models:/app/models',
      ]
    : ['    volumes:', '      - ./config:/app/config'];
  return [
    '',
    '  # ══════════════════════════════════════════════════════════════════',
    '  # 2. Companion Server (one container, plugins per game)',
    '  # ══════════════════════════════════════════════════════════════════',
    '  companion:',
    '    image: nexumia/melodiq-server:latest',
    '    container_name: galaxy-companion',
    '    restart: unless-stopped',
    '    ports:',
    '      - "3000:3000"',
    ...volumes,
    '    environment:',
    '      - PORT=3000',
    '      - NODE_ENV=production',
    `      - PLUGINS=${companionPlugins(options).join(',')}`,
    ...(options.melodiq ? ['      - MUSIC_DIR=/app/music'] : []),
    '      - CONFIG_PATH=/app/config/config.json',
    '      - SECURITY_TOKEN=             # Automatisch generiert wenn leer',
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
  const hasCompanion = options.melodiq || options.tabletop;
  const lines = ['services:', ...SIGNALING_SERVICE];

  if (hasCompanion) lines.push(...companionService(options));

  if (options.tunnel) {
    lines.push(
      '',
      '  # ══════════════════════════════════════════════════════════════════',
      '  # 3. Cloudflare Quick Tunnel (Internet-Freigabe)',
      '  # ══════════════════════════════════════════════════════════════════',
      ...(hasCompanion
        ? tunnelService('companion-tunnel', 'http://companion:3000', 'companion')
        : tunnelService('signaling-tunnel', 'http://signaling:8000', 'signaling')),
    );
  }

  return lines.join('\n') + '\n';
}
