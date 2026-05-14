export function detectBrowserQuirks(context = {}) {
  const navigatorRef = context.navigator || null;
  const windowRef = context.window || context.global || {};
  const screenRef = context.screen || null;
  const userAgent = String((navigatorRef && navigatorRef.userAgent) || '');
  const platform = String((navigatorRef && navigatorRef.platform) || '');
  const uaData = navigatorRef && navigatorRef.userAgentData ? navigatorRef.userAgentData : null;
  const uaPlatform = String((uaData && uaData.platform) || '');
  const brandNames = normalizeBrandNames(uaData && uaData.brands);

  const firefoxMatch = /Firefox\/(\d+)/u.exec(userAgent);
  const safariMatch = /Version\/(\d+)/u.exec(userAgent);
  const samsungMatch = /SamsungBrowser\/(\d+)/u.exec(userAgent);
  const geckoMatch = /Gecko\//u.test(userAgent);
  const chromiumFromBrand = brandNames.some((name) => /Chromium|Google Chrome|Microsoft Edge/u.test(name));
  const chromiumFromUa = /Chrome\/|Chromium\/|CriOS\/|Edg\//u.test(userAgent);
  const isFirefox = Boolean(firefoxMatch);
  const isChromium = (chromiumFromBrand || chromiumFromUa) && !isFirefox;
  const isSafari = /Safari\//u.test(userAgent) && !isChromium && !/FxiOS\/|OPR\/|SamsungBrowser\//u.test(userAgent);
  const isWebKit = /AppleWebKit\//u.test(userAgent) || Boolean(windowRef.safari);
  const isIos = /iPad|iPhone|iPod/u.test(platform) || /iPad|iPhone|iPod/u.test(userAgent) || (platform === 'MacIntel' && safeNumber(navigatorRef && navigatorRef.maxTouchPoints) > 1);
  const isAndroid = /Android/u.test(userAgent) || uaPlatform === 'Android';
  const safariMajor = safariMatch ? Number(safariMatch[1]) : null;
  const firefoxMajor = firefoxMatch ? Number(firefoxMatch[1]) : null;
  const samsungMajor = samsungMatch ? Number(samsungMatch[1]) : null;
  const screenWidth = safeNumber(screenRef && screenRef.width);
  const screenHeight = safeNumber(screenRef && screenRef.height);
  const hardwareConcurrency = safeNumber(navigatorRef && navigatorRef.hardwareConcurrency);

  return Object.freeze({
    engine: isFirefox ? 'gecko' : isChromium ? 'chromium' : isWebKit ? 'webkit' : 'unknown',
    isAndroid,
    isChromium,
    isFirefox,
    isFirefoxResistFingerprintingLikely: Boolean(isFirefox && hardwareConcurrency === 2 && screenWidth === 1000 && screenHeight === 1000),
    isIos,
    isIosDesktopMode: Boolean(platform === 'MacIntel' && safeNumber(navigatorRef && navigatorRef.maxTouchPoints) > 1),
    isSafari,
    isSafari17OrNewer: Boolean(isSafari && safariMajor !== null && safariMajor >= 17),
    isSamsungInternet: Boolean(samsungMatch || brandNames.some((name) => /Samsung Internet/u.test(name))),
    isWebKit,
    firefoxMajor,
    safariMajor,
    samsungMajor
  });
}

export function shouldSuppressSignal(signal, quirks) {
  if (signal === 'audio') {
    return Boolean(quirks.isSafari17OrNewer || quirks.isFirefoxResistFingerprintingLikely);
  }

  if (signal === 'canvas') {
    return Boolean(quirks.isFirefoxResistFingerprintingLikely);
  }

  if (signal === 'screen.frame') {
    return Boolean(quirks.isSafari17OrNewer || quirks.isFirefoxResistFingerprintingLikely);
  }

  if (signal === 'hardware.concurrency') {
    return Boolean(quirks.isFirefoxResistFingerprintingLikely);
  }

  return false;
}

function normalizeBrandNames(brands) {
  if (!Array.isArray(brands)) {
    return [];
  }

  return brands.map((brand) => String(brand && brand.brand ? brand.brand : '')).filter(Boolean);
}

function safeNumber(value) {
  return Number.isFinite(value) ? Number(value) : null;
}