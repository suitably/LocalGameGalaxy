#!/usr/bin/env node
/**
 * Prints a new VAPID key pair for the app worker's Web Push sender (cloudflare/webPushSend.ts).
 * Run it on your own machine and store both values as Cloudflare secrets; never commit them:
 *
 *   node scripts/generate-vapid-keys.mjs
 *   npx wrangler secret put VAPID_PUBLIC_KEY
 *   npx wrangler secret put VAPID_PRIVATE_KEY
 *
 * Changing the keys later makes every device subscribe again on its next visit.
 */
import { webcrypto as crypto } from 'node:crypto';

const b64url = (bytes) => Buffer.from(bytes).toString('base64url');
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
]);
const publicKey = b64url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
const { d: privateKey } = await crypto.subtle.exportKey('jwk', pair.privateKey);

console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
