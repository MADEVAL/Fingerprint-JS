import { detectBrowserQuirks, getSuppressionReason, shouldSuppressSignal } from '../browser-quirks.js';
import { createCollector } from './core.js';
import { getMatchMedia, getWindowRef, safeNumber } from './shared.js';

let cachedScreenFrame = null;
let screenFrameWatcherBound = false;

export function createScreenCollector() {
  return createCollector({
    id: 'screen.metrics',
    version: '2',
    category: 'display',
    sensitivity: 'medium',
    mode: 'passive',
    stability: 'stable',
    weight: 1.1,
    collect(context) {
      const screenRef = context.screen;
      if (!screenRef) {
        return null;
      }

      const quirks = detectBrowserQuirks(context);
      if (shouldSuppressSignal('screen.metrics', quirks)) {
        return { status: 'suppressed', reason: getSuppressionReason('screen.metrics', quirks) };
      }

      return {
        width: roundDimension(screenRef.width),
        height: roundDimension(screenRef.height),
        availWidth: roundDimension(screenRef.availWidth),
        availHeight: roundDimension(screenRef.availHeight),
        colorDepth: safeNumber(screenRef.colorDepth),
        pixelDepth: safeNumber(screenRef.pixelDepth),
        devicePixelRatio: roundRatio(context.global && context.global.devicePixelRatio)
      };
    }
  });
}

export function createScreenFrameCollector() {
  return createCollector({
    id: 'screen.frame',
    version: '1',
    category: 'display',
    sensitivity: 'medium',
    mode: 'passive',
    stability: 'stable',
    weight: 0.7,
    collect(context) {
      const quirks = detectBrowserQuirks(context);
      if (shouldSuppressSignal('screen.frame', quirks)) {
        return { status: 'suppressed', reason: getSuppressionReason('screen.frame', quirks) };
      }

      const windowRef = getWindowRef(context);
      const screenRef = context.screen;
      if (!screenRef) {
        return null;
      }

      ensureScreenFrameWatcher(context);

      const outerWidth = roundDimension(windowRef.outerWidth);
      const outerHeight = roundDimension(windowRef.outerHeight);
      const innerWidth = roundDimension(windowRef.innerWidth);
      const innerHeight = roundDimension(windowRef.innerHeight);

      const frame = {
        outerWidth,
        outerHeight,
        innerWidth,
        innerHeight,
        left: roundDimension(windowRef.screenX ?? windowRef.screenLeft),
        top: roundDimension(windowRef.screenY ?? windowRef.screenTop),
        frameWidth: outerWidth !== null && innerWidth !== null ? Math.max(0, outerWidth - innerWidth) : null,
        frameHeight: outerHeight !== null && innerHeight !== null ? Math.max(0, outerHeight - innerHeight) : null,
        availDeltaWidth: roundDimension(screenRef.width) !== null && roundDimension(screenRef.availWidth) !== null
          ? Math.max(0, Number(screenRef.width) - Number(screenRef.availWidth))
          : null,
        availDeltaHeight: roundDimension(screenRef.height) !== null && roundDimension(screenRef.availHeight) !== null
          ? Math.max(0, Number(screenRef.height) - Number(screenRef.availHeight))
          : null,
        fullscreen: isFullscreen(context),
        rounded: true,
        source: 'direct',
        cached: false
      };

      if (!frame.fullscreen && hasUsableFrame(frame)) {
        cachedScreenFrame = Object.freeze({ ...frame });
      }

      if (!frame.fullscreen && isZeroFrame(frame) && cachedScreenFrame) {
        return { ...cachedScreenFrame, source: 'cache', cached: true };
      }

      return frame;
    }
  });
}

export function createMediaPreferencesCollector() {
  return createCollector({
    id: 'display.mediaPreferences',
    version: '1',
    category: 'display',
    sensitivity: 'low',
    mode: 'passive',
    stability: 'stable',
    weight: 0.8,
    collect(context) {
      const matchMedia = getMatchMedia(context);
      if (!matchMedia) {
        return null;
      }

      return {
        colorGamut: firstMediaMatch(matchMedia, 'color-gamut', ['rec2020', 'p3', 'srgb']),
        forcedColors: mediaBoolean(matchMedia, 'forced-colors', 'active'),
        invertedColors: mediaBoolean(matchMedia, 'inverted-colors', 'inverted'),
        monochrome: monochromeDepth(matchMedia),
        prefersContrast: firstMediaMatch(matchMedia, 'prefers-contrast', ['more', 'less', 'no-preference', 'forced']),
        prefersReducedMotion: mediaBoolean(matchMedia, 'prefers-reduced-motion', 'reduce'),
        prefersReducedTransparency: mediaBoolean(matchMedia, 'prefers-reduced-transparency', 'reduce'),
        dynamicRange: firstMediaMatch(matchMedia, 'dynamic-range', ['high', 'standard'])
      };
    }
  });
}

function firstMediaMatch(matchMedia, feature, values) {
  for (const value of values) {
    if (matches(matchMedia, `(${feature}: ${value})`)) {
      return value;
    }
  }

  return null;
}

function mediaBoolean(matchMedia, feature, activeValue) {
  if (matches(matchMedia, `(${feature}: ${activeValue})`)) {
    return true;
  }

  if (matches(matchMedia, `(${feature})`)) {
    return false;
  }

  return null;
}

function monochromeDepth(matchMedia) {
  for (let depth = 8; depth >= 0; depth -= 1) {
    if (matches(matchMedia, `(min-monochrome: ${depth})`)) {
      return depth;
    }
  }

  return null;
}

function matches(matchMedia, query) {
  try {
    return Boolean(matchMedia(query).matches);
  } catch (_error) {
    return false;
  }
}

function roundDimension(value) {
  const number = safeNumber(value);
  return number === null ? null : Math.round(number);
}

function roundRatio(value) {
  const number = safeNumber(value);
  return number === null ? null : Math.round(number * 1000) / 1000;
}

function isFullscreen(context) {
  const documentRef = context.document || null;
  const windowRef = getWindowRef(context);
  return Boolean((documentRef && (documentRef.fullscreenElement || documentRef.webkitFullscreenElement)) || windowRef.fullScreen === true);
}

function hasUsableFrame(frame) {
  return [frame.frameWidth, frame.frameHeight, frame.availDeltaWidth, frame.availDeltaHeight].some((value) => Number(value) > 0);
}

function isZeroFrame(frame) {
  return [frame.frameWidth, frame.frameHeight, frame.availDeltaWidth, frame.availDeltaHeight].every((value) => value === 0);
}

function ensureScreenFrameWatcher(context) {
  const windowRef = getWindowRef(context);
  if (screenFrameWatcherBound || typeof windowRef.addEventListener !== 'function') {
    return;
  }

  const update = () => {
    const current = snapshotScreenFrame(context);
    if (hasUsableFrame(current) && !current.fullscreen) {
      cachedScreenFrame = Object.freeze(current);
    }
  };

  windowRef.addEventListener('resize', update, { passive: true });
  windowRef.addEventListener('orientationchange', update, { passive: true });
  screenFrameWatcherBound = true;
}

function snapshotScreenFrame(context) {
  const windowRef = getWindowRef(context);
  const screenRef = context.screen;
  const outerWidth = roundDimension(windowRef.outerWidth);
  const outerHeight = roundDimension(windowRef.outerHeight);
  const innerWidth = roundDimension(windowRef.innerWidth);
  const innerHeight = roundDimension(windowRef.innerHeight);
  return {
    outerWidth,
    outerHeight,
    innerWidth,
    innerHeight,
    left: roundDimension(windowRef.screenX ?? windowRef.screenLeft),
    top: roundDimension(windowRef.screenY ?? windowRef.screenTop),
    frameWidth: outerWidth !== null && innerWidth !== null ? Math.max(0, outerWidth - innerWidth) : null,
    frameHeight: outerHeight !== null && innerHeight !== null ? Math.max(0, outerHeight - innerHeight) : null,
    availDeltaWidth: roundDimension(screenRef.width) !== null && roundDimension(screenRef.availWidth) !== null
      ? Math.max(0, Number(screenRef.width) - Number(screenRef.availWidth))
      : null,
    availDeltaHeight: roundDimension(screenRef.height) !== null && roundDimension(screenRef.availHeight) !== null
      ? Math.max(0, Number(screenRef.height) - Number(screenRef.availHeight))
      : null,
    fullscreen: isFullscreen(context),
    rounded: true,
    source: 'watcher',
    cached: false
  };
}