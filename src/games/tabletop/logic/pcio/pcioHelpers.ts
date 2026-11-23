/** Shared helpers for the PlayingCards.io normalizer [ID: GAME-TABLETOP-NORMALIZER] */
import type { FaceObject } from '../types';
import { resolveAssetUrl } from '../pcioAssetUtils';

export function isWidgetHidden(
  id: string,
  rawWidgets: Record<string, Record<string, unknown>>,
  visited = new Set<string>(),
): boolean {
  if (visited.has(id)) return false;
  visited.add(id);
  const w = rawWidgets[id];
  if (!w || typeof w !== 'object') return false;
  if (w.display === false) return true;
  const parent = typeof w.parent === 'string' ? w.parent : undefined;
  if (parent && rawWidgets[parent]) {
    return isWidgetHidden(parent, rawWidgets, visited);
  }
  return false;
}

export function resolveInheritedProperty(
  widget: Record<string, unknown>,
  prop: string,
  rawWidgets: Record<string, Record<string, unknown>>,
  visited = new Set<string>(),
): unknown {
  if (widget[prop] !== undefined && widget[prop] !== null) {
    return widget[prop];
  }
  const inh = widget.inheritFrom;
  if (!inh) return undefined;
  const wid = String(widget.id || '');
  if (wid && visited.has(wid)) return undefined;
  if (wid) visited.add(wid);

  if (typeof inh === 'string') {
    const target = rawWidgets[inh];
    if (target) return resolveInheritedProperty(target, prop, rawWidgets, visited);
  } else if (typeof inh === 'object' && !Array.isArray(inh)) {
    for (const [targetId, props] of Object.entries(inh as Record<string, unknown>)) {
      const target = rawWidgets[targetId];
      if (!target) continue;
      const propList = Array.isArray(props) ? (props as string[]) : [String(props)];
      const hasWildcard = propList.includes('*');
      const hasExplicit = propList.includes(prop);
      const isNegated = propList.includes('!' + prop);
      const hasAnyNegated = propList.some((p) => p.startsWith('!'));

      if (hasWildcard || hasExplicit || (hasAnyNegated && !isNegated)) {
        const val = resolveInheritedProperty(target, prop, rawWidgets, visited);
        if (val !== undefined && val !== null) return val;
      }
    }
  }
  return undefined;
}

export function resolveRotation(
  id: string,
  rawWidgets: Record<string, Record<string, unknown>>,
): number {
  const w = rawWidgets[id];
  if (!w || typeof w !== 'object') return 0;
  if (typeof w.rotation === 'number') return w.rotation;
  const inherited = resolveInheritedProperty(w, 'rotation', rawWidgets);
  return typeof inherited === 'number' ? inherited : 0;
}

export function resolveGlobalPosition(
  id: string,
  rawWidgets: Record<string, Record<string, unknown>>,
  visited = new Set<string>(),
): { x: number; y: number } {
  if (visited.has(id)) return { x: 0, y: 0 };
  visited.add(id);
  const w = rawWidgets[id];
  if (!w || typeof w !== 'object') return { x: 0, y: 0 };
  const rawX = typeof w.x === 'number' ? w.x : 0;
  const rawY = typeof w.y === 'number' ? w.y : 0;
  const parent = typeof w.parent === 'string' ? w.parent : undefined;
  if (parent && rawWidgets[parent]) {
    const parentPos = resolveGlobalPosition(parent, rawWidgets, visited);
    return { x: parentPos.x + rawX, y: parentPos.y + rawY };
  }
  return { x: rawX, y: rawY };
}

export function resolveZIndex(
  raw: Record<string, unknown>,
  rawWidgets: Record<string, Record<string, unknown>>,
  defaultLayer = 0,
): number {
  const layerVal = resolveInheritedProperty(raw, 'layer', rawWidgets);
  const layer =
    typeof raw.layer === 'number'
      ? raw.layer
      : typeof layerVal === 'number'
        ? layerVal
        : defaultLayer;
  const rawZ = typeof raw.zIndex === 'number' ? raw.zIndex : typeof raw.z === 'number' ? raw.z : 1;
  return (layer + 10) * 100000 + rawZ;
}

export function extractClipPath(faceTemplates: unknown): string | undefined {
  if (!Array.isArray(faceTemplates)) return undefined;
  for (const face of faceTemplates) {
    if (!face || typeof face !== 'object') continue;
    const objects = (face as { objects?: unknown[] }).objects;
    if (Array.isArray(objects)) {
      const hasUnclippedImage = objects.some((obj) => {
        const o = obj as {
          type?: string;
          css?: string;
          dynamicProperties?: Record<string, string>;
        };
        const css = String(o?.css || '');
        return (
          o?.type === 'image' &&
          o?.dynamicProperties?.value === 'image' &&
          !css.includes('clip-path')
        );
      });
      if (hasUnclippedImage) return undefined;

      for (const obj of objects) {
        if (!obj || typeof obj !== 'object') continue;
        const css = String((obj as { css?: string }).css || '');
        const match = css.match(/clip-path:\s*([^;]+)/i);
        if (match) return match[1].trim();
      }
    }
  }
  return undefined;
}

export function parseFaceTemplateObjects(
  activeFace: number,
  faceTemplates: unknown,
  cardTypeObj?: Record<string, unknown>,
  cardWidth?: number,
  cardHeight?: number,
  assetFiles?: Record<string, string>,
  cardTypeKey?: string,
): FaceObject[] | undefined {
  if (!Array.isArray(faceTemplates)) return undefined;
  const face = faceTemplates[activeFace];
  if (!face || typeof face !== 'object') return undefined;
  const objects = (face as { objects?: unknown[] }).objects;
  if (!Array.isArray(objects)) return undefined;

  const result: FaceObject[] = [];
  for (const obj of objects) {
    if (!obj || typeof obj !== 'object') continue;
    const o = obj as {
      type?: 'image' | 'text';
      dynamicProperties?: Record<string, string>;
      value?: unknown;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rotation?: number;
      css?: string;
      borderRadius?: string;
      fontSize?: number;
      textAlign?: string;
      color?: string;
    };
    let valStr: string | undefined;

    if (o.dynamicProperties?.value) {
      const propKey = o.dynamicProperties.value;
      let propVal = cardTypeObj ? cardTypeObj[propKey] : undefined;
      if (
        propVal === undefined &&
        (propKey === 'cardType' || propKey === 'type' || propKey === 'label')
      ) {
        propVal = cardTypeKey;
      }
      if (propVal !== undefined) {
        valStr = String(propVal);
      }
    } else if (o.value !== undefined) {
      valStr = String(o.value);
    }

    let resolvedValue = valStr;
    if (o.type === 'image' && valStr) {
      resolvedValue = resolveAssetUrl(valStr, assetFiles) || valStr;
    }

    let clipPath: string | undefined;
    const css = String(o.css || '');
    const match = css.match(/clip-path:\s*([^;]+)/i);
    if (match) {
      clipPath = match[1].trim();
    }

    let w = o.width;
    if (o.dynamicProperties?.width === 'width' && cardWidth !== undefined) {
      w = cardWidth;
    }
    let h = o.height;
    if (o.dynamicProperties?.height === 'height' && cardHeight !== undefined) {
      h = cardHeight;
    }

    result.push({
      type: o.type === 'text' ? 'text' : 'image',
      value: resolvedValue || '',
      x: typeof o.x === 'number' ? o.x : 0,
      y: typeof o.y === 'number' ? o.y : 0,
      width: Number(w ?? cardWidth) || 0,
      height: Number(h ?? cardHeight) || 0,
      rotation: typeof o.rotation === 'number' ? o.rotation : undefined,
      clipPath,
      css: o.css ? String(o.css) : undefined,
      borderRadius: o.borderRadius ? String(o.borderRadius) : undefined,
      fontSize: typeof o.fontSize === 'number' ? o.fontSize : undefined,
      textAlign: typeof o.textAlign === 'string' ? o.textAlign : undefined,
      color: typeof o.color === 'string' ? o.color : undefined,
    });
  }
  return result;
}
