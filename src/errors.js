export function normalizeError(error) {
  if (!error) {
    return Object.freeze({ code: 'unknown', message: 'Unknown error' });
  }

  return Object.freeze({
    code: error.code || error.name || 'error',
    message: error.message || String(error)
  });
}
