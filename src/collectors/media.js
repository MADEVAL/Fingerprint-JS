import { detectBrowserQuirks, getSuppressionReason, shouldSuppressSignal } from '../browser-quirks.js';
import { createCollector } from './core.js';
import { checksumString, getWindowRef, safeNumber } from './shared.js';

const DEFAULT_AUDIO_RENDER_TIMEOUT_MS = 1500;

export function createAudioCollector() {
  return createCollector({
    id: 'audio.fingerprint',
    version: '2',
    category: 'media',
    sensitivity: 'high',
    mode: 'active',
    stability: 'stable',
    weight: 1.2,
    async prepare(context) {
      return collectAudioFingerprint(context);
    },
    async collect(context, prepared) {
      if (prepared !== undefined) {
        return prepared;
      }

      return collectAudioFingerprint(context);
    }
  });
}

export function createAudioBaseLatencyCollector() {
  return createCollector({
    id: 'audio.baseLatency',
    version: '1',
    category: 'media',
    sensitivity: 'medium',
    mode: 'active',
    stability: 'stable',
    weight: 0.45,
    collect(context) {
      const quirks = detectBrowserQuirks(context);
      if (shouldSuppressSignal('audio', quirks)) {
        return { status: 'suppressed', reason: getSuppressionReason('audio', quirks) };
      }

      const windowRef = getWindowRef(context);
      const AudioContext = windowRef.AudioContext || windowRef.webkitAudioContext;
      if (typeof AudioContext !== 'function') {
        return { status: 'unsupported' };
      }

      try {
        const audioContext = new AudioContext();
        const value = {
          status: 'ok',
          baseLatency: safeNumber(audioContext.baseLatency),
          outputLatency: safeNumber(audioContext.outputLatency),
          sampleRate: safeNumber(audioContext.sampleRate),
          state: typeof audioContext.state === 'string' ? audioContext.state : null
        };

        if (typeof audioContext.close === 'function') {
          void audioContext.close();
        }

        return value;
      } catch (error) {
        return { status: 'error', message: error && error.message ? String(error.message) : 'audio_context_error' };
      }
    }
  });
}

async function collectAudioFingerprint(context) {
  const quirks = detectBrowserQuirks(context);
  if (shouldSuppressSignal('audio', quirks)) {
    return { status: 'suppressed', reason: getSuppressionReason('audio', quirks) };
  }

  const windowRef = getWindowRef(context);
  const OfflineAudioContext = windowRef.OfflineAudioContext || windowRef.webkitOfflineAudioContext;
  if (typeof OfflineAudioContext !== 'function') {
    return { status: 'unsupported' };
  }

  return renderAudio(OfflineAudioContext, context);
}

async function renderAudio(OfflineAudioContext, context) {
  const length = 4096;
  const sampleRate = 44100;
  const audioContext = new OfflineAudioContext(1, length, sampleRate);

  if (typeof audioContext.createOscillator !== 'function' || typeof audioContext.startRendering !== 'function') {
    return { status: 'unsupported' };
  }

  const oscillator = audioContext.createOscillator();
  let compressor = null;
  if (typeof audioContext.createDynamicsCompressor === 'function') {
    compressor = audioContext.createDynamicsCompressor();
  }

  oscillator.type = 'triangle';
  if (oscillator.frequency && typeof oscillator.frequency.setValueAtTime === 'function') {
    oscillator.frequency.setValueAtTime(10000, audioContext.currentTime || 0);
  }

  if (compressor) {
    configureCompressor(compressor, audioContext.currentTime || 0);
    oscillator.connect(compressor);
    compressor.connect(audioContext.destination);
  } else {
    oscillator.connect(audioContext.destination);
  }

  oscillator.start(0);
  if (typeof oscillator.stop === 'function') {
    oscillator.stop(0.05);
  }

  const renderedResult = await resolveRenderedBuffer(audioContext, context);
  if (!renderedResult.ok) {
    return renderedResult.value;
  }

  const rendered = renderedResult.buffer;
  const samples = rendered && typeof rendered.getChannelData === 'function' ? rendered.getChannelData(0) : new Float32Array(0);

  return {
    status: 'ok',
    sampleRate: safeNumber(rendered && rendered.sampleRate) || sampleRate,
    length: safeNumber(rendered && rendered.length) || length,
    renderAttempts: renderedResult.attempts,
    checksum: checksumSamples(samples)
  };
}

function configureCompressor(compressor, currentTime) {
  setAudioParam(compressor.threshold, -50, currentTime);
  setAudioParam(compressor.knee, 40, currentTime);
  setAudioParam(compressor.ratio, 12, currentTime);
  setAudioParam(compressor.attack, 0, currentTime);
  setAudioParam(compressor.release, 0.25, currentTime);
}

function setAudioParam(param, value, currentTime) {
  if (param && typeof param.setValueAtTime === 'function') {
    param.setValueAtTime(value, currentTime);
  }
}

async function resolveRenderedBuffer(audioContext, context) {
  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const buffer = await startRenderingOnce(audioContext, context);
      return Object.freeze({ ok: true, buffer, attempts: attempt });
    } catch (error) {
      lastError = error;
      if (!shouldRetryAudioRender(audioContext, attempt, maxAttempts)) {
        break;
      }
      await Promise.resolve();
    }
  }

  return Object.freeze({
    ok: false,
    value: Object.freeze({
      status: audioContext.state === 'suspended' ? 'suspended' : lastError && lastError.code === 'audio_render_timeout' ? 'timeout' : 'error',
      message: lastError && lastError.message ? String(lastError.message) : 'audio_render_failed'
    })
  });
}

function startRenderingOnce(audioContext, context) {
  const renderedPromise = new Promise((resolve, reject) => {
    audioContext.oncomplete = (event) => resolve(event && event.renderedBuffer);
    audioContext.onerror = reject;
  });

  const rendered = audioContext.startRendering();
  const pending = rendered && typeof rendered.then === 'function' ? rendered : renderedPromise;
  return withAudioTimeout(pending, context);
}

function shouldRetryAudioRender(audioContext, attempt, maxAttempts) {
  return attempt < maxAttempts && audioContext.state === 'suspended';
}

function withAudioTimeout(promise, context) {
  const runtimeTimers = getTimerFns(context && (context.global || context.window));
  const fallbackTimers = getTimerFns(globalThis);
  const timers = runtimeTimers || fallbackTimers;
  const timeoutMs = Number.isFinite(context && context.audioRenderTimeoutMs)
    ? Math.max(0, Number(context.audioRenderTimeoutMs))
    : DEFAULT_AUDIO_RENDER_TIMEOUT_MS;

  if (!timeoutMs || !timers) {
    return promise;
  }

  let timeoutId;
  const timeout = new Promise((_resolve, reject) => {
    timeoutId = timers.set(() => {
      const error = new Error('audio_render_timeout');
      error.code = 'audio_render_timeout';
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => timers.clear(timeoutId));
}

function getTimerFns(ref) {
  if (!ref || typeof ref.setTimeout !== 'function' || typeof ref.clearTimeout !== 'function') {
    return null;
  }

  return Object.freeze({
    set: ref.setTimeout.bind(ref),
    clear: ref.clearTimeout.bind(ref)
  });
}

function checksumSamples(samples) {
  let summary = '';
  const limit = Math.min(samples.length, 256);
  for (let index = 0; index < limit; index += 1) {
    summary += `${Math.round((Number(samples[index]) || 0) * 100000)}|`;
  }

  return checksumString(summary);
}