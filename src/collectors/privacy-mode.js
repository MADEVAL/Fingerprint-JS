import { createCollector } from './core.js';
import { canUseStorage } from '../storage.js';
import { createCheck, roundScore, safeNumber } from './shared.js';

const LOW_QUOTA_BYTES = 120 * 1024 * 1024;

export function createPrivacyModeCollector() {
  return createCollector({
    id: 'browser.privacyMode',
    version: '1',
    category: 'privacy',
    sensitivity: 'medium',
    mode: 'active',
    stability: 'volatile',
    weight: 0.85,
    hashable: false,
    async collect(context) {
      const globalRef = context.global || {};
      const navigatorRef = context.navigator || {};
      if (isNodeLikeRuntime(globalRef, context.document)) {
        return createResult('unsupported', 0, [], [], 'Private-mode indicators are browser-only.');
      }

      const storageRef = navigatorRef.storage || null;
      const localStorage = probeWebStorage(globalRef, 'localStorage', 0.2);
      const sessionStorage = probeWebStorage(globalRef, 'sessionStorage', 0.15);
      const indexedDB = await probeIndexedDb(globalRef);
      const estimate = await probeStorageEstimate(storageRef);
      const persisted = await probePersistedStorage(storageRef);
      const checks = [
        localStorage,
        sessionStorage,
        createCheck('indexedDB.blocked', indexedDB.blocked, 0.25, indexedDB.detail),
        createCheck('storage.lowQuota', estimate.lowQuota, 0.2, estimate.detail),
        createCheck('storage.notPersisted', persisted.notPersisted, 0.05, persisted.detail)
      ];
      const score = roundScore(checks.reduce((total, check) => total + (check.matched ? check.weight : 0), 0));
      const evidence = checks.filter((check) => check.matched).map((check) => check.name);

      return createResult(
        score >= 0.5 ? 'likely_private' : score >= 0.25 ? 'possible_private' : 'no_private_evidence',
        score,
        evidence,
        checks,
        'No browser exposes a universal private-mode flag; this component reports conservative indicators only.'
      );
    }
  });
}

function createResult(verdict, score, evidence, checks, note) {
  return {
    verdict,
    score,
    confidence: score >= 0.5 ? 'medium' : score >= 0.25 ? 'low' : 'none',
    evidence,
    checks,
    note
  };
}

function isNodeLikeRuntime(globalRef, documentRef) {
  return Boolean(!documentRef && globalRef && globalRef.process && globalRef.process.versions && globalRef.process.versions.node);
}

function probeWebStorage(globalRef, key, weight) {
  return createCheck(`${key}.blocked`, !canUseStorage(globalRef, key), weight, null);
}

function probeIndexedDb(globalRef) {
  const indexedDB = globalRef && globalRef.indexedDB;
  if (!indexedDB || typeof indexedDB.open !== 'function') {
    return Promise.resolve({ blocked: true, detail: 'missing' });
  }

  try {
    const request = indexedDB.open('__fingerprint_framework_privacy_probe__', 1);
    if (!request || typeof request !== 'object') {
      return Promise.resolve({ blocked: false, detail: 'unknown' });
    }

    return new Promise((resolve) => {
      let finished = false;
      const finish = (blocked, detail) => {
        if (finished) {
          return;
        }

        finished = true;
        resolve({ blocked, detail });
      };

      request.onerror = () => finish(true, 'error');
      request.onblocked = () => finish(true, 'blocked');
      request.onsuccess = () => {
        closeDatabase(request.result);
        deleteDatabase(indexedDB);
        finish(false, 'available');
      };
    });
  } catch (_error) {
    return Promise.resolve({ blocked: true, detail: 'exception' });
  }
}

async function probeStorageEstimate(storageRef) {
  if (!storageRef || typeof storageRef.estimate !== 'function') {
    return { lowQuota: false, detail: null };
  }

  try {
    const estimate = await storageRef.estimate();
    const quota = safeNumber(estimate && estimate.quota);
    return {
      lowQuota: quota !== null && quota > 0 && quota < LOW_QUOTA_BYTES,
      detail: { quota, usage: safeNumber(estimate && estimate.usage) }
    };
  } catch (_error) {
    return { lowQuota: false, detail: 'unavailable' };
  }
}

async function probePersistedStorage(storageRef) {
  if (!storageRef || typeof storageRef.persisted !== 'function') {
    return { notPersisted: false, detail: null };
  }

  try {
    const persisted = await storageRef.persisted();
    return { notPersisted: persisted === false, detail: Boolean(persisted) };
  } catch (_error) {
    return { notPersisted: false, detail: 'unavailable' };
  }
}

function closeDatabase(database) {
  if (database && typeof database.close === 'function') {
    database.close();
  }
}

function deleteDatabase(indexedDB) {
  if (typeof indexedDB.deleteDatabase === 'function') {
    indexedDB.deleteDatabase('__fingerprint_framework_privacy_probe__');
  }
}

