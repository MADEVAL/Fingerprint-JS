import { detectBrowserQuirks, getSuppressionReason, shouldSuppressSignal } from '../browser-quirks.js';
import { createCollector } from './core.js';
import { checksumString, safeNumber } from './shared.js';

const NOISY_WEBGL_EXTENSIONS = Object.freeze([
  'EXT_disjoint_timer_query',
  'EXT_disjoint_timer_query_webgl2',
  'WEBGL_debug_shaders'
]);

export function createWebglCollector() {
  return createCollector({
    id: 'webgl.renderer',
    version: '2',
    category: 'graphics',
    sensitivity: 'high',
    mode: 'active',
    stability: 'stable',
    weight: 1.6,
    collect(context) {
      const gl = getWebglContext(context);
      if (!gl) {
        return null;
      }

      const debugInfo = gl.getExtension ? gl.getExtension('WEBGL_debug_renderer_info') : null;

      return {
        contextAttributes: readContextAttributes(gl),
        drawingBufferWidth: safeNumber(gl.drawingBufferWidth),
        drawingBufferHeight: safeNumber(gl.drawingBufferHeight),
        vendor: getGlParameter(gl, gl.VENDOR),
        renderer: getGlParameter(gl, gl.RENDERER),
        version: getGlParameter(gl, gl.VERSION),
        shadingLanguageVersion: getGlParameter(gl, gl.SHADING_LANGUAGE_VERSION),
        unmaskedVendor: debugInfo ? getGlParameter(gl, debugInfo.UNMASKED_VENDOR_WEBGL) : null,
        unmaskedRenderer: debugInfo ? getGlParameter(gl, debugInfo.UNMASKED_RENDERER_WEBGL) : null
      };
    }
  });
}

export function createWebglExtensionsCollector() {
  return createCollector({
    id: 'webgl.extensions',
    version: '1',
    category: 'graphics',
    sensitivity: 'high',
    mode: 'active',
    stability: 'stable',
    weight: 1.1,
    collect(context) {
      const gl = getWebglContext(context);
      if (!gl) {
        return null;
      }

      const extensions = typeof gl.getSupportedExtensions === 'function' ? gl.getSupportedExtensions() : null;
      const rawExtensionList = Array.isArray(extensions) ? extensions.slice().map(String).sort() : [];
      const extensionList = rawExtensionList.filter((extension) => !NOISY_WEBGL_EXTENSIONS.includes(extension));
      const omittedExtensions = rawExtensionList.filter((extension) => NOISY_WEBGL_EXTENSIONS.includes(extension));
      return {
        extensions: extensionList,
        omittedExtensions,
        maxTextureSize: getGlParameter(gl, gl.MAX_TEXTURE_SIZE),
        maxCombinedTextureImageUnits: getGlParameter(gl, gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
        maxRenderbufferSize: getGlParameter(gl, gl.MAX_RENDERBUFFER_SIZE),
        maxCubeMapTextureSize: getGlParameter(gl, gl.MAX_CUBE_MAP_TEXTURE_SIZE),
        maxVertexAttribs: getGlParameter(gl, gl.MAX_VERTEX_ATTRIBS),
        maxVertexTextureImageUnits: getGlParameter(gl, gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
        maxVaryingVectors: getGlParameter(gl, gl.MAX_VARYING_VECTORS),
        maxViewportDims: normalizeNumberArray(getGlParameter(gl, gl.MAX_VIEWPORT_DIMS)),
        aliasedLineWidthRange: normalizeNumberArray(getGlParameter(gl, gl.ALIASED_LINE_WIDTH_RANGE)),
        aliasedPointSizeRange: normalizeNumberArray(getGlParameter(gl, gl.ALIASED_POINT_SIZE_RANGE))
      };
    }
  });
}

export function createCanvasCollector() {
  return createCollector({
    id: 'canvas.checksum',
    version: '2',
    category: 'graphics',
    sensitivity: 'high',
    mode: 'active',
    stability: 'stable',
    weight: 1.4,
    collect(context) {
      const quirks = detectBrowserQuirks(context);
      if (shouldSuppressSignal('canvas', quirks)) {
        return { status: 'suppressed', reason: getSuppressionReason('canvas', quirks) };
      }

      const canvas = createCanvas(context, 240, 80);
      if (!canvas) {
        return null;
      }

      const canvasContext = canvas.getContext && canvas.getContext('2d');
      if (!canvasContext || typeof canvas.toDataURL !== 'function') {
        return null;
      }

      return {
        status: 'ok',
        winding: detectWinding(canvasContext),
        geometry: renderGeometry(canvas, canvasContext),
        text: renderText(canvas, canvasContext)
      };
    }
  });
}

function getWebglContext(context) {
  const documentRef = context.document;
  if (!documentRef || typeof documentRef.createElement !== 'function') {
    return null;
  }

  const canvas = documentRef.createElement('canvas');
  return canvas.getContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
}

function createCanvas(context, width, height) {
  const documentRef = context.document;
  if (!documentRef || typeof documentRef.createElement !== 'function') {
    return null;
  }

  const canvas = documentRef.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function readContextAttributes(gl) {
  if (typeof gl.getContextAttributes !== 'function') {
    return null;
  }

  try {
    const attributes = gl.getContextAttributes();
    if (!attributes || typeof attributes !== 'object') {
      return null;
    }

    return {
      alpha: safeBoolean(attributes.alpha),
      antialias: safeBoolean(attributes.antialias),
      depth: safeBoolean(attributes.depth),
      desynchronized: safeBoolean(attributes.desynchronized),
      failIfMajorPerformanceCaveat: safeBoolean(attributes.failIfMajorPerformanceCaveat),
      powerPreference: typeof attributes.powerPreference === 'string' ? attributes.powerPreference : null,
      premultipliedAlpha: safeBoolean(attributes.premultipliedAlpha),
      preserveDrawingBuffer: safeBoolean(attributes.preserveDrawingBuffer),
      stencil: safeBoolean(attributes.stencil)
    };
  } catch (_error) {
    return null;
  }
}

function safeBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function getGlParameter(gl, parameter) {
  try {
    const value = gl.getParameter(parameter);
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || Array.isArray(value) || ArrayBuffer.isView(value) ? value : null;
  } catch (_error) {
    return null;
  }
}

function normalizeNumberArray(value) {
  if (!Array.isArray(value) && !ArrayBuffer.isView(value)) {
    return null;
  }

  return Array.from(value).map((item) => safeNumber(item));
}

function detectWinding(canvasContext) {
  if (typeof canvasContext.rect !== 'function' || typeof canvasContext.isPointInPath !== 'function') {
    return null;
  }

  canvasContext.rect(0, 0, 10, 10);
  canvasContext.rect(2, 2, 6, 6);
  return canvasContext.isPointInPath(5, 5, 'evenodd') === false;
}

function renderGeometry(canvas, canvasContext) {
  resetCanvas(canvas, 240, 80);
  canvasContext.fillStyle = '#f60';
  canvasContext.fillRect(8, 8, 96, 28);
  canvasContext.fillStyle = '#069';
  canvasContext.globalCompositeOperation = 'multiply';
  canvasContext.beginPath();
  canvasContext.arc(80, 42, 24, 0, Math.PI * 2, true);
  canvasContext.closePath();
  canvasContext.fill();
  return summarizeCanvas(canvas);
}

function renderText(canvas, canvasContext) {
  resetCanvas(canvas, 240, 80);
  canvasContext.textBaseline = 'alphabetic';
  canvasContext.font = '11pt "Times New Roman"';
  canvasContext.fillStyle = '#f60';
  canvasContext.fillRect(100, 1, 62, 20);
  canvasContext.fillStyle = '#069';
  canvasContext.fillText('FingerprintJS by BotBlocker 0.1', 2, 18);
  canvasContext.fillStyle = 'rgba(102, 204, 0, 0.65)';
  canvasContext.fillText('mwmw 12345', 4, 48);
  return summarizeCanvas(canvas, true);
}

function resetCanvas(canvas, width, height) {
  canvas.width = width;
  canvas.height = height;
}

function summarizeCanvas(canvas, verifyStable = false) {
  try {
    const dataUrl = canvas.toDataURL();
    if (verifyStable && canvas.toDataURL() !== dataUrl) {
      return {
        status: 'unstable',
        reason: 'canvas_noise_detected'
      };
    }

    return {
      status: 'ok',
      length: dataUrl.length,
      checksum: checksumString(dataUrl)
    };
  } catch (error) {
    return {
      status: 'unstable',
      reason: error && error.message ? String(error.message) : 'canvas_read_failed'
    };
  }
}

export function createWebglPrecisionCollector() {
  return createCollector({
    id: 'webgl.precision',
    version: '1',
    category: 'graphics',
    sensitivity: 'high',
    mode: 'active',
    stability: 'stable',
    weight: 0.65,
    collect(context) {
      const gl = getWebglContext(context);
      if (!gl || typeof gl.getShaderPrecisionFormat !== 'function') {
        return null;
      }

      return {
        vertexHighFloat: readShaderPrecision(gl, gl.VERTEX_SHADER, gl.HIGH_FLOAT),
        fragmentHighFloat: readShaderPrecision(gl, gl.FRAGMENT_SHADER, gl.HIGH_FLOAT),
        vertexMediumFloat: readShaderPrecision(gl, gl.VERTEX_SHADER, gl.MEDIUM_FLOAT),
        fragmentMediumFloat: readShaderPrecision(gl, gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT)
      };
    }
  });
}

function readShaderPrecision(gl, shaderType, precisionType) {
  try {
    const format = gl.getShaderPrecisionFormat(shaderType, precisionType);
    return format
      ? {
          precision: safeNumber(format.precision),
          rangeMin: safeNumber(format.rangeMin),
          rangeMax: safeNumber(format.rangeMax)
        }
      : null;
  } catch (_error) {
    return null;
  }
}