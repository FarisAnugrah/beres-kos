const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('../web/node_modules/typescript');

const source = readFileSync('web/src/app/admin/page.tsx', 'utf8');
const ast = ts.createSourceFile(
  'page.tsx',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
let loader;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'loadData') {
    loader = node.initializer.arguments[0].getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(loader);

for (const failure of [null, '/api/rooms']) {
  test(`dashboard loads independent resources with room failure: ${failure !== null}`, async () => {
    const state = {};
    const errors = [];
    const responses = {
      '/api/rooms': [{ id: 'room' }],
      '/api/utilities/ledger': { balance: 10, transactions: [] },
      '/api/invoices': {},
      '/api/tickets': [{ id: 'ticket' }],
    };
    const calls = [];
    const load = vm.runInNewContext(`(${loader})`, {
      fetch: async (url) => {
        calls.push(url);
        if (url === failure) throw new Error('Network failure');
        return { ok: true, json: async () => responses[url] };
      },
      setRooms: (value) => {
        state.rooms = value;
      },
      setLedger: (value) => {
        state.ledger = value;
      },
      setInvoices: (value) => {
        state.invoices = value;
      },
      setInvoiceMetrics: (value) => {
        state.metrics = value;
      },
      setTickets: (value) => {
        state.tickets = value;
      },
      console: { error: (error) => errors.push(error) },
    });
    await load();
    assert.deepEqual(calls.sort(), Object.keys(responses).sort());
    assert.equal(state.ledger.balance, 10);
    assert.equal(state.tickets[0].id, 'ticket');
    assert.equal(state.invoices.length, 0);
    assert.equal(state.metrics.revenue, 0);
    assert.equal(state.metrics.paidCount, 0);
    assert.equal(errors.length, failure ? 1 : 0);
    assert.equal(state.rooms?.[0].id, failure ? undefined : 'room');
  });
}
