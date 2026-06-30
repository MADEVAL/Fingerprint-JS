import { safeNumber } from './collectors/shared.js';

export function detectBrowserQuirks(context = {}) {
  const navigatorRef = context.navigator || null;
  const windowRef = context.window || context.global || {};
  const screenRef = context.screen || null;
  const userAgent = String((navigatorRef && navigatorRef.userAgent) || '');
  const platform = String((navigatorRef && navigatorRef.platform) || '');
  const uaData = navigatorRef && navigatorRef.userAgentData ? navigatorRef.userAgentData : null;
  const uaPlatform = String((uaData && uaData.platform) || '');
  const brandNames = normalizeBrandNames(uaData && uaData.brands);
  const screenWidth = safeNumber(screenRef && screenRef.width);
  const screenHeight = safeNumber(screenRef && screenRef.height);
  const hardwareConcurrency = safeNumber(navigatorRef && navigatorRef.hardwareConcurrency);

  const firefoxMatch = /Firefox\/(\d+)/u.exec(userAgent);
  const firefoxIosMatch = /FxiOS\/(\d+)/u.exec(userAgent);
  const safariMatch = /Version\/(\d+)/u.exec(userAgent);
  const samsungMatch = /SamsungBrowser\/(\d+)/u.exec(userAgent);
  const chromeMatch = /(?:Chrome|Chromium|CriOS)\/(\d+)/u.exec(userAgent);
  const chromiumFromBrand = brandNames.some((name) => /Chromium|Google Chrome|Microsoft Edge/u.test(name));
  const chromiumFromUa = /Chrome\/|Chromium\/|CriOS\/|Edg\//u.test(userAgent);
  const featureSignals = Object.freeze({
    chromium: countTruthy([
      Boolean(windowRef.chrome && (windowRef.chrome.runtime || windowRef.chrome.loadTimes || windowRef.chrome.csi)),
      'webkitStorageInfo' in windowRef,
      'webkitResolveLocalFileSystemURL' in windowRef,
      Boolean(navigatorRef && navigatorRef.userAgentData),
      supportsCss(windowRef, 'selector(:has(*))', '')
    ]),
    gecko: countTruthy([
      'mozInnerScreenX' in windowRef,
      'mozPaintCount' in windowRef,
      Boolean(navigatorRef && (navigatorRef.buildID || navigatorRef.buildId)),
      supportsCss(windowRef, '-moz-appearance', 'none')
    ]),
    webkit: countTruthy([
      'WebKitCSSMatrix' in windowRef,
      'webkitRequestAnimationFrame' in windowRef,
      'webkitAudioContext' in windowRef,
      supportsCss(windowRef, '-webkit-touch-callout', 'none'),
      Boolean(windowRef.safari)
    ])
  });
  const geckoFeature = featureSignals.gecko >= 1;
  const chromiumFeature = featureSignals.chromium >= 1;
  const webKitFeature = featureSignals.webkit >= 1;
  const isFirefox = Boolean(firefoxMatch || geckoFeature) && !/Seamonkey\//u.test(userAgent);
  const isChromium = (chromiumFromBrand || chromiumFromUa || chromiumFeature) && !isFirefox;
  const isSafari = /Safari\//u.test(userAgent) && !isChromium && !/FxiOS\/|OPR\/|SamsungBrowser\//u.test(userAgent);
  const isWebKit = /AppleWebKit\//u.test(userAgent) || webKitFeature;
  const isIPad = platform === 'iPad' || /iPad/u.test(userAgent) || (platform === 'MacIntel' && safeNumber(navigatorRef && navigatorRef.maxTouchPoints) > 1);
  const isIos = /iPad|iPhone|iPod/u.test(platform) || /iPad|iPhone|iPod/u.test(userAgent) || isIPad;
  const isAndroid = /Android/u.test(userAgent) || uaPlatform === 'Android';
  const safariMajor = safariMatch ? Number(safariMatch[1]) : null;
  const firefoxMajor = firefoxMatch ? Number(firefoxMatch[1]) : null;
  const firefoxIosMajor = firefoxIosMatch ? Number(firefoxIosMatch[1]) : null;
  const chromiumMajor = chromeMatch ? Number(chromeMatch[1]) : null;
  const samsungMajor = samsungMatch ? Number(samsungMatch[1]) : null;
  return Object.freeze({
    engine: isFirefox ? 'gecko' : isChromium ? 'chromium' : isWebKit ? 'webkit' : 'unknown',
    featureSignals,
    isAndroid,
    isChromium,
    isFirefox,
    isFirefox120OrNewer: Boolean(isFirefox && firefoxMajor !== null && firefoxMajor >= 120),
    isFirefox143OrNewer: Boolean(isFirefox && firefoxMajor !== null && firefoxMajor >= 143),
    isFirefoxResistFingerprintingLikely: Boolean(isFirefox && hardwareConcurrency === 2 && screenWidth === 1000 && screenHeight === 1000),
    isIos,
    isIPad,
    isIosDesktopMode: Boolean(platform === 'MacIntel' && safeNumber(navigatorRef && navigatorRef.maxTouchPoints) > 1),
    isOldMobileSafari: Boolean(isIos && isSafari && safariMajor !== null && safariMajor <= 11),
    isSafari,
    isDesktopSafari: Boolean(isSafari && !isIos),
    isSafari17OrNewer: Boolean(isSafari && safariMajor !== null && safariMajor >= 17),
    isSamsungInternet: Boolean(samsungMatch || brandNames.some((name) => /Samsung Internet/u.test(name))),
    isSamsungInternet26OrNewer: Boolean((samsungMatch || brandNames.some((name) => /Samsung Internet/u.test(name))) && samsungMajor !== null && samsungMajor >= 26),
    isWebKit,
    chromiumMajor,
    firefoxMajor,
    firefoxIosMajor,
    safariMajor,
    samsungMajor
  });
}

export function shouldSuppressSignal(signal, quirks) {
  if (signal === 'audio') {
    return Boolean(quirks.isSafari17OrNewer || quirks.isOldMobileSafari || quirks.isSamsungInternet26OrNewer || quirks.isFirefoxResistFingerprintingLikely);
  }

  if (signal === 'canvas') {
    return Boolean(quirks.isSafari17OrNewer || quirks.isFirefox120OrNewer || quirks.isFirefoxResistFingerprintingLikely);
  }

  if (signal === 'screen.metrics') {
    return Boolean(quirks.isFirefoxResistFingerprintingLikely);
  }

  if (signal === 'screen.frame') {
    return Boolean(quirks.isSafari17OrNewer || quirks.isFirefox143OrNewer || quirks.isFirefoxResistFingerprintingLikely);
  }

  if (signal === 'hardware.concurrency') {
    return false;
  }

  return false;
}

export function getSuppressionReason(signal, quirks) {
  if (!shouldSuppressSignal(signal, quirks)) {
    return null;
  }

  if (quirks.isFirefoxResistFingerprintingLikely) {
    return 'firefox_resist_fingerprinting';
  }

  if (quirks.isSafari17OrNewer) {
    return 'safari_17_unstable_source';
  }

  if (quirks.isFirefox120OrNewer && signal === 'canvas') {
    return 'firefox_canvas_randomization';
  }

  if (quirks.isFirefox143OrNewer && signal === 'screen.frame') {
    return 'firefox_screen_frame_randomization';
  }

  if (quirks.isSamsungInternet26OrNewer) {
    return 'samsung_internet_audio_instability';
  }

  if (quirks.isOldMobileSafari) {
    return 'old_mobile_safari_audio_requires_gesture';
  }
}

export function normalizeHardwareConcurrency(value, quirks) {
  const concurrency = safeNumber(value);
  if (concurrency === null) {
    return null;
  }

  if (quirks.isFirefox143OrNewer || quirks.isFirefoxResistFingerprintingLikely) {
    return concurrency <= 4 ? 4 : 8;
  }

  return concurrency;
}

function normalizeBrandNames(brands) {
  if (!Array.isArray(brands)) {
    return [];
  }

  return brands.map((brand) => String(brand && brand.brand ? brand.brand : '')).filter(Boolean);
}

function countTruthy(values) {
  return values.filter(Boolean).length;
}

function supportsCss(windowRef, property, value) {
  try {
    return Boolean(windowRef.CSS && typeof windowRef.CSS.supports === 'function' && windowRef.CSS.supports(property, value));
  } catch (_error) {
    return false;
  }
}