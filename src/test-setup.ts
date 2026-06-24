// ========== Vitest test setup ==========
// Provides DOM-like types for Node environment tests

import 'vitest';
import '@testing-library/jest-dom';

// Minimal DOMRect for tests running in Node environment
if (typeof DOMRect === 'undefined') {
  // @ts-expect-error — polyfill for Node test environment
  globalThis.DOMRect = class DOMRect {
    x: number; y: number; width: number; height: number;
    top: number; bottom: number; left: number; right: number;
    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x; this.y = y; this.width = width; this.height = height;
      this.top = y; this.bottom = y + height;
      this.left = x; this.right = x + width;
    }
    toJSON() {
      return { x: this.x, y: this.y, width: this.width, height: this.height,
               top: this.top, bottom: this.bottom, left: this.left, right: this.right };
    }
  } as unknown as typeof DOMRect;
}

// Minimal window polyfill for Node environment tests
if (typeof globalThis.window === 'undefined') {
  // @ts-expect-error — polyfill for Node test environment
  globalThis.window = {
    open: () => null,
    innerWidth: 1024,
    innerHeight: 768,
  };
}

// Minimal document polyfill for Node environment tests
if (typeof globalThis.document === 'undefined') {
  // @ts-expect-error — polyfill for Node test environment
  globalThis.document = {
    querySelectorAll: () => [] as unknown as NodeListOf<Element>,
    body: {
      innerHTML: '',
      appendChild: () => ({}),
    },
    createElement: () => ({
      className: '',
      dataset: {} as DOMStringMap,
      getBoundingClientRect: () => ({
        left: 0, right: 0, top: 0, bottom: 0,
        width: 0, height: 0, x: 0, y: 0,
        toJSON: () => ({}),
      }),
    }),
  };
}

// Minimal navigator polyfill for Node environment tests
if (typeof globalThis.navigator === 'undefined') {
  // @ts-expect-error — polyfill for Node test environment
  globalThis.navigator = {
    clipboard: {
      writeText: () => Promise.resolve(),
    },
  };
}
