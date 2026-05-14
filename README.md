# Fingerprint Framework

Продвинутый каркас для browser fingerprinting и device intelligence с упором на модульность, контроль приватности и готовность к использованию как npm-пакета или обычного JS-файла.

Проект намеренно построен без внешних runtime-зависимостей: ESM API, script-tag сборка, типы, тесты на `node:test`, предсказуемый build pipeline.

## Быстрый старт

```bash
npm run verify
```

### ESM

```js
import { createClient } from '@fingerprint-framework/core';

const client = createClient({
  namespace: 'my-product',
  profile: 'balanced'
});

const result = await client.identify({
  consent: { granted: true, purpose: 'fraud-prevention' }
});

console.log(result.visitorId, result.confidence.score);
```

### Обычный JS-файл для страницы

После сборки подключите файл напрямую:

```html
<script src="./dist/browser/fingerprint-framework.min.js"></script>
<script>
  const client = FingerprintFramework.createClient({
    namespace: location.hostname,
    profile: 'balanced'
  });

  client.identify({ consent: { granted: true } }).then((result) => {
    console.log(result.visitorId, result.confidence);
  });
</script>
```

## Профили приватности

- `strict`: только низкочувствительные пассивные сигналы.
- `balanced`: пассивные низко- и среднечувствительные сигналы, хороший дефолт для продукта.
- `extended`: включает активные и высокочувствительные collectors вроде canvas/webgl, использовать только при понятном основании и согласии.

## Основные возможности

- Collector API для собственных сигналов.
- Policy layer: allow/deny collectors, категории, sensitivity limit, consent gate.
- Детерминированная canonical normalization перед хешированием.
- SHA-256 через Web Crypto или Node Crypto, fallback для старых окружений.
- Confidence scoring и сведения об ошибках collectors.
- Опциональное хранение состояния визитов через `localStorage` или custom storage.
- Script-tag global API: `FingerprintFramework`.

Подробное ТЗ находится в [docs/TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md).
