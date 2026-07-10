# Secrets & Local Configuration Management [ID: TECH-SECRETS]

To run the LocalGameGalaxy companion server and frontend locally with secure contexts (HTTPS/WSS required for WebRTC and Web Audio APIs), developers must manage local configurations and self-signed certificates.

---

## 1. Local Configuration Setup

The root `config.json` contains directories for song ingestion, port settings, security tokens, and SSL keys/certificates. This file is excluded from Git to prevent exposing credentials and environment-specific paths.

To configure your local environment:
1. Copy the example configuration file:
   ```bash
   cp config.example.json config.json
   ```
2. Open `config.json` and adjust the configuration values to match your local setup.

---

## 2. Generating a Security Token

The `token` field is used to authenticate requests between the game clients (phones, TVs) and the companion server. You can generate a secure random token using the following command:

```bash
# On Linux/macOS:
openssl rand -hex 16
# Example output: b90f665727cae0b570256b32acefe34e
```

Paste this generated value into the `"token"` field in your `config.json`.

---

## 3. Generating Self-Signed SSL Certificates

WebRTC and Web Audio APIs (used for audio streaming, microphone pitch detection, and multiplayer sync) require a secure context (HTTPS/WSS) when running on local network devices (e.g., testing on actual mobile phones connected to a computer).

To generate a self-signed key and certificate valid for local development:

```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

After generating `key.pem` and `cert.pem`:
1. Open both files in a text editor.
2. Copy the full content of `key.pem` (including the header and footer) and paste it into the `"ssl"."key"` field in your `config.json`. Make sure to replace newlines with `\n` or format it as a valid JSON string.
3. Copy the full content of `cert.pem` and paste it into the `"ssl"."cert"` field.

---

## 4. Registering client certificates on Mobile Devices
For Chrome and other browsers on Android to accept the self-signed certificate, you may need to:
1. Install the generated `cert.pem` on your phone (Settings > Security > More Security Settings > Encryption & credentials > Install a certificate > CA certificate).
2. Or use a tool like `mkcert` to generate certificates trusted by your local machines and devices.
