/*
 * BotBlocker Detection Utilities
 * Version: 2.0.0
 * Copyright (c) 2026 BotBlocker
 * 
 * This file contains various detection algorithms for identifying bots and automated browser environments.
 */ 

function bbcs_detectJitter() {
    const timings = [];
    const iterations = 10;
    const workload = 100000;
    
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        let x = 0;
        for (let j = 0; j < workload; j++) {
            x += Math.sqrt(j);
        }
        const end = performance.now();
        timings.push(end - start);
    }
    
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const deviations = timings.map(t => Math.abs(t - avg));
    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    const maxDeviation = Math.max(...deviations);
    
    if (avgDeviation > avg * 0.4 || maxDeviation > avg * 2) {
        return true;
    }
    
    const dateVsPerformance = [];
    for (let i = 0; i < 5; i++) {
        const dateStart = Date.now();
        const perfStart = performance.now();
        
        let x = 0;
        for (let j = 0; j < 100000; j++) {
            x += j;
        }
        
        const dateEnd = Date.now();
        const perfEnd = performance.now();
        
        dateVsPerformance.push({
            date: dateEnd - dateStart,
            perf: perfEnd - perfStart
        });
    }
    
    const inconsistentTiming = dateVsPerformance.some(item => 
        item.date === 0 || 
        item.perf === 0 || 
        item.date < item.perf
    );
    
    if (inconsistentTiming) {
        return true;
    }

    if (timings.every(t => t === 0)) {
        return true;
    }
    
    return false;
}

function bbcs_detectNavigatorMismatch() {
    const nav = window.navigator;
    const userAgent = nav.userAgent;
    const platform = nav.platform;
    const vendor = nav.vendor;

    if (nav.webdriver === true) {
        return true;
    }

    try {
        if (Object.getOwnPropertyDescriptor(nav, 'webdriver') !== undefined) {
            return true;
        }
    } catch (e) {}

    if (/HeadlessChrome|PhantomJS|SlimerJS/i.test(userAgent)) {
        return true;
    }

    if (window.outerWidth === 0 && window.outerHeight === 0) {
        return true;
    }
    
    let browserData = {
        chrome: userAgent.includes('Chrome') && !userAgent.includes('Edg/') && !userAgent.includes('OPR/'),
        firefox: userAgent.includes('Firefox') && !userAgent.includes('Seamonkey'),
        safari: userAgent.includes('Safari') && !userAgent.includes('Chrome') && !userAgent.includes('Chromium'),
        edge: userAgent.includes('Edg/'),
        opera: userAgent.includes('OPR/') || userAgent.includes('Opera'),
        ie: userAgent.includes('MSIE') || userAgent.includes('Trident/')
    };
    
    let platformData = {
        windows: platform.includes('Win'),
        mac: platform.includes('Mac'),
        linux: platform.includes('Linux') || platform.includes('X11'),
        android: userAgent.includes('Android'),
        ios: /iPhone|iPad|iPod/.test(userAgent)
    };
    
    if ((browserData.chrome && vendor !== 'Google Inc.') || 
        (browserData.safari && vendor !== 'Apple Computer, Inc.') ||
        (platformData.windows && !platform.includes('Win')) ||
        (platformData.mac && !platform.includes('Mac')) ||
        (platformData.android && !userAgent.includes('Android')) ||
        (platformData.ios && !userAgent.match(/iPhone|iPad|iPod/))) {
        return true;
    }
    
    if (nav.hardwareConcurrency !== undefined) {
        const cores = nav.hardwareConcurrency;
        if (cores === 0 || cores > 128) return true;
    }
    
    if (window.screen) {
        const screenRatio = window.screen.width / window.screen.height;
        if (screenRatio < 0.5 || screenRatio > 5) return true;
    }
    
    const memoryDeviation = nav.deviceMemory && (nav.deviceMemory < 0.5 || nav.deviceMemory > 128);
    if (memoryDeviation) return true;

    if (userAgent.length < 30 || userAgent.length > 500) return true;
    
    return false;
}

function bbcs_detectUnsupportedFeatures() {
    const modernApis = ['Promise', 'fetch', 'Map', 'Set', 'Symbol', 'WeakMap', 'WeakSet'];
    const modernNavFeatures = ['serviceWorker', 'permissions', 'geolocation'];
    
    let missingBasicApis = modernApis.some(api => typeof window[api] === 'undefined');
    
    if (missingBasicApis) {
        return true;
    }
    
    const inconsistentBuiltins = (window.Array && typeof window.Array.from === 'undefined') || 
                                 (window.Object && typeof window.Object.assign === 'undefined');
    if (inconsistentBuiltins) {
        return true;
    }
    
    if (typeof Proxy !== 'undefined' && typeof Reflect === 'undefined') {
        return true;
    }

    if (typeof Worker !== 'undefined' && typeof SharedWorker === 'undefined' && 
        !navigator.userAgent.includes('Firefox')) {
        return true;
    }

    const asyncStorage = !window.indexedDB && window.localStorage;
    if (asyncStorage) {
        return true;
    }
    
    try {
        if (typeof window.localStorage !== 'undefined') {
            const testKey = `_bbcs_test_${Date.now()}`;
            window.localStorage.setItem(testKey, '1');
            if (window.localStorage.getItem(testKey) !== '1') {
                return true;
            }
            window.localStorage.removeItem(testKey);
        }
    } catch(e) {
        if (!e.toString().includes('quota') && !e.toString().includes('secure context')) {
            return true;
        }
    }

    const hasCanvas = typeof HTMLCanvasElement !== 'undefined';
    const hasAudio = typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';
    
    if (hasCanvas && !hasAudio && !navigator.userAgent.includes('Mobile')) {
        return true;
    }
    
    return false;
}

function bbcs_detectFakePlugins() {
    const plugins = navigator.plugins || [];
    
    if (plugins.length === 0 && !navigator.userAgent.includes('Mobile')) {
        const chromeBased = navigator.userAgent.includes('Chrome') || 
                           navigator.userAgent.includes('Edg') || 
                           navigator.userAgent.includes('OPR');
        if (chromeBased) {
            return true;
        }
    }
    
    if (plugins.length > 0) {
        let allNames = [];
        for (let i = 0; i < plugins.length; i++) {
            allNames.push(plugins[i].name);
        }
        
        const hasMultiplePdf = allNames.filter(name => 
            name.includes('PDF') || name.includes('Acrobat')
        ).length > 2;
        
        if (hasMultiplePdf) {
            return true;
        }
        
        const hasInvalidLength = Array.from(plugins).some(p => 
            typeof p.length !== 'number' || 
            p.length === 0 ||
            (p.length > 0 && !p[0])
        );
        
        if (hasInvalidLength) {
            return true;
        }
        
        if (plugins.namedItem && plugins.item) {
            const firstPlugin = plugins[0];
            const byName = plugins.namedItem(firstPlugin.name);
            const byIndex = plugins.item(0);
            
            if (firstPlugin !== byName || firstPlugin !== byIndex) {
                return true;
            }
        }
    }
    
    if (typeof navigator.mimeTypes !== 'undefined') {
        const mimes = navigator.mimeTypes;
        if (plugins.length > 0 && mimes.length === 0) {
            return true;
        }
    }
    
    return false;
}

function bbcs_detectFontRenderMismatch() {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    
    try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return true;
        
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFF';
        ctx.font = '24px "Arial", sans-serif';
        ctx.fillText("QWЁЙß好きAБВ", 10, 40);
        
        ctx.font = '24px "Times New Roman", serif';
        ctx.fillText("XYЭЮę很好", 10, 20);
        
        const data = canvas.toDataURL();
        if (!data || data === 'data:,' || data.length < 500) {
            return true;
        }
        
        const emptyData = document.createElement('canvas')
            .toDataURL()
            .length;
            
        if (data.length <= emptyData) {
            return true;
        }
        
        const imgData = ctx.getImageData(0, 0, 8, 8).data;
        let allZero = true;
        let allFF = true;
        
        for (let i = 0; i < imgData.length; i++) {
            if (imgData[i] !== 0) allZero = false;
            if (imgData[i] !== 255) allFF = false;
        }
        
        if (allZero || allFF) {
            return true;
        }
    } catch(e) {
        return true;
    }
    
    return false;
}

function bbcs_detectChromiumProperties() {
    const isChromiumClaim = !!window.chrome;
    
    if (isChromiumClaim) {
        const chromeObj = window.chrome;
        const emptyChrome = Object.keys(chromeObj).length === 0;
        
        if (emptyChrome) {
            return true;
        }
        
        const hasRuntime = typeof chromeObj.runtime === 'object';
        const hasWebstore = typeof chromeObj.webstore === 'object';
        
        const invalidStructure = 
            (hasRuntime && (!chromeObj.runtime.id || !chromeObj.runtime.connect)) ||
            (hasWebstore && typeof chromeObj.webstore.install !== 'function');
            
        if (invalidStructure) {
            return true;
        }
    }
    
    const anomalyProps = [
        '_phantom',
        '__nightmare',
        'callPhantom',
        '_selenium',
        'callSelenium',
        '_Selenium_IDE_Recorder',
        '__webdriver_script_fn',
        '__driver_evaluate',
        '__webdriver_evaluate',
        '__selenium_evaluate',
        '__fxdriver_evaluate',
        '__driver_unwrapped',
        '__webdriver_unwrapped',
        '__selenium_unwrapped',
        '__fxdriver_unwrapped',
        '__webdriver_script_func',
        '$chrome_asyncScriptInfo',
        '$cdc_asdjflasutopfhvcZLmcfl_',
        '__puppeteer_evaluation_script__',
        '__playwright_evaluation_script__',
        '_WEBDRIVER_ELEM_CACHE',
        'domAutomation',
        'domAutomationController',
        '__lastWatirAlert',
        '__lastWatirConfirm',
        '__lastWatirPrompt',
        'webdriver'
    ];
    
    if (anomalyProps.some(prop => prop in window)) {
        return true;
    }

    try {
        if ('$cdc_asdjflasutopfhvcZLmcfl_' in document ||
            'domAutomationController' in document ||
            '__webdriver_evaluate' in document) {
            return true;
        }
    } catch (e) {}

    try {
        if (navigator.permissions && navigator.permissions.query) {
            const fnStr = Function.prototype.toString.call(navigator.permissions.query);
            if (typeof fnStr === 'string' && !/\[native code\]/.test(fnStr)) {
                return true;
            }
        }
    } catch (e) {}
    
    if (navigator.userAgent.includes('Chrome') && !window.chrome) {
        return true;
    }

    if (navigator.userAgent.includes('Firefox') &&
        typeof CSS !== 'undefined' && CSS.supports &&
        !CSS.supports('-moz-appearance', 'none')) {
        return true;
    }
    
    return false;
}

function bbcs_detectWebGL() {
    const canvas = document.createElement('canvas');
    let gl;
    
    try {
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch (e) {
        return true;
    }
    
    if (!gl) {
        return false; 
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let renderer = '';
    let vendor = '';
    
    if (debugInfo) {
        renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
    } else {
        return false; 
    }
    
    if (renderer && vendor) {
        if (renderer.length < 2 || vendor.length < 2) {
            return true;
        }
        
        const standardVendors = ['NVIDIA', 'Intel', 'AMD', 'ATI', 'Apple', 'Microsoft', 'Qualcomm', 'ARM', 'Google'];
        const hasValidVendor = standardVendors.some(v => vendor.includes(v));
        
        if (!hasValidVendor) {
            return true;
        }
        
        const blacklistedRenderers = ['SwiftShader', 'VirtualBox', 'VMware', 'llvmpipe', 'Software Rasterizer', 'Microsoft Basic Render'];
        const isEmulated = blacklistedRenderers.some(r => renderer.includes(r));
        
        if (isEmulated) {
            return true;
        }
    }
    
    return false;
}

function bbcs_detectTouchEvent() {
    const hasTouch = 'ontouchstart' in window || 
                      navigator.maxTouchPoints > 0;
                      
    const screenTouchMatch = window.matchMedia && 
                            window.matchMedia('(pointer: coarse)').matches === hasTouch;
                            
    if (!screenTouchMatch) {
        return true;
    }
    
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (mobileUA && (!hasTouch || navigator.maxTouchPoints === 0)) {
        return true;
    }
    
    if (hasTouch && navigator.maxTouchPoints > 20) {
        return true;
    }
    
    const desktopDeviceWithTouch = 
        !mobileUA && 
        hasTouch && 
        navigator.maxTouchPoints <= 5 && 
        /Windows NT|Macintosh|Linux/i.test(navigator.userAgent);
        
    if (desktopDeviceWithTouch && 
        (window.outerHeight - window.innerHeight > 200 || 
         window.outerWidth - window.innerWidth > 200)) {
        return true;
    }
    
    if (hasTouch && navigator.maxTouchPoints === 1 && !mobileUA) {
        return true;
    }
    
    return false;
}

function bbcs_detectBatteryAPI() {
    if (!('getBattery' in navigator) && !('battery' in navigator)) {
        const modernBrowser = typeof fetch === 'function' && 
                             typeof Promise === 'function' &&
                             typeof Symbol === 'function';
        
        const isModernMobile = /Android|iPhone|iPad/.test(navigator.userAgent) && 
                              parseInt(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || '0', 10) >= 60;
                              
        if (modernBrowser && isModernMobile) {
            return true;
        }
        
        return false;
    }
    
    try {
        const battery = navigator.battery || {};
        
        if (typeof battery !== 'object') {
            return true;
        }
        
        if ('level' in battery) {
            const level = battery.level;
            if (typeof level !== 'number' || level < 0 || level > 1) {
                return true;
            }
        }
        
        if ('charging' in battery && typeof battery.charging !== 'boolean') {
            return true;
        }
        
        if (!('addEventListener' in battery) && 'getBattery' in navigator) {
            return true;
        }
    } catch (e) {}
    
    return false;
}

function bbcs_detectMediaDevices() {
    if (!('mediaDevices' in navigator)) {
        return false;
    }
    
    const mediaDevices = navigator.mediaDevices;
    
    if (typeof mediaDevices.enumerateDevices !== 'function') {
        return true;
    }
    
    const getUserMediaFn = mediaDevices.getUserMedia;
    if (typeof getUserMediaFn !== 'function') {
        return true;
    }
    
    try {
        let descriptor = Object.getOwnPropertyDescriptor(mediaDevices, 'enumerateDevices');
        if (descriptor && !descriptor.configurable) {
            return true;
        }
    } catch (e) {}
    
    return false;
}

function bbcs_detectPermissions() {
    if (!('permissions' in navigator)) {
        return false;
    }
    
    const permissions = navigator.permissions;
    
    if (typeof permissions.query !== 'function') {
        return true;
    }
    
    return false;
}

function bbcs_detectLanguageMismatch() {
    const lang = navigator.language || navigator.userLanguage || '';
    const langs = navigator.languages || [];
    
    if (Array.isArray(langs) && langs.length > 0) {
        if (langs[0] !== lang) {
            return true;
        }
        
        const uniqueLangs = new Set(langs);
        if (uniqueLangs.size !== langs.length) {
            return true;
        }
        
        const invalidLang = langs.some(l => typeof l !== 'string' || l.length < 2 || l.length > 35);
        if (invalidLang) {
            return true;
        }
    }
    
    if (!lang || lang.length < 2) {
        return true;
    }
    
    const invalidChars = /[^a-zA-Z0-9\-_]/;
    if (invalidChars.test(lang)) {
        return true;
    }
    
    const acceptLanguage = navigator.languages?.join(',') || navigator.language || '';
    if (acceptLanguage && !acceptLanguage.includes(lang)) {
        return true;
    }
    
    return false;
}

let _bbcs_incognitoResult = false;
let _bbcs_incognitoResolved = false;

(function() {
    var ua = navigator.userAgent;
    var isChromium = ua.includes('Chrome') || ua.includes('Edg/');
    var isSafari = ua.includes('Safari') && !ua.includes('Chrome');

    if (isChromium) {
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(function(est) {
                _bbcs_incognitoResult = est.quota < 120000000;
                _bbcs_incognitoResolved = true;
            }).catch(function() { _bbcs_incognitoResolved = true; });
        } else {
            var fs = window.requestFileSystem || window.webkitRequestFileSystem;
            if (fs) {
                fs(window.TEMPORARY, 100,
                    function() { _bbcs_incognitoResolved = true; },
                    function() { _bbcs_incognitoResult = true; _bbcs_incognitoResolved = true; }
                );
            } else {
                _bbcs_incognitoResolved = true;
            }
        }
    } else if (isSafari) {
        try {
            var db = window.indexedDB.open('_bbcs_inc');
            db.onerror = function() { _bbcs_incognitoResult = true; _bbcs_incognitoResolved = true; };
            db.onsuccess = function() { _bbcs_incognitoResolved = true; try { db.result.close(); } catch(e) {} };
        } catch (e) {
            _bbcs_incognitoResolved = true;
        }
    } else {
        _bbcs_incognitoResolved = true;
    }
})();

function bbcs_isIncognito() {
    if (_bbcs_incognitoResolved) return _bbcs_incognitoResult;
    const ua = navigator.userAgent;

    if (ua.includes('Firefox')) {
        try {
            const idbReq = indexedDB.open('_bbcs_inc');
            if (Object.getPrototypeOf(idbReq).constructor.name !== 'IDBOpenDBRequest') {
                return true;
            }
        } catch (e) {
            return true;
        }
        return false;
    }

    if (ua.includes('Safari') && !ua.includes('Chrome')) {
        try {
            if (!window.localStorage) return true;
            window.localStorage.setItem('_bbcs_t', '1');
            window.localStorage.removeItem('_bbcs_t');
        } catch (e) {
            return true;
        }
        return false;
    }

    return _bbcs_incognitoResult;
}

function bbcs_clean_and_decode_base64_to_utf8(str) {
   str = str.replace(/\s/g, '');
   return decodeURIComponent(escape(window.atob(str)));
}

window.bbcs_detectJitter = bbcs_detectJitter;
window.bbcs_detectNavigatorMismatch = bbcs_detectNavigatorMismatch;
window.bbcs_detectUnsupportedFeatures = bbcs_detectUnsupportedFeatures;
window.bbcs_detectFakePlugins = bbcs_detectFakePlugins;
window.bbcs_detectFontRenderMismatch = bbcs_detectFontRenderMismatch;
window.bbcs_detectChromiumProperties = bbcs_detectChromiumProperties;
window.bbcs_detectWebGL = bbcs_detectWebGL;
window.bbcs_detectTouchEvent = bbcs_detectTouchEvent;
window.bbcs_detectBatteryAPI = bbcs_detectBatteryAPI;
window.bbcs_detectMediaDevices = bbcs_detectMediaDevices;
window.bbcs_detectPermissions = bbcs_detectPermissions;
window.bbcs_detectLanguageMismatch = bbcs_detectLanguageMismatch;
window.bbcs_isIncognito = bbcs_isIncognito;
window.bbcs_clean_and_decode_base64_to_utf8 = bbcs_clean_and_decode_base64_to_utf8;