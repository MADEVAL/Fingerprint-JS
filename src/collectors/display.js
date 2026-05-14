import { detectBrowserQuirks, shouldSuppressSignal } from '../browser-quirks.js';
import { createCollector } from './core.js';
import { getMatchMedia, getWindowRef, safeNumber } from './shared.js';

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

      return {
        width: safeNumber(screenRef.width),
        height: safeNumber(screenRef.height),
        availWidth: safeNumber(screenRef.availWidth),
        availHeight: safeNumber(screenRef.availHeight),
        colorDepth: safeNumber(screenRef.colorDepth),
        pixelDepth: safeNumber(screenRef.pixelDepth),
        devicePixelRatio: safeNumber(context.global && context.global.devicePixelRatio)
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
        return { status: 'suppressed', reason: 'known_unstable_screen_frame' };
      }

      const windowRef = getWindowRef(context);
      const screenRef = context.screen;
      if (!screenRef) {
        return null;
      }

      const outerWidth = safeNumber(windowRef.outerWidth);
      const outerHeight = safeNumber(windowRef.outerHeight);
      const innerWidth = safeNumber(windowRef.innerWidth);
      const innerHeight = safeNumber(windowRef.innerHeight);

      return {
        outerWidth,
        outerHeight,
        innerWidth,
        innerHeight,
        left: safeNumber(windowRef.screenX ?? windowRef.screenLeft),
        top: safeNumber(windowRef.screenY ?? windowRef.screenTop),
        frameWidth: outerWidth !== null && innerWidth !== null ? Math.max(0, outerWidth - innerWidth) : null,
        frameHeight: outerHeight !== null && innerHeight !== null ? Math.max(0, outerHeight - innerHeight) : null,
        availDeltaWidth: safeNumber(screenRef.width) !== null && safeNumber(screenRef.availWidth) !== null
          ? Math.max(0, Number(screenRef.width) - Number(screenRef.availWidth))
          : null,
        availDeltaHeight: safeNumber(screenRef.height) !== null && safeNumber(screenRef.availHeight) !== null
          ? Math.max(0, Number(screenRef.height) - Number(screenRef.availHeight))
          : null
      };
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