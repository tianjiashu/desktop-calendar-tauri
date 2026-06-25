// ========== App integration tests ==========
// App.tsx is deeply coupled to Tauri APIs - basic smoke test only.

import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('App module exists', async () => {
    const mod = await import('../src/App');
    expect(mod.default).toBeDefined();
  }, 15_000);
});
