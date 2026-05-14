import { createCollector } from './core.js';

export function createLocaleCollector() {
  return createCollector({
    id: 'locale',
    version: '1',
    category: 'locale',
    sensitivity: 'low',
    mode: 'passive',
    stability: 'stable',
    weight: 0.8,
    collect(context) {
      const navigatorRef = context.navigator;
      const intlOptions = getDateTimeOptions(context);

      return {
        language: navigatorRef ? navigatorRef.language || null : null,
        languages: navigatorRef && Array.isArray(navigatorRef.languages) ? navigatorRef.languages.slice(0, 10) : [],
        locale: intlOptions.locale || null
      };
    }
  });
}

export function createTimezoneCollector() {
  return createCollector({
    id: 'timezone',
    version: '1',
    category: 'locale',
    sensitivity: 'medium',
    mode: 'passive',
    stability: 'stable',
    weight: 0.9,
    collect(context) {
      const intlOptions = getDateTimeOptions(context);

      return {
        timeZone: intlOptions.timeZone || null,
        offsetMinutes: new Date().getTimezoneOffset()
      };
    }
  });
}

export function createDateTimeLocaleCollector() {
  return createCollector({
    id: 'locale.datetime',
    version: '1',
    category: 'locale',
    sensitivity: 'low',
    mode: 'passive',
    stability: 'stable',
    weight: 0.45,
    collect(context) {
      const options = getDateTimeOptions(context);

      return {
        calendar: options.calendar || null,
        numberingSystem: options.numberingSystem || null,
        hourCycle: options.hourCycle || null
      };
    }
  });
}

function getDateTimeOptions(context) {
  const globalIntl = context && context.global && context.global.Intl ? context.global.Intl : null;
  const intlRef = globalIntl || (typeof Intl !== 'undefined' ? Intl : null);
  return intlRef && intlRef.DateTimeFormat ? intlRef.DateTimeFormat().resolvedOptions() : {};
}