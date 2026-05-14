# Техническое задание: Fingerprint Framework

## 1. Цель

Создать универсальный пакет-фреймворк для browser fingerprinting и device intelligence, который выглядит и используется как зрелый SDK: модульная архитектура, расширяемые collectors, политики приватности, стабильная сборка для npm и отдельный JS-файл для подключения на страницу.

Решение должно быть не просто аналогом FingerprintJS, а более широким фундаментом: не один алгоритм снятия отпечатка, а управляемая платформа сигналов, качества, consent-политик, хранения и интеграции.

## 2. Принципы продукта

- Privacy by design: библиотека не должна поощрять скрытый сбор данных. Все активные и высокочувствительные signals управляются policy layer.
- Deterministic core: одинаковые стабильные signals должны давать одинаковый `visitorId`.
- Framework feel: понятные public API, типы, docs, examples, build scripts, тесты.
- Runtime portability: browser-first, но код должен корректно запускаться в Node для тестов и server-side сценариев.
- No hard dependencies: базовая версия должна собираться и тестироваться без установки сторонних пакетов.

## 3. Область применения

Основные легитимные сценарии:

- защита аккаунтов и транзакций от fraud;
- risk scoring для входа и оплаты;
- обнаружение подозрительных browser/runtime изменений;
- аналитика качества сессий с учетом согласий;
- собственные продуктовые collectors через plugin API.

Ограничения:

- не проектировать механизмы обхода антифингерпринтинга, приватных режимов или пользовательских настроек браузера;
- не скрывать факт сбора signals от продукта-интегратора;
- не хранить кросс-сайтовые идентификаторы по умолчанию.

## 4. Публичные артефакты

Пакет должен поставлять:

- `dist/index.mjs`: ESM build для bundlers и Node;
- `dist/index.d.ts`: TypeScript declarations;
- `dist/browser/fingerprint-framework.js`: читаемый browser global build;
- `dist/browser/fingerprint-framework.min.js`: компактный script-tag build;
- `docs/TECHNICAL_SPEC.md`: это ТЗ;
- `examples/browser.html`: пример подключения обычным `<script>`;
- `examples/node.mjs`: пример ESM использования;
- `tests/*.test.mjs`: unit tests без внешних библиотек.

## 5. Архитектура

### 5.1 Core API

Главная точка входа:

```js
const client = createClient(options);
const result = await client.identify(context);
```

`createClient` отвечает за:

- нормализацию опций;
- выбор collectors;
- применение policy layer;
- сбор signals с timeout;
- canonical normalization;
- построение hash input;
- вычисление `visitorId`;
- confidence scoring;
- опциональное обновление storage state.

### 5.2 Collector API

Collector это независимый источник signals:

```js
createCollector({
  id: 'screen.metrics',
  version: '1',
  category: 'display',
  sensitivity: 'medium',
  mode: 'passive',
  stability: 'stable',
  weight: 1.2,
  collect(context) {
    return { width: screen.width, height: screen.height };
  }
});
```

Требования к collector:

- `id` должен быть стабильным и уникальным;
- `collect` может быть sync или async;
- ошибки collector не должны ломать весь `identify`;
- результат collector проходит canonical normalization;
- high-sensitivity collectors отключаются policy, если профиль не разрешает их.

### 5.3 Policy Layer

Policy решает, какие collectors запускать:

- `profile`: `strict`, `balanced`, `extended`;
- `requireConsent`: вернуть blocked-result без сбора signals, если согласие не передано;
- `maxSensitivity`: верхняя граница sensitivity;
- `includeActive`: разрешение активных probes;
- `allowCollectors` / `denyCollectors`;
- `allowCategories` / `denyCategories`;
- `redactValues`: скрывать значения signals в result, оставляя метаданные.

### 5.4 Normalization and Hashing

Перед хешированием все values приводятся к canonical JSON:

- ключи объектов сортируются;
- `undefined`, functions и symbols исключаются;
- нечисловые `NaN` / `Infinity` приводятся к `null`;
- `Date` приводится к ISO string;
- `BigInt` приводится к decimal string.

Hash input включает:

- schema version;
- namespace;
- salt;
- версии collectors;
- canonical values.

Алгоритм:

- основной: SHA-256 через Web Crypto или Node Crypto;
- fallback: deterministic non-cryptographic hash для старых окружений, с явной пометкой алгоритма.

### 5.5 Confidence Scoring

`confidence` должен показывать качество результата, а не обещать абсолютную уникальность:

- `score`: 0..1;
- `level`: `low`, `medium`, `high`;
- `collectedWeight`: суммарный вес успешно собранных signals;
- `possibleWeight`: суммарный вес разрешенных collectors;
- `entropy`: приблизительная оценка полезности набора signals.

### 5.6 Storage

Хранилище выключено по умолчанию. Доступные варианты:

- `storage: false`: только stateless fingerprint;
- `storage: 'local'`: `localStorage` в браузере;
- custom storage с методами `get(key)` и `set(key, value)`.

Storage хранит только служебное состояние визитов в namespace проекта: `firstSeenAt`, `lastSeenAt`, `seenCount`, `visitorId`.

## 6. Built-in Collectors

Минимальный набор:

- `runtime.browser`: user agent, platform, vendor, UA Client Hints basic data;
- `runtime.node`: Node version/platform/arch для server/test runtime;
- `locale`: language, languages, Intl locale;
- `timezone`: timezone, timezone offset;
- `screen.metrics`: screen size, color depth, DPR;
- `hardware`: concurrency, device memory, touch points;
- `storage.capabilities`: cookies, localStorage/sessionStorage availability, Do Not Track;
- `webgl.renderer`: WebGL vendor/renderer data, high sensitivity, active;
- `canvas.checksum`: deterministic canvas checksum, high sensitivity, active.

## 7. Public Result Shape

`identify()` возвращает:

```js
{
  visitorId: 'hex-or-null',
  requestId: 'uuid-like-id',
  namespace: 'product-namespace',
  createdAt: 'ISO date',
  confidence: { score, level, entropy, collectedWeight, possibleWeight },
  components: [
    { id, version, category, sensitivity, status, value, durationMs }
  ],
  meta: {
    version,
    schemaVersion,
    profile,
    durationMs,
    hashAlgorithm,
    blocked,
    reason,
    storage
  }
}
```

## 8. Quality Bar

Готовая реализация должна проходить:

- `npm run build`;
- `npm test`;
- `npm run verify`.

Тесты должны покрывать:

- canonical normalization;
- deterministic hashing;
- policy filtering;
- consent gate;
- deterministic visitor ID на custom collectors;
- redaction mode;
- storage state update.

## 9. Roadmap после MVP

- Subpath modules: `@fingerprint-framework/core/collectors`, `.../storage`, `.../policy`.
- Отдельный risk engine поверх signals.
- Async plugin registry.
- Пакет preset collectors для fraud/risk scoring.
- Browser automation test matrix через Playwright.
- Размерные бюджеты bundle size.
- Public compatibility contract и semver policy.
