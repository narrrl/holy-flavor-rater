import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node 25 ships an incomplete experimental localStorage that collides with
// jsdom's. Replace it with a clean in-memory Storage shim before every test.
function createStorageShim(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createStorageShim(),
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  cleanup();
});
