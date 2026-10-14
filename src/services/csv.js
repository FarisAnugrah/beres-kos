function sanitizeCell(val, preserveText = false, fallback = '') {
  if (val === null || val === undefined || val === '') {
    return fallback ? `"${fallback.replace(/"/g, '""')}"` : '""';
  }
  let str = String(val);
  if (preserveText && /^\d+$/.test(str)) {
    str = `'${str}`;
  } else if (/^[=+\-@\t\r]/.test(str.trimStart())) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function toCSV(headers, rows, textColumns = [], fallback = '') {
  const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(';');
  const dataLines = rows.map((row) =>
    headers.map((h) => sanitizeCell(row[h], textColumns.includes(h), fallback)).join(';')
  );
  return `\uFEFF${[headerLine, ...dataLines].join('\r\n')}`;
}

module.exports = { sanitizeCell, toCSV };
