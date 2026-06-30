/* FingerprintJS by BotBlocker v0.2.0 | MIT | https://botblocker.top */

// src/storage.js
function createMemoryStorage(initialState) {
  const memory = initialState instanceof Map ? initialState : new Map(Object.entries(initialState || {}));
  return Object.freeze({
    type: "memory",
    get(key) {
      return memory.get(key) || null;
    },
    set(key, value) {
      memory.set(key, value);
    }
  });
}
function canUseStorage(globalRef, key) {
  try {
    const storage = globalRef && globalRef[key];
    if (!storage || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
      return false;
    }
    const testKey = "__fingerprint_framework_test__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch (_error) {
    return false;
  }
}
export {
  canUseStorage,
  createMemoryStorage
};
