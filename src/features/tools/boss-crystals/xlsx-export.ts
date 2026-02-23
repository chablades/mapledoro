/*
  Minimal XLSX generator — zero dependencies.
  XLSX = ZIP (STORE, no compression) containing Office Open XML parts.
*/

export interface FormulaCell {
  formula: string;
  array?: boolean; // emit as CSE array formula
}

export type Cell = string | number | FormulaCell | null;

export interface Sheet {
  name: string;
  rows: Cell[][];
  colWidths?: number[];
}

// -- CRC-32 -------------------------------------------------------------------

function crc32(buf: Uint8Array): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// -- Tiny ZIP (STORE only) ----------------------------------------------------

function buildZip(entries: { path: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = enc.encode(entry.path);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);

    const cd = new Uint8Array(46 + name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(12, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    cd.set(name, 46);

    parts.push(local, entry.data);
    central.push(cd);
    offset += local.length + entry.data.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const c of central) cdSize += c.length;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);

  const total = offset + cdSize + 22;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  for (const c of central) {
    out.set(c, pos);
    pos += c.length;
  }
  out.set(eocd, pos);
  return out;
}

// -- XLSX builder -------------------------------------------------------------

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function colLetter(i: number): string {
  let s = "";
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function isFormula(v: Cell): v is FormulaCell {
  return v !== null && typeof v === "object" && "formula" in v;
}

function buildSheetXml(sheet: Sheet, strings: Map<string, number>): string {
  let xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';

  if (sheet.colWidths && sheet.colWidths.length > 0) {
    xml += "<cols>";
    for (let i = 0; i < sheet.colWidths.length; i++) {
      xml += `<col min="${i + 1}" max="${i + 1}" width="${sheet.colWidths[i]}" customWidth="1"/>`;
    }
    xml += "</cols>";
  }

  xml += "<sheetData>";

  for (let r = 0; r < sheet.rows.length; r++) {
    const row = sheet.rows[r];
    xml += `<row r="${r + 1}">`;
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (v === null || v === undefined) continue;
      const ref = `${colLetter(c)}${r + 1}`;
      if (isFormula(v)) {
        if (v.array) {
          xml += `<c r="${ref}" s="1"><f t="array" ref="${ref}">${escapeXml(v.formula)}</f></c>`;
        } else {
          xml += `<c r="${ref}" s="1"><f>${escapeXml(v.formula)}</f></c>`;
        }
      } else if (typeof v === "number") {
        xml += `<c r="${ref}" s="1"><v>${v}</v></c>`;
      } else {
        const idx = strings.get(v)!;
        xml += `<c r="${ref}" t="s"><v>${idx}</v></c>`;
      }
    }
    xml += "</row>";
  }

  xml += "</sheetData></worksheet>";
  return xml;
}

function buildSharedStrings(sheets: Sheet[]): {
  xml: string;
  map: Map<string, number>;
} {
  const map = new Map<string, number>();
  let count = 0;
  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      for (const cell of row) {
        if (typeof cell === "string" && !map.has(cell)) {
          map.set(cell, count++);
        }
      }
    }
  }

  let xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${count}" uniqueCount="${count}">`;
  for (const [s] of map) {
    xml += `<si><t>${escapeXml(s)}</t></si>`;
  }
  xml += "</sst>";
  return { xml, map };
}

export function generateXlsx(sheets: Sheet[]): Uint8Array {
  const enc = new TextEncoder();
  const { xml: ssXml, map: strings } = buildSharedStrings(sheets);

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    sheets
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join("") +
    '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    "</Types>";

  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    "</Relationships>";

  const wbRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("") +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
    `<Relationship Id="rId${sheets.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    "</Relationships>";

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    "<sheets>" +
    sheets
      .map(
        (s, i) =>
          `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
      )
      .join("") +
    "</sheets></workbook>";

  // Style 0 = default, Style 1 = #,##0 (comma-separated numbers)
  const styles =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts>' +
    '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    "</cellXfs></styleSheet>";

  const entries: { path: string; data: Uint8Array }[] = [
    { path: "[Content_Types].xml", data: enc.encode(contentTypes) },
    { path: "_rels/.rels", data: enc.encode(rels) },
    { path: "xl/workbook.xml", data: enc.encode(workbook) },
    { path: "xl/_rels/workbook.xml.rels", data: enc.encode(wbRels) },
    { path: "xl/sharedStrings.xml", data: enc.encode(ssXml) },
    { path: "xl/styles.xml", data: enc.encode(styles) },
  ];

  for (let i = 0; i < sheets.length; i++) {
    entries.push({
      path: `xl/worksheets/sheet${i + 1}.xml`,
      data: enc.encode(buildSheetXml(sheets[i], strings)),
    });
  }

  return buildZip(entries);
}

export function downloadBlob(data: Uint8Array, filename: string) {
  const blob = new Blob([data.buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
