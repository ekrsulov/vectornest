/**
 * Vitest setup file
 * Mocks problematic dependencies that don't work in the test environment
 */

import { vi } from 'vitest';

// Mock opentype.js which has ESM compatibility issues in vitest
vi.mock('opentype.js', () => ({
  load: vi.fn(),
  loadSync: vi.fn(),
  parse: vi.fn(),
  Font: vi.fn(),
  Path: vi.fn(),
}));

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  vi.stubGlobal('localStorage', new MemoryStorage());
}
