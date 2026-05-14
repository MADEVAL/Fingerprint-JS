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
      const automationGlobals = AUTOMATION_GLOBALS.filter((property) => property in windowRef).sort();
      const checks = [
        createCheck('navigator.webdriver', navigatorRef && navigatorRef.webdriver === true, 0.45, null),
        createCheck('automation.globals', automationGlobals.length > 0, 0.35, automationGlobals),
        createCheck('headless.userAgent', HEADLESS_UA_PATTERN.test(userAgent), 0.3, userAgent || null),
        createCheck('empty.languages', Boolean(navigatorRef && safeString(navigatorRef.language) && languages.length === 0), 0.1, null),
        createCheck('zero.outer.window', hasZeroOuterWindow(windowRef), 0.12, readWindowSize(windowRef)),
        createCheck('empty.chrome.plugins', isChromeLike(userAgent) && plugins.length === 0 && mimeTypes.length === 0, 0.08, null)
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