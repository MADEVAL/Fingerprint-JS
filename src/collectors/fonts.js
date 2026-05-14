import { createCollector } from './core.js';
import { checksumString, safeNumber } from './shared.js';

const FONT_CANDIDATES = Object.freeze([
  'Arial',
  'Arial Unicode MS',
  'Calibri',
  'Cambria',
  'Courier New',
  'Georgia',
  'Helvetica Neue',
  'Menlo',
  'Roboto',
  'Segoe UI',
  'Times New Roman'
]);

const BASE_FONTS = Object.freeze(['monospace', 'sans-serif', 'serif']);

export function createFontsCollector() {
  return createCollector({
    id: 'fonts.available',
    version: '2',
    category: 'fonts',
    sensitivity: 'high',
    mode: 'active',
    stability: 'volatile',
    weight: 1.1,
    prepare(context) {
      return collectAvailableFonts(context);
    },
    collect(context, prepared) {
      if (prepared !== undefined) {
        return prepared;
      }

      return collectAvailableFonts(context);
    }
  });
}

export function createFontPreferencesCollector() {
  return createCollector({
    id: 'fonts.preferences',
    version: '2',
    category: 'fonts',
    sensitivity: 'medium',
    mode: 'active',
    stability: 'volatile',
    weight: 0.7,
    prepare(context) {
      return collectFontPreferences(context);
    },
    collect(context, prepared) {
      if (prepared !== undefined) {
        return prepared;
      }

      return collectFontPreferences(context);
    }
  });
}

function collectAvailableFonts(context) {
  const documentRef = context.document;
  if (!documentRef) {
    return null;
  }

  if (documentRef.fonts && typeof documentRef.fonts.check === 'function') {
    const available = FONT_CANDIDATES.filter((font) => documentRef.fonts.check(`12px "${font}"`));
    return summarizeFonts('font-check', available);
  }

  const measured = measureFonts(documentRef);
  return measured ? summarizeFonts('layout', measured) : null;
}

function collectFontPreferences(context) {
  const documentRef = context.document;
  if (!canMeasure(documentRef)) {
    return null;
  }

  return withMeasurementDocument(documentRef, (measurementDocument) => {
    const container = createContainer(measurementDocument);
    try {
      measurementDocument.body.appendChild(container);
      const sizes = {};
      for (const family of BASE_FONTS) {
        const element = createSpan(measurementDocument, family, 'mmmmmmmmmmlli', '72px');
        container.appendChild(element);
        sizes[family] = {
          width: safeNumber(element.offsetWidth),
          height: safeNumber(element.offsetHeight)
        };
      }

      return sizes;
    } finally {
      removeNode(container);
    }
  });
}

function summarizeFonts(method, available) {
  const sorted = available.slice().sort();
  return {
    method,
    checked: FONT_CANDIDATES.length,
    available: sorted,
    checksum: checksumString(sorted.join('|'))
  };
}

function measureFonts(documentRef) {
  if (!canMeasure(documentRef)) {
    return null;
  }

  return withMeasurementDocument(documentRef, (measurementDocument) => measureFontsInDocument(measurementDocument));
}

function measureFontsInDocument(documentRef) {
  const container = createContainer(documentRef);
  try {
    documentRef.body.appendChild(container);
    const baseMeasurements = {};
    for (const baseFont of BASE_FONTS) {
      const base = createSpan(documentRef, baseFont, 'mmMwWLliI0O&1', '48px');
      container.appendChild(base);
      baseMeasurements[baseFont] = readBox(base);
    }

    const available = [];
    for (const font of FONT_CANDIDATES) {
      if (isFontAvailable(documentRef, container, font, baseMeasurements)) {
        available.push(font);
      }
    }

    return available;
  } finally {
    removeNode(container);
  }
}

function withMeasurementDocument(documentRef, callback) {
  const frame = createMeasurementFrame(documentRef);
  if (!frame) {
    return callback(documentRef);
  }

  try {
    documentRef.body.appendChild(frame);
    const measurementDocument = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
    if (canMeasure(measurementDocument)) {
      return callback(measurementDocument);
    }

    return callback(documentRef);
  } finally {
    removeNode(frame);
  }
}

function createMeasurementFrame(documentRef) {
  try {
    const frame = documentRef.createElement('iframe');
    if (!frame || !frame.style) {
      return null;
    }

    frame.setAttribute && frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'absolute';
    frame.style.visibility = 'hidden';
    frame.style.left = '-10000px';
    frame.style.top = '-10000px';
    frame.style.width = '0';
    frame.style.height = '0';
    return frame;
  } catch (_error) {
    return null;
  }
}

function isFontAvailable(documentRef, container, font, baseMeasurements) {
  for (const baseFont of BASE_FONTS) {
    const span = createSpan(documentRef, `"${font}",${baseFont}`, 'mmMwWLliI0O&1', '48px');
    container.appendChild(span);
    const box = readBox(span);
    if (box.width !== baseMeasurements[baseFont].width || box.height !== baseMeasurements[baseFont].height) {
      return true;
    }
  }

  return false;
}

function canMeasure(documentRef) {
  return Boolean(documentRef && documentRef.body && typeof documentRef.createElement === 'function');
}

function createContainer(documentRef) {
  const container = documentRef.createElement('div');
  container.style.position = 'absolute';
  container.style.visibility = 'hidden';
  container.style.left = '-10000px';
  container.style.top = '-10000px';
  return container;
}

function createSpan(documentRef, fontFamily, text, fontSize) {
  const span = documentRef.createElement('span');
  span.textContent = text;
  span.style.fontFamily = fontFamily;
  span.style.fontSize = fontSize;
  span.style.position = 'absolute';
  span.style.whiteSpace = 'nowrap';
  return span;
}

function readBox(element) {
  return {
    width: safeNumber(element.offsetWidth),
    height: safeNumber(element.offsetHeight)
  };
}

function removeNode(node) {
  if (node && node.parentNode && typeof node.parentNode.removeChild === 'function') {
    node.parentNode.removeChild(node);
  }
}