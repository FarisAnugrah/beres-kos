const test = require('node:test');
const assert = require('node:assert/strict');
const { toCSV, sanitizeCell } = require('../src/services/csv');

test('sanitizeCell escapes quotes and handles nulls and zeroes correctly', () => {
  assert.equal(sanitizeCell(null), '""');
  assert.equal(sanitizeCell(undefined), '""');
  assert.equal(sanitizeCell(null, false, '-'), '"-"');
  assert.equal(sanitizeCell(0), '"0"');
  assert.equal(sanitizeCell('hello "world"'), '"hello ""world"""');
  assert.equal(sanitizeCell('line1\nline2'), '"line1\nline2"');
});

test('sanitizeCell neutralizes formula injection characters', () => {
  assert.equal(sanitizeCell('=1+1'), `"'=1+1"`);
  assert.equal(sanitizeCell('+100'), `"'+100"`);
  assert.equal(sanitizeCell('-50'), `"'-50"`);
  assert.equal(sanitizeCell('@SUM(A1)'), `"'@SUM(A1)"`);
  assert.equal(sanitizeCell('\t=cmd'), `"'\t=cmd"`);
  assert.equal(sanitizeCell('  =1+1'), `"'  =1+1"`);
});

test('sanitizeCell preserves long NIK and numeric phone numbers as text literal', () => {
  const nik = '3201234567890123';
  assert.equal(sanitizeCell(nik, true), `"'${nik}"`);
  const phone = '08123456789';
  assert.equal(sanitizeCell(phone, true), `"'${phone}"`);
});

test('toCSV produces valid UTF-8 BOM, semicolon-delimited, CRLF output with empty rows', () => {
  const headers = ['Nomor Kamar', 'Nama Lengkap', 'NIK KTP'];
  const csv = toCSV(headers, [], ['NIK KTP'], '-');
  assert.equal(csv, '\uFEFF"Nomor Kamar";"Nama Lengkap";"NIK KTP"');
});

test('toCSV correctly formats multiple rows with sanitized cells', () => {
  const headers = ['Nomor Kamar', 'Nama Lengkap', 'NIK KTP', 'Nominal (Rp)'];
  const rows = [
    {
      'Nomor Kamar': 'A1',
      'Nama Lengkap': 'Budi "Santoso"',
      'NIK KTP': '3201234567890123',
      'Nominal (Rp)': 1200000,
    },
    {
      'Nomor Kamar': 'A2',
      'Nama Lengkap': '=SUM(A1)',
      'NIK KTP': null,
      'Nominal (Rp)': 0,
    },
  ];
  const csv = toCSV(headers, rows, ['NIK KTP'], '-');
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0], '\uFEFF"Nomor Kamar";"Nama Lengkap";"NIK KTP";"Nominal (Rp)"');
  assert.equal(lines[1], '"A1";"Budi ""Santoso""";"\'3201234567890123";"1200000"');
  assert.equal(lines[2], '"A2";"\'=SUM(A1)";"-";"0"');
});
