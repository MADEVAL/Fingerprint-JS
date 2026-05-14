# Report Format Interpretation Guide

This guide explains how to interpret every field in the three demo outputs: ID analysis, compact report, and full report.

Each interpretation is intentionally one sentence.

## Output Order

| Output | Interpretation |
| --- | --- |
| ID analysis | Use this first when a backend or analyst needs the shortest readable scoring payload. |
| Compact report | Use this when a human needs identity, risk, quality, calculations, stability, and every capability without raw values. |
| Full report | Use this when debugging needs the raw SDK result, raw component values, derived reports, and every calculation. |

## ID Analysis Report

| Field | Interpretation |
| --- | --- |
| `id` | The stable visitor identifier derived from identity-safe components. |
| `requestId` | The unique identifier for this collection run. |
| `namespace` | The logical product, site, or tenant boundary used when hashing. |
| `profile` | The collection profile that controlled which collector classes were allowed. |
| `confidence` | The compact identity and collection-quality confidence summary. |
| `confidence.score` | The identity confidence score after weighting collected identity inputs and platform stability. |
| `confidence.level` | The human-readable confidence band for `confidence.score`. |
| `confidence.qualityScore` | The collection-quality score across allowed identity and report-only collectors. |
| `confidence.qualityLevel` | The human-readable quality band for `confidence.qualityScore`. |
| `totals` | The compact count summary for all collected components. |
| `totals.total` | The total number of component results returned by the SDK. |
| `totals.ok` | The number of components that collected a usable value. |
| `totals.identity` | The number of components assigned to the visitor ID role. |
| `totals.reportOnly` | The number of components assigned to reporting, risk, or diagnostics only. |
| `totals.failed` | The number of components that ended in `error` or `timeout`. |
| `weights` | The aggregate scoring weight summary for collected components. |
| `weights.total` | The sum of declared weights for all component results. |
| `weights.ok` | The sum of declared weights for components with `status: "ok"`. |
| `weights.identity` | The sum of weights for successful components that contributed to the visitor ID role. |
| `weights.reportOnly` | The sum of weights for successful components that stayed out of the visitor ID role. |
| `weights.collected` | The identity confidence collected weight reported by the SDK. |
| `weights.possible` | The identity confidence possible weight reported by the SDK. |
| `weights.qualityCollected` | The collection-quality collected weight across allowed collectors. |
| `weights.qualityPossible` | The collection-quality possible weight across allowed collectors. |
| `weights.byComponent` | A map from component ID to the component's declared weight. |
| `weights.byComponent.<componentId>` | The declared scoring weight for one component ID. |
| `hash` | The compact hash verification summary. |
| `hash.algorithm` | The hash algorithm used for the returned visitor ID. |
| `hash.recalculatedMatches` | `true` means the demo recalculated the same visitor ID from the returned components. |
| `hash.allSignalsDiffers` | `true` means an all-signals diagnostic hash differs from the identity-safe visitor ID. |
| `risk` | The compact risk verdict summary. |
| `risk.bot` | The compact bot or automation verdict. |
| `risk.privateMode` | The compact private-mode likelihood verdict. |
| `risk.tamper` | The compact browser tamper evidence verdict. |
| `risk.<name>.verdict` | The risk label assigned by that risk collector. |
| `risk.<name>.score` | The numeric evidence score for that risk collector. |
| `risk.<name>.confidence` | The confidence band attached to that risk verdict. |
| `risk.<name>.evidence` | The number of evidence entries behind that risk verdict. |
| `identityComponents` | The component IDs used by the identity role for this result. |
| `reportOnlyComponents` | The successful component IDs collected for reporting without changing the visitor ID. |
| `results` | A compact map from component ID to short result summary. |
| `results.<componentId>` | The short summary of one component's result, such as a primitive value, `object:<count>`, `array:<count>`, or an error status. |

## Compact Report

| Field | Interpretation |
| --- | --- |
| `product` | The product name that generated the report. |
| `botBlockerSecurity` | The BotBlocker Security URL associated with this SDK. |
| `identity` | The compact identity and role membership section. |
| `identity.visitorId` | The stable visitor identifier derived from identity-safe components. |
| `identity.baselineVisitorId` | The first visitor ID observed in the current demo session. |
| `identity.matchesBaseline` | `true` means the current visitor ID still matches the demo baseline. |
| `identity.requestId` | The unique identifier for this collection run. |
| `identity.namespace` | The logical hashing namespace used by the client. |
| `identity.profile` | The active collection profile used for this run. |
| `identity.createdAt` | The ISO timestamp when this SDK result was created. |
| `identity.identityComponents` | The component IDs used for the current visitor ID role. |
| `identity.reportOnlyComponents` | The successful component IDs collected only for reports, risk, or diagnostics. |
| `stability` | The baseline and drift summary for repeated demo runs. |
| `stability.baselineVisitorId` | The first visitor ID stored by the demo stability monitor. |
| `stability.currentVisitorId` | The visitor ID from the latest run. |
| `stability.matchesBaseline` | `true` means the latest visitor ID matches the baseline visitor ID. |
| `stability.runCount` | The number of remembered demo runs in the current profile session. |
| `stability.drift` | The changed, added, or removed component summary since the previous run. |
| `stability.drift.identityChanged` | The identity-role component IDs whose signature changed since the previous run. |
| `stability.drift.reportOnlyChanged` | The report-only component IDs whose signature changed since the previous run. |
| `stability.drift.added` | The component IDs that appeared in the latest run but not the previous run. |
| `stability.drift.removed` | The component IDs that disappeared from the latest run compared with the previous run. |
| `stability.history` | The recent run history retained by the demo stability monitor. |
| `stability.history[].index` | The one-based index of a remembered run. |
| `stability.history[].visitorId` | The visitor ID recorded for that remembered run. |
| `stability.history[].matchesBaseline` | `true` means that remembered run matched the baseline visitor ID. |
| `stability.history[].createdAt` | The creation timestamp of that remembered run. |
| `stability.history[].identityChanged` | The identity-role component IDs that changed in that remembered run. |
| `stability.history[].reportOnlyChanged` | The report-only component IDs that changed in that remembered run. |
| `stability.hash` | The demo hash comparison summary attached to stability output. |
| `stability.hash.recalculatedMatches` | `true` means the recalculated identity-safe hash matched `visitorId`. |
| `stability.hash.allSignalsDiffers` | `true` means the all-signals diagnostic hash differs from the identity-safe hash. |
| `risk` | The compact risk collector section. |
| `risk.bot` | The bot or automation evidence summary. |
| `risk.privateMode` | The private-mode likelihood summary. |
| `risk.tamper` | The browser tamper evidence summary. |
| `risk.<name>.verdict` | The verdict label returned by that risk collector. |
| `risk.<name>.score` | The numeric evidence score returned by that risk collector. |
| `risk.<name>.confidence` | The confidence band returned by that risk collector. |
| `risk.<name>.evidence` | The evidence entries returned by that risk collector. |
| `quality` | The full SDK confidence object for identity confidence and collection quality. |
| `quality.score` | The identity confidence score. |
| `quality.level` | The human-readable identity confidence band. |
| `quality.entropy` | The weighted usefulness estimate of successful identity inputs. |
| `quality.collectedWeight` | The identity weight collected successfully. |
| `quality.possibleWeight` | The maximum identity weight available under the current policy. |
| `quality.platformScore` | The platform stability multiplier used by confidence scoring. |
| `quality.collectionQuality` | The quality score for all allowed collectors, including report-only collectors. |
| `quality.collectionQuality.score` | The collection-quality numeric score. |
| `quality.collectionQuality.level` | The human-readable collection-quality band. |
| `quality.collectionQuality.collectedWeight` | The successful weight across allowed collectors. |
| `quality.collectionQuality.possibleWeight` | The possible weight across allowed collectors. |
| `hash` | The compact identity and all-signals hash comparison section. |
| `hash.algorithm` | The hash algorithm reported by the SDK result. |
| `hash.recalculatedVisitorId` | The visitor ID recalculated from returned components using the identity-safe hash path. |
| `hash.recalculatedAlgorithm` | The hash algorithm used by the recalculation path. |
| `hash.matchesResult` | `true` means the recalculated visitor ID equals `identity.visitorId`. |
| `hash.allSignalsVisitorId` | The diagnostic visitor ID produced when report-only components are also included. |
| `hash.allSignalsDiffers` | `true` means report-only or volatile signals would change an all-signals diagnostic hash. |
| `calculations` | The demo-derived counts, distributions, weights, timing, storage, and schema section. |
| `calculations.componentTotals` | The component status total summary. |
| `calculations.componentTotals.total` | The total number of component results. |
| `calculations.componentTotals.ok` | The number of successful component results. |
| `calculations.componentTotals.empty` | The number of supported collectors that produced no value. |
| `calculations.componentTotals.skipped` | The number of collectors skipped by policy or consent. |
| `calculations.componentTotals.error` | The number of collectors that failed with an error. |
| `calculations.componentTotals.timeout` | The number of collectors that exceeded the configured timeout. |
| `calculations.distributions` | The grouped component counts by status, category, sensitivity, mode, and stability. |
| `calculations.distributions.status.<status>` | The number of components with one status label. |
| `calculations.distributions.category.<category>` | The number of components in one category. |
| `calculations.distributions.sensitivity.<level>` | The number of components with one sensitivity level. |
| `calculations.distributions.mode.<mode>` | The number of components with one collection mode. |
| `calculations.distributions.stability.<label>` | The number of components with one stability label. |
| `calculations.weights` | The demo-derived component weight summary. |
| `calculations.weights.totalWeight` | The sum of declared weights for all component results. |
| `calculations.weights.okWeight` | The sum of declared weights for successful component results. |
| `calculations.weights.identityWeight` | The sum of weights for successful identity-role components. |
| `calculations.weights.reportOnlyWeight` | The sum of weights for successful report-only components. |
| `calculations.weights.collectedWeight` | The SDK identity collected weight. |
| `calculations.weights.possibleWeight` | The SDK identity possible weight. |
| `calculations.weights.okWeightRatio` | The ratio of successful component weight to total component weight. |
| `calculations.identity` | The demo copy of identity and report-only component membership. |
| `calculations.identity.identityComponents` | The component IDs used for identity. |
| `calculations.identity.reportOnlyComponents` | The successful component IDs used for reporting only. |
| `calculations.modes` | The active and passive collector execution summaries. |
| `calculations.modes.active` | The status summary for active collectors. |
| `calculations.modes.passive` | The status summary for passive collectors. |
| `calculations.modes.<mode>.total` | The number of components in that execution mode. |
| `calculations.modes.<mode>.ok` | The number of successful components in that execution mode. |
| `calculations.modes.<mode>.skipped` | The number of skipped components in that execution mode. |
| `calculations.modes.<mode>.error` | The number of errored components in that execution mode. |
| `calculations.modes.<mode>.timeout` | The number of timed-out components in that execution mode. |
| `calculations.timing` | The demo timing summary. |
| `calculations.timing.resultDurationMs` | The SDK-reported duration of the full identification run. |
| `calculations.timing.componentDurationMs` | The sum of individual component durations. |
| `calculations.timing.slowestComponents` | The five slowest component results in this run. |
| `calculations.timing.slowestComponents[].id` | The component ID of one slow component. |
| `calculations.timing.slowestComponents[].status` | The status of one slow component. |
| `calculations.timing.slowestComponents[].durationMs` | The measured duration of one slow component. |
| `calculations.hash` | The demo hash recalculation summary. |
| `calculations.hash.resultVisitorId` | The visitor ID returned by the SDK result. |
| `calculations.hash.recalculatedVisitorId` | The visitor ID recalculated by the demo. |
| `calculations.hash.matches` | `true` means the recalculated ID matches the SDK result ID. |
| `calculations.hash.resultAlgorithm` | The hash algorithm reported by the SDK result. |
| `calculations.hash.recalculatedAlgorithm` | The hash algorithm used by demo recalculation. |
| `calculations.storage` | The SDK storage state for this run. |
| `calculations.storage.enabled` | `true` means a storage adapter was available for this run. |
| `calculations.storage.type` | The storage adapter type used to remember visitor state. |
| `calculations.storage.status` | The storage outcome, such as `disabled`, `skipped`, `created`, `updated`, or `error`. |
| `calculations.storage.firstSeenAt` | The first stored timestamp for this visitor ID when storage is enabled and successful. |
| `calculations.storage.seenCount` | The number of times storage has seen this visitor ID when storage is enabled and successful. |
| `calculations.storage.error` | The normalized storage error object when storage read or write failed. |
| `calculations.storage.error.name` | The normalized storage error class name. |
| `calculations.storage.error.message` | The normalized storage error message. |
| `calculations.schema` | The SDK and identity schema version summary. |
| `calculations.schema.sdkVersion` | The SDK version that produced the result. |
| `calculations.schema.schemaVersion` | The identity schema version used for compatibility decisions. |
| `capabilities` | The compact per-component capability list. |
| `capabilities[].id` | The stable component identifier. |
| `capabilities[].category` | The functional group of that component. |
| `capabilities[].status` | The collection outcome for that component. |
| `capabilities[].sensitivity` | The privacy sensitivity level declared by that component. |
| `capabilities[].mode` | Whether that component runs passively or actively. |
| `capabilities[].stability` | The expected stability class of that component. |
| `capabilities[].role` | Whether that component is an identity input or report-only signal. |
| `capabilities[].usedForVisitorId` | `true` means the component contributed to `identity.visitorId`. |
| `capabilities[].hashable` | `true` means the component is eligible for identity hashing when policy allows it. |
| `capabilities[].weight` | The declared scoring weight for that component. |
| `capabilities[].durationMs` | The measured collection time for that component. |
| `capabilities[].valueSummary` | A type-and-size summary of the component value without raw value detail. |
| `capabilities[].valueSummary.type` | The JavaScript value type summarized for that component. |
| `capabilities[].valueSummary.length` | The number of items in an array value summary. |
| `capabilities[].valueSummary.keys` | The object keys present in an object value summary. |
| `capabilities[].valueSummary.keyCount` | The number of keys in an object value summary. |
| `capabilities[].valueSummary.value` | The primitive value when a primitive is safe to summarize directly. |
| `capabilities[].error` | The normalized error object when the component failed. |
| `capabilities[].error.code` | The stable SDK error code for a failed component when available. |
| `capabilities[].error.message` | The human-readable component error message when available. |

## Full Report

| Field | Interpretation |
| --- | --- |
| `product` | The product name that generated the report. |
| `generatedAt` | The ISO timestamp when the full demo report was generated. |
| `botBlockerSecurity` | The BotBlocker Security URL associated with this SDK. |
| `compactMeaning` | A built-in glossary for the most important compact report concepts. |
| `compactMeaning.visitorId` | The explanation of how to read visitor IDs. |
| `compactMeaning.confidence` | The explanation of how to read identity confidence. |
| `compactMeaning.entropy` | The explanation of how to read entropy estimates. |
| `compactMeaning.botDetection` | The explanation of how to read bot detection evidence. |
| `compactMeaning.privacyMode` | The explanation of how to read private-mode evidence. |
| `compactMeaning.tamperEvidence` | The explanation of how to read tamper evidence. |
| `compactMeaning.reportOnlyComponents` | The explanation of why report-only components do not move `visitorId`. |
| `recalculatedHash` | The identity-safe hash recalculation result. |
| `recalculatedHash.visitorId` | The visitor ID obtained by recalculating from returned components. |
| `recalculatedHash.hashAlgorithm` | The algorithm used by the recalculated identity-safe hash. |
| `recalculatedHash.namespace` | The namespace used by the recalculated identity-safe hash. |
| `allSignalsHash` | The diagnostic hash result when report-only components are included. |
| `allSignalsHash.visitorId` | The diagnostic visitor ID produced from all successful components. |
| `allSignalsHash.hashAlgorithm` | The algorithm used by the all-signals diagnostic hash. |
| `allSignalsHash.namespace` | The namespace used by the all-signals diagnostic hash. |
| `stability` | The same stability object described in the compact report. |
| `calculations` | The same calculations object described in the compact report. |
| `explainableReport` | The readable identity, risk, summary, and component-role report from `createExplainableReport()`. |
| `explainableReport.product` | The product name that generated the explainable report. |
| `explainableReport.generatedAt` | The ISO timestamp assigned to the explainable report. |
| `explainableReport.identity` | The identity summary used by the explainable report. |
| `explainableReport.identity.visitorId` | The visitor ID explained by the report. |
| `explainableReport.identity.namespace` | The namespace explained by the report. |
| `explainableReport.identity.confidence` | The full SDK confidence object explained by the report. |
| `explainableReport.identity.confidence.score` | The identity confidence score explained by the report. |
| `explainableReport.identity.confidence.level` | The human-readable identity confidence band explained by the report. |
| `explainableReport.identity.confidence.entropy` | The weighted usefulness estimate of successful identity inputs explained by the report. |
| `explainableReport.identity.confidence.collectedWeight` | The identity weight collected successfully and explained by the report. |
| `explainableReport.identity.confidence.possibleWeight` | The maximum identity weight available under the current policy and explained by the report. |
| `explainableReport.identity.confidence.platformScore` | The platform stability multiplier explained by the report. |
| `explainableReport.identity.confidence.collectionQuality` | The collection-quality object explained by the report. |
| `explainableReport.identity.confidence.collectionQuality.score` | The collection-quality numeric score explained by the report. |
| `explainableReport.identity.confidence.collectionQuality.level` | The human-readable collection-quality band explained by the report. |
| `explainableReport.identity.confidence.collectionQuality.collectedWeight` | The successful weight across allowed collectors explained by the report. |
| `explainableReport.identity.confidence.collectionQuality.possibleWeight` | The possible weight across allowed collectors explained by the report. |
| `explainableReport.identity.identityComponents` | The component IDs explained as identity inputs. |
| `explainableReport.identity.reportOnlyComponents` | The component IDs explained as report-only inputs. |
| `explainableReport.risk` | The risk summary for bot, private-mode, and tamper collectors. |
| `explainableReport.risk.bot` | The bot or automation risk summary in the explainable report. |
| `explainableReport.risk.privateMode` | The private-mode likelihood summary in the explainable report. |
| `explainableReport.risk.tamper` | The browser tamper evidence summary in the explainable report. |
| `explainableReport.risk.<name>.verdict` | The risk label assigned by that explainable risk summary. |
| `explainableReport.risk.<name>.score` | The numeric evidence score assigned by that explainable risk summary. |
| `explainableReport.risk.<name>.confidence` | The confidence band assigned by that explainable risk summary. |
| `explainableReport.risk.<name>.evidence` | The detailed evidence array behind that explainable risk summary. |
| `explainableReport.risk.bot.evidence[]` | One matched bot-detection check name. |
| `explainableReport.risk.privateMode.evidence[]` | One matched private-mode indicator name. |
| `explainableReport.risk.tamper.evidence[]` | One browser-integrity evidence object. |
| `explainableReport.risk.tamper.evidence[].code` | The stable tamper evidence code. |
| `explainableReport.risk.tamper.evidence[].severity` | The severity label used to score that tamper evidence. |
| `explainableReport.risk.tamper.evidence[].message` | The human-readable explanation for that tamper evidence. |
| `explainableReport.risk.tamper.evidence[].detail` | Optional collector-specific detail for that tamper evidence. |
| `explainableReport.summary` | The count and verdict summary for the explainable report. |
| `explainableReport.summary.total` | The number of component results in the explained result. |
| `explainableReport.summary.ok` | The number of successful component results in the explained result. |
| `explainableReport.summary.reportOnly` | The number of explained components assigned to report-only role. |
| `explainableReport.summary.identity` | The number of explained components assigned to identity role. |
| `explainableReport.summary.tamperVerdict` | The tamper verdict copied into the summary. |
| `explainableReport.summary.botVerdict` | The bot verdict copied into the summary. |
| `explainableReport.summary.privateModeVerdict` | The private-mode verdict copied into the summary. |
| `explainableReport.components` | The per-component explanation list. |
| `explainableReport.components[].id` | The component ID being explained. |
| `explainableReport.components[].role` | The explained role of that component. |
| `explainableReport.components[].reason` | The one-label reason why that component was or was not used for identity. |
| `explainableReport.components[].status` | The collection status of that component. |
| `explainableReport.components[].category` | The category of that component. |
| `explainableReport.components[].sensitivity` | The sensitivity level of that component. |
| `explainableReport.components[].stability` | The stability class of that component. |
| `explainableReport.components[].hashable` | Whether that component is eligible for identity hashing. |
| `explainableReport.components[].durationMs` | The measured collection time of that component. |
| `explainableReport.components[].value` | The full or summarized component value depending on report options. |
| `explainableReport.components[].error` | The normalized error object for that component when collection failed. |
| `explainableReport.components[].error.code` | The stable SDK error code for that explained component when available. |
| `explainableReport.components[].error.message` | The human-readable error message for that explained component when available. |
| `analysisReport` | The same ID analysis report described earlier in this guide. |
| `analysisReport.id` | The same ID analysis `id` field described earlier in this guide. |
| `analysisReport.requestId` | The same ID analysis `requestId` field described earlier in this guide. |
| `analysisReport.namespace` | The same ID analysis `namespace` field described earlier in this guide. |
| `analysisReport.profile` | The same ID analysis `profile` field described earlier in this guide. |
| `analysisReport.confidence` | The same ID analysis `confidence` section described earlier in this guide. |
| `analysisReport.totals` | The same ID analysis `totals` section described earlier in this guide. |
| `analysisReport.weights` | The same ID analysis `weights` section described earlier in this guide. |
| `analysisReport.hash` | The same ID analysis `hash` section described earlier in this guide. |
| `analysisReport.risk` | The same ID analysis `risk` section described earlier in this guide. |
| `analysisReport.identityComponents` | The same ID analysis `identityComponents` list described earlier in this guide. |
| `analysisReport.reportOnlyComponents` | The same ID analysis `reportOnlyComponents` list described earlier in this guide. |
| `analysisReport.results` | The same ID analysis `results` map described earlier in this guide. |
| `result` | The raw `IdentifyResult` returned by the SDK. |
| `result.visitorId` | The stable visitor ID returned by the SDK. |
| `result.requestId` | The unique request ID returned by the SDK. |
| `result.namespace` | The namespace returned by the SDK. |
| `result.createdAt` | The ISO timestamp when the SDK result was created. |
| `result.confidence` | The raw SDK confidence object described in compact `quality`. |
| `result.confidence.score` | The raw identity confidence score returned by the SDK. |
| `result.confidence.level` | The raw human-readable identity confidence band returned by the SDK. |
| `result.confidence.entropy` | The raw weighted usefulness estimate returned by the SDK. |
| `result.confidence.collectedWeight` | The raw identity weight collected successfully by the SDK. |
| `result.confidence.possibleWeight` | The raw maximum identity weight available under the current policy. |
| `result.confidence.platformScore` | The raw platform stability multiplier used by the SDK. |
| `result.confidence.collectionQuality` | The raw collection-quality object returned by the SDK. |
| `result.confidence.collectionQuality.score` | The raw collection-quality numeric score returned by the SDK. |
| `result.confidence.collectionQuality.level` | The raw human-readable collection-quality band returned by the SDK. |
| `result.confidence.collectionQuality.collectedWeight` | The raw successful weight across allowed collectors returned by the SDK. |
| `result.confidence.collectionQuality.possibleWeight` | The raw possible weight across allowed collectors returned by the SDK. |
| `result.components` | The raw SDK component result list. |
| `result.components[].id` | The raw stable component identifier. |
| `result.components[].version` | The raw component schema version. |
| `result.components[].category` | The raw component category. |
| `result.components[].sensitivity` | The raw component sensitivity level. |
| `result.components[].mode` | The raw component execution mode. |
| `result.components[].stability` | The raw component stability class. |
| `result.components[].weight` | The raw declared scoring weight for this component. |
| `result.components[].hashable` | `true` means the raw component is eligible for identity hashing when policy allows it. |
| `result.components[].status` | The raw collection outcome for this component. |
| `result.components[].value` | The raw collector-specific value for this component when collection succeeded. |
| `result.components[].durationMs` | The raw measured collection time for this component. |
| `result.components[].error` | The raw normalized error object for this component when collection failed. |
| `result.components[].error.code` | The stable SDK error code for this raw component when available. |
| `result.components[].error.message` | The human-readable error message for this raw component when available. |
| `result.meta` | The raw SDK metadata object for versioning, hashing, policy, and storage state. |
| `result.meta.version` | The SDK version that produced the result. |
| `result.meta.schemaVersion` | The identity schema version used by the result. |
| `result.meta.profile` | The profile used by the result. |
| `result.meta.durationMs` | The SDK-measured duration of the full identification run. |
| `result.meta.hashAlgorithm` | The hash algorithm used by the SDK result. |
| `result.meta.identityComponents` | The raw component IDs used for identity. |
| `result.meta.reportOnlyComponents` | The raw successful component IDs kept out of identity. |
| `result.meta.blocked` | `true` means policy or consent blocked collection. |
| `result.meta.reason` | The policy or consent reason for a blocked result. |
| `result.meta.storage` | The raw storage adapter state reported by the SDK. |
| `result.meta.storage.enabled` | `true` means the raw result had a storage adapter available. |
| `result.meta.storage.type` | The raw storage adapter type used for visitor state. |
| `result.meta.storage.status` | The raw storage outcome, such as `disabled`, `skipped`, `created`, `updated`, or `error`. |
| `result.meta.storage.firstSeenAt` | The raw first stored timestamp for this visitor ID when storage is enabled and successful. |
| `result.meta.storage.seenCount` | The raw number of times storage has seen this visitor ID when storage is enabled and successful. |
| `result.meta.storage.error` | The raw normalized storage error object when storage read or write failed. |
| `result.meta.storage.error.name` | The raw normalized storage error class name. |
| `result.meta.storage.error.message` | The raw normalized storage error message. |
| `components` | The full report's normalized per-component list with raw values. |
| `components[].id` | The stable component identifier. |
| `components[].version` | The component schema version. |
| `components[].category` | The component category. |
| `components[].sensitivity` | The component sensitivity level. |
| `components[].mode` | The component execution mode. |
| `components[].stability` | The component stability class. |
| `components[].hashable` | Whether the component is eligible for identity hashing. |
| `components[].usedForVisitorId` | `true` means this component contributed to the raw visitor ID. |
| `components[].weight` | The declared scoring weight for this component. |
| `components[].status` | The collection outcome for this component. |
| `components[].durationMs` | The measured collection time for this component. |
| `components[].value` | The raw collected value for this component when collection succeeded. |
| `components[].error` | The normalized error object for this component when collection failed. |
| `components[].error.code` | The stable SDK error code for this normalized component when available. |
| `components[].error.message` | The human-readable error message for this normalized component when available. |

## Built-In Component Value Fields

These value paths apply to `components[].value`, `result.components[].value`, and `explainableReport.components[].value` when values are included.

| Field | Interpretation |
| --- | --- |
| `components[where id="runtime.browser"].value.userAgent` | The browser user agent string reported by `navigator.userAgent`. |
| `components[where id="runtime.browser"].value.appVersion` | The browser app version string reported by `navigator.appVersion`. |
| `components[where id="runtime.browser"].value.platform` | The platform string reported by `navigator.platform`. |
| `components[where id="runtime.browser"].value.vendor` | The browser vendor string reported by `navigator.vendor`. |
| `components[where id="runtime.browser"].value.productSub` | The browser product sub-version string reported by `navigator.productSub`. |
| `components[where id="runtime.browser"].value.webdriver` | `true` means the browser reports WebDriver automation. |
| `components[where id="runtime.browser"].value.userAgentData` | The normalized low-entropy Client Hints object when available. |
| `components[where id="runtime.browser"].value.userAgentData.brands[]` | One normalized Client Hints brand entry. |
| `components[where id="runtime.browser"].value.userAgentData.brands[].brand` | The browser brand label in one Client Hints brand entry. |
| `components[where id="runtime.browser"].value.userAgentData.brands[].version` | The browser major version label in one Client Hints brand entry. |
| `components[where id="runtime.browser"].value.userAgentData.mobile` | `true` means Client Hints reports a mobile browser. |
| `components[where id="runtime.browser"].value.userAgentData.platform` | The platform label reported by low-entropy Client Hints. |
| `components[where id="runtime.clientHints"].value.basic` | The normalized low-entropy Client Hints values. |
| `components[where id="runtime.clientHints"].value.basic.brands[]` | One normalized low-entropy Client Hints brand entry. |
| `components[where id="runtime.clientHints"].value.basic.mobile` | `true` means low-entropy Client Hints reports a mobile browser. |
| `components[where id="runtime.clientHints"].value.basic.platform` | The platform label reported by low-entropy Client Hints. |
| `components[where id="runtime.clientHints"].value.highEntropy` | The normalized high-entropy Client Hints values when permission and runtime allow them. |
| `components[where id="runtime.clientHints"].value.highEntropy.architecture` | The CPU architecture hint reported by high-entropy Client Hints. |
| `components[where id="runtime.clientHints"].value.highEntropy.bitness` | The CPU bitness hint reported by high-entropy Client Hints. |
| `components[where id="runtime.clientHints"].value.highEntropy.model` | The device model hint reported by high-entropy Client Hints. |
| `components[where id="runtime.clientHints"].value.highEntropy.platformVersion` | The platform version hint reported by high-entropy Client Hints. |
| `components[where id="runtime.clientHints"].value.highEntropy.uaFullVersion` | The full browser version hint reported by high-entropy Client Hints. |
| `components[where id="runtime.clientHints"].value.highEntropy.fullVersionList[]` | One normalized full-version Client Hints brand entry. |
| `components[where id="runtime.clientHints"].value.highEntropy.wow64` | `true` means high-entropy Client Hints reports a 32-bit process on 64-bit Windows. |
| `components[where id="runtime.clientHints"].value.error` | The reason high-entropy Client Hints could not be collected. |
| `components[where id="runtime.navigatorProperties"].value.<property>` | One low-level navigator string such as `vendor`, `vendorSub`, `product`, `productSub`, `oscpu`, `cpuClass`, or `buildId`. |
| `components[where id="runtime.node"].value.node` | The Node.js version when the SDK runs in a Node-like runtime. |
| `components[where id="runtime.node"].value.platform` | The Node.js platform string when the SDK runs in a Node-like runtime. |
| `components[where id="runtime.node"].value.arch` | The Node.js CPU architecture string when the SDK runs in a Node-like runtime. |
| `components[where id="locale"].value.language` | The primary browser language reported by `navigator.language`. |
| `components[where id="locale"].value.languages[]` | One language entry reported by `navigator.languages`. |
| `components[where id="locale"].value.locale` | The locale resolved by `Intl.DateTimeFormat`. |
| `components[where id="timezone"].value.timeZone` | The time zone resolved by `Intl.DateTimeFormat`. |
| `components[where id="timezone"].value.offsetMinutes` | The current local time zone offset in minutes. |
| `components[where id="locale.datetime"].value.calendar` | The resolved calendar preference. |
| `components[where id="locale.datetime"].value.numberingSystem` | The resolved numbering-system preference. |
| `components[where id="locale.datetime"].value.hourCycle` | The resolved hour-cycle preference. |
| `components[where id="screen.metrics"].value.status` | A screen metrics status such as `suppressed` when the signal is intentionally reduced. |
| `components[where id="screen.metrics"].value.reason` | The reason screen metrics were suppressed. |
| `components[where id="screen.metrics"].value.width` | The rounded physical screen width. |
| `components[where id="screen.metrics"].value.height` | The rounded physical screen height. |
| `components[where id="screen.metrics"].value.availWidth` | The rounded available screen width. |
| `components[where id="screen.metrics"].value.availHeight` | The rounded available screen height. |
| `components[where id="screen.metrics"].value.colorDepth` | The reported screen color depth. |
| `components[where id="screen.metrics"].value.pixelDepth` | The reported screen pixel depth. |
| `components[where id="screen.metrics"].value.devicePixelRatio` | The rounded device pixel ratio. |
| `components[where id="screen.frame"].value.<dimension>` | One rounded window-frame dimension such as `outerWidth`, `outerHeight`, `innerWidth`, `innerHeight`, `left`, or `top`. |
| `components[where id="screen.frame"].value.frameWidth` | The estimated horizontal browser chrome size. |
| `components[where id="screen.frame"].value.frameHeight` | The estimated vertical browser chrome size. |
| `components[where id="screen.frame"].value.availDeltaWidth` | The difference between physical and available screen width. |
| `components[where id="screen.frame"].value.availDeltaHeight` | The difference between physical and available screen height. |
| `components[where id="screen.frame"].value.fullscreen` | `true` means the runtime appears to be fullscreen. |
| `components[where id="screen.frame"].value.rounded` | `true` means frame dimensions were rounded before reporting. |
| `components[where id="screen.frame"].value.source` | The source used for the frame snapshot, such as `direct`, `cache`, or `watcher`. |
| `components[where id="screen.frame"].value.cached` | `true` means a cached frame measurement was reused. |
| `components[where id="display.mediaPreferences"].value.<preference>` | One media preference such as color gamut, forced colors, contrast, reduced motion, reduced transparency, monochrome depth, or dynamic range. |
| `components[where id="hardware"].value.hardwareConcurrency` | The normalized logical CPU thread count. |
| `components[where id="hardware"].value.deviceMemory` | The reported device memory amount when exposed by the browser. |
| `components[where id="hardware"].value.maxTouchPoints` | The maximum touch point count reported by the browser. |
| `components[where id="hardware.touch"].value.maxTouchPoints` | The touch point count used by the touch support collector. |
| `components[where id="hardware.touch"].value.touchEvent` | `true` means the runtime exposes the `TouchEvent` constructor. |
| `components[where id="hardware.touch"].value.coarsePointer` | The result of the `(pointer: coarse)` media query. |
| `components[where id="hardware.touch"].value.anyCoarsePointer` | The result of the `(any-pointer: coarse)` media query. |
| `components[where id="hardware.architecture"].value.littleEndian` | `true` means the runtime uses little-endian float byte order. |
| `components[where id="hardware.architecture"].value.infinityBytePattern` | The byte pattern observed for `Float32Array` infinity. |
| `components[where id="storage.capabilities"].value.<capability>` | One storage capability such as cookies, Do Not Track, IndexedDB, localStorage, openDatabase, or sessionStorage. |
| `components[where id="browser.botDetection"].value.verdict` | The bot-detection verdict label. |
| `components[where id="browser.botDetection"].value.score` | The bot-detection evidence score. |
| `components[where id="browser.botDetection"].value.confidence` | The confidence band for the bot-detection verdict. |
| `components[where id="browser.botDetection"].value.evidence[]` | One matched bot-detection check name. |
| `components[where id="browser.botDetection"].value.checks[]` | One bot-detection check result. |
| `components[where id="browser.botDetection"].value.checks[].name` | The stable bot-detection check name. |
| `components[where id="browser.botDetection"].value.checks[].matched` | `true` means the bot-detection check matched. |
| `components[where id="browser.botDetection"].value.checks[].weight` | The scoring weight for that bot-detection check. |
| `components[where id="browser.botDetection"].value.checks[].detail` | Optional detail captured for that bot-detection check. |
| `components[where id="browser.privacyMode"].value.verdict` | The private-mode likelihood verdict label. |
| `components[where id="browser.privacyMode"].value.score` | The private-mode evidence score. |
| `components[where id="browser.privacyMode"].value.confidence` | The confidence band for the private-mode verdict. |
| `components[where id="browser.privacyMode"].value.evidence[]` | One matched private-mode indicator name. |
| `components[where id="browser.privacyMode"].value.checks[]` | One private-mode indicator check result. |
| `components[where id="browser.privacyMode"].value.checks[].name` | The stable private-mode check name. |
| `components[where id="browser.privacyMode"].value.checks[].matched` | `true` means the private-mode check matched. |
| `components[where id="browser.privacyMode"].value.checks[].weight` | The scoring weight for that private-mode check. |
| `components[where id="browser.privacyMode"].value.checks[].detail` | Optional detail captured for that private-mode check. |
| `components[where id="browser.privacyMode"].value.note` | The caveat explaining that private-mode detection is indicator-based. |
| `components[where id="browser.tamperEvidence"].value.verdict` | The browser tamper verdict label. |
| `components[where id="browser.tamperEvidence"].value.score` | The browser tamper evidence score. |
| `components[where id="browser.tamperEvidence"].value.confidence` | The confidence band for the browser tamper verdict. |
| `components[where id="browser.tamperEvidence"].value.evidence[]` | One browser tamper evidence object. |
| `components[where id="browser.tamperEvidence"].value.evidence[].code` | The stable tamper evidence code. |
| `components[where id="browser.tamperEvidence"].value.evidence[].severity` | The severity label used to score that tamper evidence. |
| `components[where id="browser.tamperEvidence"].value.evidence[].message` | The human-readable explanation for that tamper evidence. |
| `components[where id="browser.tamperEvidence"].value.evidence[].detail` | Optional collector-specific detail for that tamper evidence. |
| `components[where id="browser.apiFeatures"].value.<group>.<feature>` | `true` means one JavaScript, browser, storage, or navigator API feature exists. |
| `components[where id="browser.cssFeatures"].value.<feature>` | `true` means one tracked CSS feature is supported by `CSS.supports`. |
| `components[where id="network.connection"].value.<field>` | One Network Information API field such as `effectiveType`, `type`, `downlink`, `rtt`, or `saveData`. |
| `components[where id="performance.memory"].value.<field>` | One browser heap memory field in megabytes. |
| `components[where id="browser.plugins"].value[]` | One normalized browser plugin entry. |
| `components[where id="browser.plugins"].value[].name` | The plugin name. |
| `components[where id="browser.plugins"].value[].description` | The plugin description. |
| `components[where id="browser.plugins"].value[].filename` | The plugin filename. |
| `components[where id="browser.plugins"].value[].mimeTypes[]` | One MIME type exposed by that plugin. |
| `components[where id="browser.plugins"].value[].mimeTypes[].type` | The MIME type string. |
| `components[where id="browser.plugins"].value[].mimeTypes[].suffixes` | The suffix list for that MIME type. |
| `components[where id="browser.vendorFlavors"].value[]` | One detected vendor-global flavor label. |
| `components[where id="browser.pdfViewer"].value` | The browser PDF viewer availability flag. |
| `components[where id="browser.applePay"].value.status` | The Apple Pay availability status. |
| `components[where id="browser.applePay"].value.message` | The Apple Pay probe error message when the status is `error`. |
| `components[where id="browser.privateClickMeasurement"].value` | The Private Click Measurement attribution source value when exposed. |
| `components[where id="math.fingerprint"].value.<operation>` | The deterministic JavaScript Math result for one tracked operation. |
| `components[where id="browser.domBlockers"].value.checked` | The number of bait elements checked for DOM blocking. |
| `components[where id="browser.domBlockers"].value.blocked[]` | One blocked bait category. |
| `components[where id="browser.domBlockers"].value.checksum` | A compact checksum of blocked bait categories. |
| `components[where id="fonts.available"].value.method` | The font detection method used for the run. |
| `components[where id="fonts.available"].value.checked` | The number of candidate fonts checked. |
| `components[where id="fonts.available"].value.available[]` | One detected font family. |
| `components[where id="fonts.available"].value.checksum` | A compact checksum of detected font families. |
| `components[where id="fonts.preferences"].value.<baseFont>` | One measured base font box for `monospace`, `sans-serif`, or `serif`. |
| `components[where id="fonts.preferences"].value.<baseFont>.width` | The measured pixel width for one base font sample. |
| `components[where id="fonts.preferences"].value.<baseFont>.height` | The measured pixel height for one base font sample. |
| `components[where id="fonts.preferences"].value.<baseFont>.normalizedWidth` | The base font width normalized by device pixel ratio. |
| `components[where id="fonts.preferences"].value.presets.<sample>.<baseFont>` | The normalized width for one text sample and base font. |
| `components[where id="fonts.preferences"].value.devicePixelRatio` | The device pixel ratio used for font normalization. |
| `components[where id="audio.baseLatency"].value.status` | The audio context probe status. |
| `components[where id="audio.baseLatency"].value.reason` | The suppression reason when the audio context probe is suppressed. |
| `components[where id="audio.baseLatency"].value.baseLatency` | The audio context base latency. |
| `components[where id="audio.baseLatency"].value.outputLatency` | The audio context output latency. |
| `components[where id="audio.baseLatency"].value.sampleRate` | The audio context sample rate. |
| `components[where id="audio.baseLatency"].value.state` | The audio context state. |
| `components[where id="audio.baseLatency"].value.message` | The audio context probe error message when the status is `error`. |
| `components[where id="audio.fingerprint"].value.status` | The offline audio fingerprint probe status. |
| `components[where id="audio.fingerprint"].value.reason` | The suppression reason when offline audio fingerprinting is suppressed. |
| `components[where id="audio.fingerprint"].value.sampleRate` | The offline audio render sample rate. |
| `components[where id="audio.fingerprint"].value.length` | The offline audio render buffer length. |
| `components[where id="audio.fingerprint"].value.renderAttempts` | The number of offline audio render attempts. |
| `components[where id="audio.fingerprint"].value.checksum` | A compact checksum of rendered audio samples. |
| `components[where id="audio.fingerprint"].value.message` | The offline audio render error message when rendering fails. |
| `components[where id="webgl.renderer"].value.contextAttributes` | The normalized WebGL context attributes. |
| `components[where id="webgl.renderer"].value.contextAttributes.<attribute>` | One WebGL context attribute such as alpha, antialias, depth, power preference, or preserve-drawing-buffer. |
| `components[where id="webgl.renderer"].value.drawingBufferWidth` | The WebGL drawing buffer width. |
| `components[where id="webgl.renderer"].value.drawingBufferHeight` | The WebGL drawing buffer height. |
| `components[where id="webgl.renderer"].value.vendor` | The masked WebGL vendor string. |
| `components[where id="webgl.renderer"].value.renderer` | The masked WebGL renderer string. |
| `components[where id="webgl.renderer"].value.version` | The WebGL version string. |
| `components[where id="webgl.renderer"].value.shadingLanguageVersion` | The WebGL shading language version string. |
| `components[where id="webgl.renderer"].value.unmaskedVendor` | The unmasked WebGL vendor string when the debug extension is available. |
| `components[where id="webgl.renderer"].value.unmaskedRenderer` | The unmasked WebGL renderer string when the debug extension is available. |
| `components[where id="webgl.extensions"].value.extensions[]` | One stable WebGL extension name included in the hashable extension list. |
| `components[where id="webgl.extensions"].value.omittedExtensions[]` | One noisy WebGL extension intentionally omitted from the stable extension list. |
| `components[where id="webgl.extensions"].value.<limit>` | One WebGL numeric limit or range such as texture size, viewport dimensions, or aliased width range. |
| `components[where id="webgl.precision"].value.<shaderPrecision>` | One shader precision object such as `vertexHighFloat` or `fragmentMediumFloat`. |
| `components[where id="webgl.precision"].value.<shaderPrecision>.precision` | The numeric shader precision. |
| `components[where id="webgl.precision"].value.<shaderPrecision>.rangeMin` | The minimum exponent range for that shader precision. |
| `components[where id="webgl.precision"].value.<shaderPrecision>.rangeMax` | The maximum exponent range for that shader precision. |
| `components[where id="canvas.checksum"].value.status` | The canvas probe status. |
| `components[where id="canvas.checksum"].value.reason` | The canvas suppression or instability reason. |
| `components[where id="canvas.checksum"].value.winding` | The canvas winding-rule behavior result. |
| `components[where id="canvas.checksum"].value.geometry` | The summarized canvas geometry render. |
| `components[where id="canvas.checksum"].value.text` | The summarized canvas text render. |
| `components[where id="canvas.checksum"].value.<render>.status` | The canvas render status for `geometry` or `text`. |
| `components[where id="canvas.checksum"].value.<render>.length` | The canvas data URL length for `geometry` or `text`. |
| `components[where id="canvas.checksum"].value.<render>.checksum` | The canvas data URL checksum for `geometry` or `text`. |
| `components[where id="canvas.checksum"].value.<render>.reason` | The canvas render instability reason for `geometry` or `text`. |
| `components[where id="custom.*"].value` | Custom collector values are application-defined and should be interpreted from the custom collector contract. |

## Risk Verdict Semantics

| Field | Interpretation |
| --- | --- |
| `bot` | Treat bot verdicts as risk evidence rather than an automatic block decision. |
| `privateMode` | Treat private-mode verdicts as likelihood indicators because browsers do not expose a universal private-mode flag. |
| `tamper` | Treat tamper verdicts as browser-integrity evidence that is strongest when verified server-side. |
| `verdict: "unavailable"` | The collector did not produce an available risk result in this runtime or policy context. |
| `score: null` | The collector had no numeric score to report for that field. |
| `evidence: []` | No detailed evidence entries were returned for that risk result. |

## Status Semantics

| Status | Interpretation |
| --- | --- |
| `ok` | The collector produced a usable value. |
| `empty` | The collector ran but the runtime did not expose usable data. |
| `skipped` | Policy, consent, or runtime preparation prevented the collector from running. |
| `error` | The collector failed but the SDK isolated the failure to that component. |
| `timeout` | The collector exceeded the configured collection timeout. |

## Role Semantics

| Role | Interpretation |
| --- | --- |
| `identity` | The component is part of the stable visitor ID input for this result. |
| `report-only` | The component is useful for risk, diagnostics, or explanation but is not part of the default visitor ID. |
