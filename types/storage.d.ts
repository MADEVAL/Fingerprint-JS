export interface StorageAdapter {
  type?: string;
  get(key: string): string | null | Promise<string | null>;
  set(key: string, value: string): void | Promise<void>;
}

export function createMemoryStorage(initialState?: Map<string, string> | Record<string, string>): StorageAdapter;
export function canUseStorage(globalRef: unknown, key: string): boolean;
