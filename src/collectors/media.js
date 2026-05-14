import { detectBrowserQuirks, shouldSuppressSignal } from '../browser-quirks.js';
import { createCollector } from './core.js';
import { checksumString, getWindowRef, safeNumber } from './shared.js';

export function createAudioCollector() {
  return createCollector({
    id: 'audio.fingerprint',
    version: '1',
    category: 'media',
    sensitivity: 'high',
    mode: 'active',
    stability: 'stable',
    weight: 1.2,
    async collect(context) {
      const quirks = detectBrowserQuirks(context);
      if (shouldSuppressSignal('audio', quirks)) {
        return { status: 'suppressed', reason: 'known_unstable_audio' };
      }

      const windowRef = getWindowRef(context);
      const OfflineAudioContext = windowRef.OfflineAudioContext || windowRef.webkitOfflineAudioContext;
      if (typeof OfflineAudioContext !== 'function') {
        return { status: 'unsupported' };
      }

      return renderAudio(OfflineAudioContext);
    }
  });
}

async function renderAudio(OfflineAudioContext) {
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

  const rendered = await resolveRenderedBuffer(audioContext);
  const samples = rendered && typeof rendered.getChannelData === 'function' ? rendered.getChannelData(0) : new Float32Array(0);

  return {
    status: 'ok',
    sampleRate: safeNumber(rendered && rendered.sampleRate) || sampleRate,
    length: safeNumber(rendered && rendered.length) || length,
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

function resolveRenderedBuffer(audioContext) {
  const rendered = audioContext.startRendering();
  if (rendered && typeof rendered.then === 'function') {
    return rendered;
  }

  return new Promise((resolve, reject) => {
    audioContext.oncomplete = (event) => resolve(event.renderedBuffer);
    audioContext.onerror = reject;
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