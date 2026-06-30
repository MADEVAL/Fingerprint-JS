import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const budgets = [
  {
    file: 'dist/browser/fingerprintjs.min.js',
    maxBytes: 65000
  }
];

for (const budget of budgets) {
  const filePath = resolve(budget.file);
  const info = await stat(filePath);

  if (info.size > budget.maxBytes) {
    throw new Error(`${budget.file} is ${info.size} bytes, exceeding ${budget.maxBytes} bytes.`);
  }

  console.log(`${budget.file}: ${info.size}/${budget.maxBytes} bytes`);
}
