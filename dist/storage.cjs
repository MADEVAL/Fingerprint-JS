/* FingerprintJS by BotBlocker v0.1.1 | MIT | https://botblocker.top */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/storage-public.js
var storage_public_exports = {};
__export(storage_public_exports, {
  canUseStorage: () => canUseStorage,
  createMemoryStorage: () => createMemoryStorage
});
module.exports = __toCommonJS(storage_public_exports);

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  canUseStorage,
  createMemoryStorage
});
