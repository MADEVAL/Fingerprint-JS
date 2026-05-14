import {
  createApplePayCollector,
  createDomBlockersCollector,
  createPdfViewerCollector,
  createPluginsCollector,
  createPrivateClickMeasurementCollector,
  createVendorFlavorsCollector
} from './browser-features.js';
import { createMediaPreferencesCollector, createScreenCollector, createScreenFrameCollector } from './display.js';
import { createFontPreferencesCollector, createFontsCollector } from './fonts.js';
import { createCanvasCollector, createWebglCollector, createWebglExtensionsCollector } from './graphics.js';
import { createArchitectureCollector, createHardwareCollector, createTouchSupportCollector } from './hardware.js';
import { createDateTimeLocaleCollector, createLocaleCollector, createTimezoneCollector } from './locale.js';
import { createMathCollector } from './math.js';
import { createAudioBaseLatencyCollector, createAudioCollector } from './media.js';
import { createBrowserRuntimeCollector, createClientHintsCollector, createNavigatorPropertiesCollector, createNodeRuntimeCollector } from './runtime.js';
import { createStorageCapabilitiesCollector } from './storage-signals.js';

export function createDefaultCollectors() {
  return [
    createBrowserRuntimeCollector(),
    createClientHintsCollector(),
    createNavigatorPropertiesCollector(),
    createNodeRuntimeCollector(),
    createLocaleCollector(),
    createDateTimeLocaleCollector(),
    createTimezoneCollector(),
    createScreenCollector(),
    createScreenFrameCollector(),
    createMediaPreferencesCollector(),
    createHardwareCollector(),
    createTouchSupportCollector(),
    createArchitectureCollector(),
    createStorageCapabilitiesCollector(),
    createPluginsCollector(),
    createVendorFlavorsCollector(),
    createPdfViewerCollector(),
    createApplePayCollector(),
    createPrivateClickMeasurementCollector(),
    createMathCollector(),
    createDomBlockersCollector(),
    createFontsCollector(),
    createFontPreferencesCollector(),
    createAudioBaseLatencyCollector(),
    createAudioCollector(),
    createWebglCollector(),
    createWebglExtensionsCollector(),
    createCanvasCollector()
  ];
}

export function createBrowserCollectorPack() {
  return createDefaultCollectors().filter((collector) => collector.id !== 'runtime.node');
}