// ========== App integration tests ==========

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('App', () => {
  it('App source exports the root component', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    expect(source).toContain('const App: React.FC');
    expect(source).toContain('export default App');
  });
});
