export function checksumString(text) {
  let first = 0xdeadbeef;
  let second = 0x41c6ce57;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first = Math.imul(first ^ code, 2654435761);
    second = Math.imul(second ^ code, 1597334677);
  }

  first = Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909);
  second = Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909);

  return `${(second >>> 0).toString(16).padStart(8, '0')}${(first >>> 0).toString(16).padStart(8, '0')}`;
}

export function normalizeBrands(brands) {
  if (!Array.isArray(brands)) {
    return [];
  }

  return brands
    .map((brand) => ({ brand: brand && brand.brand ? brand.brand : null, version: brand && brand.version ? brand.version : null }))
    .sort((left, right) => String(left.brand).localeCompare(String(right.brand)));
}

export function safeBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

export function safeNumber(value) {
  return Number.isFinite(value) ? Number(value) : null;
}

export function safeString(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function toArrayLike(value) {
  if (!value || !Number.isFinite(value.length)) {
    return [];
  }

  return Array.from({ length: Number(value.length) }, (_item, index) => value[index]).filter(Boolean);
}

export function getWindowRef(context) {
  return context.window || context.global || {};
}

export function getMatchMedia(context) {
  const windowRef = getWindowRef(context);
  return typeof windowRef.matchMedia === 'function' ? windowRef.matchMedia.bind(windowRef) : null;
}