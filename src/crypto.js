import { getGlobal } from './environment.js';

export async function hashValue(value, runtime = {}) {
  const text = String(value);
  const bytes = encodeText(text);
  const cryptoRef = Object.prototype.hasOwnProperty.call(runtime, 'crypto') ? runtime.crypto : getGlobal().crypto || null;

  if (cryptoRef && cryptoRef.subtle && typeof cryptoRef.subtle.digest === 'function') {
    const digest = await cryptoRef.subtle.digest('SHA-256', bytes);
    return Object.freeze({ algorithm: 'sha256:webcrypto', value: bytesToHex(new Uint8Array(digest)) });
  }

  try {
    const nodeCrypto = await importNodeCrypto(runtime);
    const value = nodeCrypto.createHash('sha256').update(text).digest('hex');
    return Object.freeze({ algorithm: 'sha256:node', value });
  } catch (_error) {
    return Object.freeze({ algorithm: 'fnv1a64:fallback', value: fnv1a64Hex(text) });
  }
}

function importNodeCrypto(runtime) {
  if (runtime && typeof runtime.importNodeCrypto === 'function') {
    return runtime.importNodeCrypto();
  }

  return import('node:crypto');
}

function encodeText(text) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text);
  }

  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index) & 0xff;
  }

  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fnv1a64Hex(text) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }

  return hash.toString(16).padStart(16, '0');
}
