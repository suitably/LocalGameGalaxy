/**
 * SVG recoloring utilities for Tabletop tokens and pieces [ID: LOGIC-TABLETOP-SVG-COLOR]
 */

const svgCache = new Map<string, string>();

/**
 * Synchronously recolors an SVG string by replacing template placeholders.
 */
export function recolorSvgText(
  svgText: string,
  primaryColor: string,
  borderColor = '#000000',
  borderWidth = '2',
): string {
  return svgText
    .split('#primaryColor').join(primaryColor)
    .split('#borderColor').join(borderColor)
    .split('#borderWidth').join(borderWidth);
}

/**
 * Synchronously recolors an SVG data URI if possible.
 */
export function recolorSvgDataUri(dataUri: string, color: string): string | null {
  if (!dataUri.startsWith('data:image/svg+xml')) return null;
  const cacheKey = `${dataUri}__${color}`;
  if (svgCache.has(cacheKey)) return svgCache.get(cacheKey)!;

  try {
    let svgText: string;
    if (dataUri.includes(';base64,')) {
      const base64 = dataUri.split(';base64,')[1];
      svgText = atob(base64);
    } else {
      const parts = dataUri.split(',');
      svgText = decodeURIComponent(parts.slice(1).join(','));
    }

    if (!svgText.includes('#primaryColor') && !svgText.includes('#borderColor')) {
      return dataUri;
    }

    const recolored = recolorSvgText(svgText, color);
    const result = 'data:image/svg+xml;utf8,' + encodeURIComponent(recolored);
    svgCache.set(cacheKey, result);
    return result;
  } catch {
    return dataUri;
  }
}

/**
 * Asynchronously fetches and recolors an SVG URL, caching the resulting data URI.
 */
export async function fetchAndRecolorSvg(url: string, color: string): Promise<string> {
  const cacheKey = `${url}__${color}`;
  if (svgCache.has(cacheKey)) return svgCache.get(cacheKey)!;

  if (url.startsWith('data:image/svg+xml')) {
    const recolored = recolorSvgDataUri(url, color);
    return recolored || url;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const text = await res.text();
    if (!text.includes('<svg')) return url;

    const recolored = recolorSvgText(text, color);
    const result = 'data:image/svg+xml;utf8,' + encodeURIComponent(recolored);
    svgCache.set(cacheKey, result);
    return result;
  } catch {
    return url;
  }
}
