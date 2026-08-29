const DRAW_ORDER_KEY = 'guessArtDrawOrder';
const DRAW_SEQUENCE_KEY = 'guessArtDrawSequence';

const isObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const cloneAppState = (appState?: Record<string, unknown>): Record<string, unknown> => ({
  ...(appState || {}),
  selectedElementIds: {},
  selectedGroupIds: {},
  editingElement: null,
  draggingElement: null,
  selectedLinearElement: null,
  editingLinearElement: null,
  selectionElement: null,
});

const normalizeFiles = (files?: unknown): Record<string, unknown> => {
  if (!files || !isObject(files)) {
    return {};
  }
  return files;
};

interface ElementLike {
  id?: string;
  type?: string;
  isDeleted?: boolean;
  version?: number;
  versionNonce?: number;
  points?: [number, number][];
  pressures?: number[];
  segmentIds?: number[];
  [key: string]: unknown;
}

export interface ExcalidrawScenePayload {
  elements: ElementLike[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
}

const sanitizeElementsList = (elements: unknown): ElementLike[] => {
  if (!Array.isArray(elements)) {
    return [];
  }
  return elements
    .filter((element): element is ElementLike => {
      if (!element || typeof element !== 'object') {
        return false;
      }
      if ((element as ElementLike).type === 'selection' || (element as ElementLike).isDeleted) {
        return false;
      }
      return true;
    })
    .map((element) => {
      if ('isSelected' in element) {
        const copy = { ...element };
        delete copy.isSelected;
        return copy;
      }
      return element;
    });
};

const collectActiveElementIds = (elements: ElementLike[]): string[] => {
  const active: string[] = [];
  for (const element of elements) {
    if (!element || element.isDeleted || typeof element.id !== 'string' || !element.id) {
      continue;
    }
    active.push(element.id);
  }
  return active;
};

export const ensureDrawMetadata = ({
  elements = [],
  appState = {},
  files = {},
}: {
  elements?: unknown;
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}): ExcalidrawScenePayload => {
  const normalizedElements = sanitizeElementsList(elements);
  const normalizedAppState = cloneAppState(appState);
  const normalizedFiles = normalizeFiles(files);

  const activeIds = collectActiveElementIds(normalizedElements);
  const activeIdSet = new Set(activeIds);

  const existingOrder = Array.isArray(normalizedAppState[DRAW_ORDER_KEY])
    ? (normalizedAppState[DRAW_ORDER_KEY] as string[])
    : [];

  const sanitizedOrder: string[] = [];
  const orderSet = new Set<string>();
  let appendedCount = 0;

  for (const id of existingOrder) {
    if (typeof id !== 'string' || orderSet.has(id) || !activeIdSet.has(id)) {
      continue;
    }
    sanitizedOrder.push(id);
    orderSet.add(id);
  }

  for (const element of normalizedElements) {
    const id = element.id;
    if (typeof id !== 'string' || !id || element.isDeleted || orderSet.has(id)) {
      continue;
    }
    sanitizedOrder.push(id);
    orderSet.add(id);
    appendedCount += 1;
  }

  const inferredPrevious = sanitizedOrder.length - appendedCount;
  const previousSequence = Object.prototype.hasOwnProperty.call(
    normalizedAppState,
    DRAW_SEQUENCE_KEY,
  )
    ? (normalizedAppState[DRAW_SEQUENCE_KEY] as number)
    : inferredPrevious;
  const numericPreviousSequence = Number.isFinite(previousSequence)
    ? Number(previousSequence)
    : inferredPrevious;

  normalizedAppState[DRAW_ORDER_KEY] = sanitizedOrder;
  normalizedAppState[DRAW_SEQUENCE_KEY] = numericPreviousSequence + appendedCount;

  return {
    elements: normalizedElements,
    appState: normalizedAppState,
    files: normalizedFiles,
  };
};

export const parseSceneData = (data: unknown): ExcalidrawScenePayload => {
  if (!data) {
    return ensureDrawMetadata({});
  }

  try {
    const base = typeof data === 'string' ? JSON.parse(data) : data;
    if (!isObject(base)) {
      return ensureDrawMetadata({});
    }
    const elements = Array.isArray(base.elements) ? base.elements : [];
    const appState = isObject(base.appState) ? (base.appState as Record<string, unknown>) : {};
    const files = normalizeFiles(base.files);
    return ensureDrawMetadata({ elements, appState, files });
  } catch (error) {
    console.error('Failed to parse Excalidraw scene data', error);
    return ensureDrawMetadata({});
  }
};

export const buildSceneFingerprint = (scene?: ExcalidrawScenePayload | null): string => {
  const normalized = ensureDrawMetadata(scene || {});
  const parts: string[] = [];
  const elements = normalized.elements || [];

  if (elements.length === 0) {
    const background = normalized.appState?.viewBackgroundColor || 'default';
    parts.push(`empty:${background}`);
  } else {
    for (const element of elements) {
      if (!element || typeof element !== 'object') {
        continue;
      }
      const id = element.id || 'unknown';
      const version = element.version ?? '0';
      const nonce = element.versionNonce ?? '0';
      parts.push(`${id}:${version}:${nonce}`);
    }
  }

  const order = normalized.appState?.[DRAW_ORDER_KEY];
  if (Array.isArray(order) && order.length > 0) {
    parts.push(`order:${order.join(',')}`);
  }

  return parts.join('|');
};

export const getOrderedElements = (scene?: ExcalidrawScenePayload | null): ElementLike[] => {
  const normalized = ensureDrawMetadata(scene || {});
  const elements = Array.isArray(normalized.elements) ? normalized.elements : [];
  if (elements.length === 0) {
    return [];
  }

  const orderIds = Array.isArray(normalized.appState?.[DRAW_ORDER_KEY])
    ? (normalized.appState[DRAW_ORDER_KEY] as string[])
    : [];

  const idToElement = new Map<string, ElementLike>();
  for (const element of elements) {
    if (!element || element.isDeleted || typeof element.id !== 'string' || !element.id) {
      continue;
    }
    idToElement.set(element.id, element);
  }

  const ordered: ElementLike[] = [];
  const used = new Set<string>();

  for (const id of orderIds) {
    const element = idToElement.get(id);
    if (!element || used.has(id)) {
      continue;
    }
    ordered.push(element);
    used.add(id);
  }

  if (ordered.length === idToElement.size) {
    return ordered;
  }

  idToElement.forEach((element, id) => {
    if (!used.has(id)) {
      ordered.push(element);
    }
  });

  return ordered;
};
