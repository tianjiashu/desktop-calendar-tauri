// ========== Agent Integration Test Runner ==========
// Run: node scripts/run-all-tests.mjs
// This is the single entry point for the AI Agent to verify everything.

import { execSync } from 'node:child_process';
import * as http from 'node:http';

function run(name, cmd, cwd) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`▶ ${name}`);
  console.log(`${'='.repeat(60)}`);
  try {
    const output = execSync(cmd, { cwd, stdio: 'inherit', timeout: 120_000 });
    console.log(`✅ ${name} — PASSED\n`);
    return true;
  } catch (e) {
    console.log(`❌ ${name} — FAILED (exit code: ${e.status})\n`);
    return false;
  }
}

const root = new URL('..', import.meta.url).pathname;
const srcTauri = root + 'src-tauri';
let allPassed = true;

// ===== 1. Rust unit/integration tests =====
allPassed = run('Rust cargo test', 'cargo test', srcTauri) && allPassed;

// ===== 2. TypeScript unit/integration tests =====
allPassed = run('TypeScript vitest', 'npx vitest run', root) && allPassed;

// ===== 3. MCP HTTP tests (skip if no server) =====
console.log(`\n${'='.repeat(60)}`);
console.log('▶ MCP HTTP Integration Tests');
console.log(`${'='.repeat(60)}`);
try {
  // Check if MCP server is running
  const healthy = await new Promise(resolve => {
    const req = http.get('http://127.0.0.1:18765/health', res => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });

  if (healthy) {
    allPassed = run('MCP HTTP tests', 'node scripts/test-mcp.mjs', root) && allPassed;
  } else {
    console.log('  ⏭️  MCP server not running — skipped HTTP tests');
    console.log('  💡 Start the app first to run MCP integration tests');
  }
} catch {
  console.log('  ⏭️  MCP server check failed — skipped HTTP tests');
}

// ===== Summary =====
console.log(`\n${'='.repeat(60)}`);
console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
console.log(`${'='.repeat(60)}\n`);

process.exit(allPassed ? 0 : 1);
