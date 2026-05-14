import { createClient } from './client.js';

export async function loadClient(options = {}, context = {}) {
  const client = createClient(options);
  await client.prepare(context);
  return client;
}