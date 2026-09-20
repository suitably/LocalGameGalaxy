export interface ComposeGeneratorOptions {
    melodiq: boolean;
    tabletop: boolean;
    push: boolean;
    tunnel: boolean;
}

export function generateComposeYaml(options: ComposeGeneratorOptions): string {
    const lines: string[] = [
        'services:',
        '  # ══════════════════════════════════════════════════════════════════',
        '  # 1. Platform Infrastructure (WebRTC Signaling für alle Spiele)',
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

    if (options.melodiq || options.tabletop || options.push) {
        lines.push(
            '',
            '  # ══════════════════════════════════════════════════════════════════',
            '  # 2. Game Companion Services (Modulare Plugins)',
            '  # ══════════════════════════════════════════════════════════════════'
        );
    }

    if (options.melodiq) {
        lines.push(
            '',
            '  # MelodiQ Karaoke Companion (KI-Stem-Separation, Whisper, Streaming)',
            '  melodiq:',
            '    image: nexumia/melodiq-server:latest',
            '    container_name: melodiq-server',
            '    restart: unless-stopped',
            '    ports:',
            '      - "3000:3000"',
            '    volumes:',
            '      # Pfad zu deinem Musikordner anpassen:',
            '      - ./music:/app/music',
            '      - ./config:/app/config',
            '      - ./models:/app/models',
            '    environment:',
            '      - PORT=3000',
            '      - NODE_ENV=production',
            '      - MUSIC_DIR=/app/music',
            '      - CONFIG_PATH=/app/config/config.json',
            '      - SECURITY_TOKEN=             # Automatisch generiert wenn leer',
            '      - ENABLE_TUNNEL=false',
            '      - ALLOWED_ORIGINS=*',
            '    healthcheck:',
            '      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]',
            '      interval: 30s',
            '      timeout: 10s',
            '      start_period: 60s',
            '      retries: 3'
        );
    }

    if (options.tabletop) {
        lines.push(
            '',
            '  # Tabletop Asset & Sync Companion (BYOG Games, TTS/PCIO Decks)',
            '  tabletop:',
            '    image: nexumia/tabletop-companion:latest',
            '    container_name: tabletop-companion',
            '    restart: unless-stopped',
            '    ports:',
            '      - "3002:3002"',
            '    volumes:',
            '      # Pfad zu deinem Spieleordner anpassen:',
            '      - ./tabletop-games:/app/games',
            '      - ./config:/app/config',
            '    environment:',
            '      - PORT=3002',
            '      - NODE_ENV=production',
            '      - GAMES_DIR=/app/games',
            '      - ALLOWED_ORIGINS=*',
            '    healthcheck:',
            '      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]',
            '      interval: 30s',
            '      timeout: 5s',
            '      retries: 3'
        );
    }

    if (options.push) {
        lines.push(
            '',
            '  # Push Relay (Web Push & ntfy.sh Topic Sync)',
            '  push-relay:',
            '    image: nexumia/galaxy-push-relay:latest',
            '    container_name: galaxy-push-relay',
            '    restart: unless-stopped',
            '    ports:',
            '      - "3001:3001"',
            '    environment:',
            '      - PORT=3001',
            '      - NODE_ENV=production'
        );
    }

    if (options.tunnel) {
        lines.push(
            '',
            '  # ══════════════════════════════════════════════════════════════════',
            '  # 3. Cloudflare Quick Tunnel (Internet-Freigabe)',
            '  # ══════════════════════════════════════════════════════════════════'
        );

        if (options.melodiq) {
            lines.push(
                '',
                '  # Cloudflare Quick Tunnel für MelodiQ',
                '  melodiq-tunnel:',
                '    image: cloudflare/cloudflared:latest',
                '    container_name: melodiq-tunnel',
                '    restart: unless-stopped',
                '    command: tunnel --no-autoupdate --url http://melodiq:3000',
                '    depends_on:',
                '      - melodiq'
            );
        }

        if (options.tabletop) {
            lines.push(
                '',
                '  # Cloudflare Quick Tunnel für Tabletop',
                '  tabletop-tunnel:',
                '    image: cloudflare/cloudflared:latest',
                '    container_name: tabletop-tunnel',
                '    restart: unless-stopped',
                '    command: tunnel --no-autoupdate --url http://tabletop:3002',
                '    depends_on:',
                '      - tabletop'
            );
        }

        if (!options.melodiq && !options.tabletop) {
            lines.push(
                '',
                '  # Cloudflare Quick Tunnel für WebRTC Signaling',
                '  signaling-tunnel:',
                '    image: cloudflare/cloudflared:latest',
                '    container_name: signaling-tunnel',
                '    restart: unless-stopped',
                '    command: tunnel --no-autoupdate --url http://signaling:8000',
                '    depends_on:',
                '      - signaling'
            );
        }
    }

    return lines.join('\n') + '\n';
}
