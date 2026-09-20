/** Asset utility helpers for pcio parsing [ID: GAME-TABLETOP-ASSET-UTILS] */

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function detectMimeType(bytes: Uint8Array, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'gif': return 'image/gif';
  }

  if (bytes.length >= 3) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'image/webp';
    if (
      (bytes[0] === 0x3c && bytes[1] === 0x3f && bytes[2] === 0x78) ||
      (bytes[0] === 0x3c && bytes[1] === 0x73 && bytes[2] === 0x76)
    ) {
      return 'image/svg+xml';
    }
  }

  return 'image/png';
}

export function resolveAssetUrl(nameOrPath: unknown, assetFiles?: Record<string, string>): string | null {
  if (typeof nameOrPath !== 'string' || !nameOrPath.trim()) return null;
  const str = nameOrPath.trim();
  if (str.startsWith('data:') || str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }
  if (!assetFiles) return null;
  if (assetFiles[str]) return assetFiles[str];

  const clean = str.replace(/^\/+/, '');
  if (assetFiles[clean]) return assetFiles[clean];
  if (assetFiles['/' + clean]) return assetFiles['/' + clean];
  if (assetFiles['assets/' + clean]) return assetFiles['assets/' + clean];

  const base = str.split('/').pop()?.toLowerCase();
  for (const [key, dataUri] of Object.entries(assetFiles)) {
    if (key.toLowerCase() === str.toLowerCase()) return dataUri;
    const keyClean = key.replace(/^\/+/, '').toLowerCase();
    if (keyClean === clean.toLowerCase()) return dataUri;
    if (base && key.split('/').pop()?.toLowerCase() === base) return dataUri;
  }
  return null;
}
