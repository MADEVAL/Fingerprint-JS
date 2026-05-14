export function canonicalStringify(value) {
  return JSON.stringify(toCanonical(value));
}

export function toCanonical(value) {
  if (value === null) {
    return null;
  }

  const valueType = typeof value;

  if (valueType === 'string' || valueType === 'boolean') {
    return value;
  }

  if (valueType === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (valueType === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toCanonical(item));
  }

  if (valueType === 'undefined' || valueType === 'function' || valueType === 'symbol') {
    return undefined;
  }

  if (valueType === 'object') {
    const output = {};
    const keys = Object.keys(value).sort();

    for (const key of keys) {
      const normalized = toCanonical(value[key]);
      if (typeof normalized !== 'undefined') {
        output[key] = normalized;
      }
    }

    return output;
  }
}
