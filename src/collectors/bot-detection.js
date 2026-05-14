import { createCollector } from './core.js';
import { getWindowRef, safeNumber, safeString, toArrayLike } from './shared.js';

const AUTOMATION_GLOBALS = Object.freeze([
  '__driver_evaluate',
  '__driver_unwrapped',
  '__fxdriver_evaluate',
  '__fxdriver_unwrapped',
  '__nightmare',
  '__playwright__binding__',
  '__pwInitScripts',
  '__selenium_evaluate',
  '__selenium_unwrapped',
  '__webdriver_evaluate',
  '__webdriver_script_fn',
  '__webdriver_script_func',
  '__webdriver_script_function',
  '__webdriver_unwrapped',
  '_phantom',
  '_Selenium_IDE_Recorder',
  'callPhantom',
  'calledSelenium',
  'callSelenium',
  'domAutomation',
  'domAutomationController',
  'phantom'
]);

const HEADLESS_UA_PATTERN = /HeadlessChrome|PhantomJS|SlimerJS|puppeteer|playwright/u;

export function createBotDetectionCollector() {
  return createCollector({
    id: 'browser.botDetection',
    version: '1',
    category: 'automation',
    sensitivity: 'medium',
    mode: 'passive',
    stability: 'stable',
    weight: 0.95,
    collect(context) {
      const navigatorRef = context.navigator;
      const windowRef = getWindowRef(context);
      const userAgent = safeString(navigatorRef && navigatorRef.userAgent) || '';
      const plugins = navigatorRef ? toArrayLike(navigatorRef.plugins) : [];
      const mimeTypes = navigatorRef ? toArrayLike(navigatorRef.mimeTypes) : [];
      const languages = normalizeLanguages(navigatorRef && navigatorRef.languages);
      const language = safeString(navigatorRef && navigatorRef.language) || '';
      const automationGlobals = AUTOMATION_GLOBALS.filter((property) => property in windowRef).sort();
      const languageIssues = detectLanguageIssues(language, languages);
      const hardwareIssues = detectHardwareIssues(navigatorRef || {});
      const checks = [
        createCheck('navigator.webdriver', navigatorRef && navigatorRef.webdriver === true, 0.45, null),
        createCheck('automation.globals', automationGlobals.length > 0, 0.35, automationGlobals),
        createCheck('headless.userAgent', HEADLESS_UA_PATTERN.test(userAgent), 0.3, userAgent || null),
        createCheck('empty.languages', Boolean(navigatorRef && language && languages.length === 0), 0.1, null),
        createCheck('language.mismatch', languageIssues.length > 0, 0.08, languageIssues),
        createCheck('impossible.hardware', hardwareIssues.length > 0, 0.08, hardwareIssues),
        createCheck('zero.outer.window', hasZeroOuterWindow(windowRef), 0.12, readWindowSize(windowRef)),
        createCheck('empty.chrome.plugins', isChromeLike(userAgent) && plugins.length === 0 && mimeTypes.length === 0, 0.08, null),
        createCheck('plugin.inconsistency', hasPluginInconsistency(plugins, mimeTypes), 0.08, summarizePlugins(plugins, mimeTypes)),
        createCheck('permissions.queryPatched', hasPatchedPermissionsQuery(navigatorRef), 0.08, null),
        createCheck('empty.chrome.global', isChromeLike(userAgent) && isEmptyChromeGlobal(windowRef), 0.06, null)
      ];

      const score = roundScore(checks.reduce((total, check) => total + (check.matched ? check.weight : 0), 0));
      const evidence = checks.filter((check) => check.matched).map((check) => check.name);
      const verdict = score >= 0.6 ? 'bot' : score >= 0.25 ? 'suspicious' : 'likely_human';

      return createAssessment(verdict, score, evidence, checks);
    }
  });
}

function createAssessment(verdict, score, evidence, checks) {
  return {
    verdict,
    score,
    confidence: score >= 0.6 ? 'high' : score >= 0.25 ? 'medium' : evidence.length > 0 ? 'low' : 'none',
    evidence,
    checks
  };
}

function createCheck(name, matched, weight, detail) {
  return {
    name,
    matched: Boolean(matched),
    weight,
    detail
  };
}

function normalizeLanguages(languages) {
  return Array.isArray(languages) ? languages.filter((language) => typeof language === 'string' && language.length > 0) : [];
}

function hasZeroOuterWindow(windowRef) {
  const outerWidth = safeNumber(windowRef.outerWidth);
  const outerHeight = safeNumber(windowRef.outerHeight);
  const innerWidth = safeNumber(windowRef.innerWidth);
  const innerHeight = safeNumber(windowRef.innerHeight);
  return outerWidth === 0 && outerHeight === 0 && (Number(innerWidth) > 0 || Number(innerHeight) > 0);
}

function readWindowSize(windowRef) {
  return {
    outerWidth: safeNumber(windowRef.outerWidth),
    outerHeight: safeNumber(windowRef.outerHeight),
    innerWidth: safeNumber(windowRef.innerWidth),
    innerHeight: safeNumber(windowRef.innerHeight)
  };
}

function isChromeLike(userAgent) {
  return /Chrome|Chromium|CriOS|Edg/u.test(userAgent) && !/Firefox|FxiOS/u.test(userAgent);
}

function roundScore(value) {
  return Math.round(Math.min(1, value) * 1000) / 1000;
}

function detectLanguageIssues(language, languages) {
  const issues = [];
  if (language && !/^[a-zA-Z0-9_-]{2,35}$/u.test(language)) {
    issues.push('invalid_language');
  }

  if (language && languages.length > 0 && languages[0] !== language) {
    issues.push('primary_language_mismatch');
  }

  if (new Set(languages).size !== languages.length) {
    issues.push('duplicate_languages');
  }

  return issues;
}

function detectHardwareIssues(navigatorRef) {
  const issues = [];
  const concurrency = safeNumber(navigatorRef.hardwareConcurrency);
  const memory = safeNumber(navigatorRef.deviceMemory);
  if (concurrency !== null && (concurrency === 0 || concurrency > 128)) {
    issues.push('hardware_concurrency_range');
  }

  if (memory !== null && (memory < 0.25 || memory > 128)) {
    issues.push('device_memory_range');
  }

  return issues;
}

function hasPluginInconsistency(plugins, mimeTypes) {
  if (plugins.length > 0 && mimeTypes.length === 0) {
    return true;
  }

  const pdfPlugins = plugins.filter((plugin) => /PDF|Acrobat/u.test(safeString(plugin.name) || '')).length;
  return pdfPlugins > 2 || plugins.some((plugin) => Number.isFinite(plugin.length) && Number(plugin.length) > 0 && !plugin[0]);
}

function summarizePlugins(plugins, mimeTypes) {
  return { pluginCount: plugins.length, mimeTypeCount: mimeTypes.length };
}

function hasPatchedPermissionsQuery(navigatorRef) {
  const query = navigatorRef && navigatorRef.permissions && navigatorRef.permissions.query;
  if (typeof query !== 'function') {
    return false;
  }

  try {
    return !/\[native code\]/u.test(Function.prototype.toString.call(query));
  } catch (_error) {
    return false;
  }
}

function isEmptyChromeGlobal(windowRef) {
  return Boolean(windowRef.chrome && typeof windowRef.chrome === 'object' && Object.keys(windowRef.chrome).length === 0);
}