/*
 * BotBlocker Detection Utilities
 * Version: 2.0.0
 * Copyright (c) 2026 BotBlocker
 * 
 */

function bbcs_computeFingerprint() {

    const components = [];
    const addComponent = (name, value) => {
        if (value !== undefined) components.push(`${name}:${value}`);
    };

    const navData = [
        navigator.userAgent,
        navigator.platform,
        navigator.vendor,
        navigator.language,
        Array.isArray(navigator.languages) ? navigator.languages.join(',') : '',
        navigator.hardwareConcurrency,
        navigator.deviceMemory,
        navigator.maxTouchPoints,
        screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
        window.innerWidth + 'x' + window.innerHeight,
        window.outerWidth + 'x' + window.outerHeight,
        window.devicePixelRatio
    ].filter(Boolean).join('|');
    addComponent('nav', navData);

    try {
        const canvas = document.createElement('canvas');
        canvas.width = 280;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');

        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#0f0');
        gradient.addColorStop(0.5, '#f0f');
        gradient.addColorStop(1, '#00f');
        ctx.fillStyle = gradient;
        ctx.font = '16px Arial';
        ctx.fillText("BotBlocker 👾 2025", 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.font = '18px Times New Roman';
        ctx.fillText("BotblockeR", 4, 45);

        ctx.fillStyle = '#f0f';
        ctx.font = 'bold 14px Georgia';
        ctx.fillText("👻🔒🛡️", 180, 30);

        ctx.strokeStyle = '#639';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 30);
        ctx.bezierCurveTo(25, 15, 75, 55, 100, 30);
        ctx.stroke();

        const dataURL = canvas.toDataURL();
        const canvasHash = simpleHash(dataURL.substring(0, 1000)); 
        addComponent('cnv', canvasHash);
    } catch(e) {
        addComponent('cnv_err', simpleHash(e.toString()));
    }

    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
            const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
            const webglData = [
                gl.getParameter(gl.VERSION),
                vendor,
                renderer,
                gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                (gl.getSupportedExtensions() || []).join('~').substring(0, 100) 
            ].join('|');
            addComponent('gl', simpleHash(webglData));

            const shaderPrecision = [
                gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT).precision,
                gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision,
                gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT).rangeMin,
                gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT).rangeMax
            ].join('|');
            addComponent('gl_prec', simpleHash(shaderPrecision));
        }
    } catch(e) {
        addComponent('gl_err', simpleHash(e.toString()));
    }

    try {
        const audioContext = window.AudioContext || window.webkitAudioContext;
        if (audioContext) {
            let audioContextAllowed = false;
            try {
                const tempContext = new audioContext();
                if (tempContext.state === 'running') {
                    audioContextAllowed = true;
                    
                    const oscillator = tempContext.createOscillator();
                    const analyser = tempContext.createAnalyser();
                    const gain = tempContext.createGain();
                    oscillator.type = 'triangle';
                    gain.gain.value = 0; 
                    oscillator.connect(analyser);
                    analyser.connect(gain);
                    gain.connect(tempContext.destination);
                    
                    analyser.fftSize = 256;
                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);
                    
                    oscillator.start();
                    analyser.getByteFrequencyData(dataArray);
                    oscillator.stop();

                    const samples = [];
                    for (let i = 0; i < bufferLength; i += 4) {
                        samples.push(dataArray[i]);
                    }
                    addComponent('aud', simpleHash(samples.join(',')));
                    addComponent('aud_ctx', simpleHash(tempContext.sampleRate + '|' + tempContext.destination.channelCount));

                    if (typeof tempContext.close === 'function') {
                        tempContext.close();
                    }
                } else {
                    addComponent('aud', 'suspended');
                    if (typeof tempContext.close === 'function') {
                        tempContext.close();
                    }
                }
            } catch(e) {
                addComponent('aud', 'blocked');
            }
        } else {
            addComponent('aud', 'not_supported');
        }
    } catch(e) {
        addComponent('aud_err', simpleHash(e.toString()));
    }

    try {
        const timeData = [
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            new Date().getTimezoneOffset(),
            Intl.DateTimeFormat().resolvedOptions().locale,
            new Date().toString().substring(0, 25)
        ].join('|');
        addComponent('tz', simpleHash(timeData));
    } catch(e) {
        addComponent('tz_err', simpleHash(e.toString()));
    }

    const mathConstants = [
        Math.PI.toString().substring(0, 40),
        Math.E.toString().substring(0, 40),
        Math.SQRT2.toString().substring(0, 40),
        Math.SQRT1_2.toString().substring(0, 40),
        Math.LN2.toString().substring(0, 40),
        Math.LN10.toString().substring(0, 40),
        Math.LOG2E.toString().substring(0, 40),
        Math.LOG10E.toString().substring(0, 40)
    ].join('');
    
    const mathOperations = [
        Math.sin(Math.PI / 4).toString(),
        Math.cos(Math.PI / 4).toString(),
        Math.tan(Math.PI / 4).toString(),
        Math.sin(0).toString(),
        Math.exp(1).toString(),
        Math.log(10).toString(),
        Math.log10(100).toString(),
        Math.sqrt(2).toString(),
        Math.cbrt(27).toString()
    ].join('');
    
    addComponent('math', simpleHash(mathConstants + mathOperations));

    const apiFeatures = [
        'Promise' in window,
        'Symbol' in window,
        'fetch' in window,
        'Proxy' in window,
        'Reflect' in window,
        'Map' in window,
        'Set' in window,
        'WeakMap' in window,
        'WeakSet' in window,
        'BigInt' in window,
        'Atomics' in window,
        'SharedArrayBuffer' in window,
        'Intl' in window,
        'WebAssembly' in window,
        'ArrayBuffer' in window,
        'WebSocket' in window,
        'Worker' in window,
        'IntersectionObserver' in window,
        'ResizeObserver' in window,
        'MutationObserver' in window,
        'localStorage' in window,
        'sessionStorage' in window,
        'indexedDB' in window,
        'crypto' in window,
        'Bluetooth' in navigator,
        'clipboard' in navigator,
        'credentials' in navigator,
        'geolocation' in navigator,
        'mediaDevices' in navigator,
        'serviceWorker' in navigator,
        'requestIdleCallback' in window,
        'speechSynthesis' in window,
        'performance' in window,
        'Notification' in window
    ].map((val, idx) => val ? idx.toString(36) : '').join('');
    addComponent('api', simpleHash(apiFeatures));

    try {
        if (navigator.plugins) {
            const plugins = Array.from(navigator.plugins || [])
                .map(p => [p.name, p.description, p.filename].filter(Boolean).join('~'))
                .join('|');
            if (plugins) addComponent('plg', simpleHash(plugins));

            const mimeTypes = Array.from(navigator.mimeTypes || [])
                .map(m => [m.type, m.description, m.suffixes].filter(Boolean).join('~'))
                .join('|');
            if (mimeTypes) addComponent('mime', simpleHash(mimeTypes));
        }
    } catch(e) {
        addComponent('plg_err', simpleHash(e.toString()));
    }

    try {
        if (performance) {
            const performanceData = [
                performance.timeOrigin,
                performance.now(),
                performance.memory ? performance.memory.jsHeapSizeLimit : null,
                performance.memory ? performance.memory.totalJSHeapSize : null,
                performance.memory ? performance.memory.usedJSHeapSize : null
            ].filter(Boolean).join('|');
            addComponent('perf', simpleHash(performanceData));
        }
    } catch(e) {
        addComponent('perf_err', simpleHash(e.toString()));
    }

    let timeWarpDetection = '';
    try {
        const startNow = Date.now();
        const startPerf = performance.now();
        let sum = 0;
        for (let i = 0; i < 10000; i++) sum += Math.sqrt(i);
        const endNow = Date.now();
        const endPerf = performance.now();
        const dateTimeDiff = endNow - startNow;
        const perfTimeDiff = endPerf - startPerf;
        const timingRatio = dateTimeDiff > 0 ? (perfTimeDiff / dateTimeDiff).toFixed(2) : 'error';
        timeWarpDetection = timingRatio;
    } catch(e) {
        timeWarpDetection = 'error';
    }
    addComponent('time_warp', timeWarpDetection);

    try {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            const connData = [conn.effectiveType, conn.type, conn.downlink, conn.rtt, conn.saveData]
                .filter(v => v !== undefined).join('|');
            addComponent('conn', simpleHash(connData));
        }
    } catch(e) {}

    try {
        if (typeof CSS !== 'undefined' && CSS.supports) {
            const cssFeatures = [
                CSS.supports('-webkit-appearance', 'none'),
                CSS.supports('-moz-appearance', 'none'),
                CSS.supports('accent-color', 'auto'),
                CSS.supports('container-type', 'inline-size'),
                CSS.supports('color', 'oklch(0.5 0.2 240)'),
                CSS.supports('view-transition-name', 'root'),
                CSS.supports('anchor-name', '--a')
            ].map((v, i) => v ? i.toString(36) : '').join('');
            addComponent('css', simpleHash(cssFeatures));
        }
    } catch(e) {}

    function simpleHash(str) {
        if (!str) return 'empty';
        
        let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
        h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
        h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

        const h = 4294967296 * (2097151 & h2) + (h1 >>> 0);
        return h.toString(36);
    }

    const allComponents = components.join(';');
    const fingerprint = simpleHash(allComponents);

    return {
        fingerprint: fingerprint,
        //fingerprintDetails: allComponents // Uncomment to see the details and debug 
    };
}

window.bbcs_computeFingerprint = bbcs_computeFingerprint;