// ========== MCP HTTP Integration Test ==========
// Usage: node scripts/test-mcp.mjs
// Requires the app to be running with MCP server on port 18765.
//
// rmcp Streamable HTTP uses POST /mcp for all JSON-RPC requests.
// Initialize handshake is handled automatically by rmcp.

const MCP_URL = 'http://127.0.0.1:18765/mcp';
const HEALTH_URL = 'http://127.0.0.1:18765/health';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

async function main() {
  console.log('\n📡 MCP Server Integration Tests');
  console.log(`   Target: ${MCP_URL}\n`);

  // Test 1: Health check
  await test('GET /health returns ok', async () => {
    const res = await fetch(HEALTH_URL);
    if (res.status !== 200) throw new Error(`status ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(`status is ${data.status}`);
    if (data.service !== 'desktop-calendar-mcp') throw new Error('wrong service name');
  });

  // Test 2: Initialize (rmcp handles this via POST /mcp)
  await test('POST /mcp initialize returns capabilities', async () => {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {} },
        id: 1,
      }),
    });
    const data = await res.json();
    if (data.result?.protocolVersion !== '2024-11-05') throw new Error('wrong protocol');
    if (!data.result?.capabilities?.tools) throw new Error('no tools capability');
  });

  // Test 3: List tools
  await test('tools/list returns 6 tools', async () => {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', params: {}, id: 2 }),
    });
    const data = await res.json();
    const tools = data.result?.tools;
    if (!Array.isArray(tools)) throw new Error('tools is not array');
    if (tools.length !== 6) throw new Error(`expected 6 tools, got ${tools.length}`);
    const names = tools.map(t => t.name).sort();
    const expected = ['create_event','delete_event','get_event','get_free_slots','list_events','update_event'];
    for (const n of expected) {
      if (!names.includes(n)) throw new Error(`missing tool: ${n}`);
    }
  });

  // Test 4: Call list_events
  await test('tools/call list_events returns events array', async () => {
    const now = Date.now();
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'tools/call',
        params: {
          name: 'list_events',
          arguments: { start_date: now, end_date: now + 86400_000 },
        },
        id: 3,
      }),
    });
    const data = await res.json();
    if (!data.result?.content?.[0]?.text) throw new Error('no content');
  });

  // Test 5: Call list_events with return_ui=true
  await test('tools/call list_events(return_ui=true) returns _meta.ui', async () => {
    const now = Date.now();
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'tools/call',
        params: {
          name: 'list_events',
          arguments: { start_date: now, end_date: now + 86400_000, return_ui: true },
        },
        id: 4,
      }),
    });
    const data = await res.json();
    // rmcp embeds _meta in the CallToolResult response
    // rmcp 1.7.0 uses "meta" field name (not "_meta")\n    if (!data.result?.meta?.ui?.resourceUri) throw new Error('missing meta.ui.resourceUri');
  });

  // Test 6: Unknown method returns error
  await test('unknown method returns error -32601', async () => {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'nonexistent', params: {}, id: 5 }),
    });
    const data = await res.json();
    if (data.error?.code !== -32601) throw new Error(`wrong error code: ${data.error?.code}`);
  });

  // Summary
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Test harness error:', e.message);
  process.exit(1);
});
