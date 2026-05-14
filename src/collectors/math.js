import { createCollector } from './core.js';

export function createMathCollector() {
  return createCollector({
    id: 'math.fingerprint',
    version: '1',
    category: 'runtime',
    sensitivity: 'low',
    mode: 'passive',
    stability: 'stable',
    weight: 0.7,
    collect() {
      return {
        acos: Math.acos(0.12312423423423424),
        acosh: Math.acosh(1e154),
        asin: Math.asin(0.12312423423423424),
        asinh: Math.asinh(1),
        atan: Math.atan(0.5),
        atanh: Math.atanh(0.5),
        cos: Math.cos(10.000000000123),
        cosh: Math.cosh(1),
        exp: Math.exp(1),
        expm1: Math.expm1(1),
        log1p: Math.log1p(10),
        powPI: Math.pow(Math.PI, -100),
        sin: Math.sin(10.000000000123),
        sinh: Math.sinh(1),
        tan: Math.tan(-1e300),
        tanh: Math.tanh(1)
      };
    }
  });
}