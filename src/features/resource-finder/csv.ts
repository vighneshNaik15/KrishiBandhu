export type CsvRecord = Record<string, string>;

export function parseCsv(contents: string): CsvRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let insideQuotes = false;

  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index];

    if (insideQuotes) {
      if (character === '"') {
        if (contents[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          insideQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      insideQuotes = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      if (character === '\r' && contents[index + 1] === '\n') index += 1;
    } else {
      field += character;
    }
  }

  if (insideQuotes) {
    throw new Error('The dataset contains an unterminated quoted field.');
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  }
  if (rows.length === 0) return [];

  const headers = rows[0].map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim()
  );

  return rows.slice(1).map((cells) => {
    const record: CsvRecord = {};
    headers.forEach((header, index) => {
      if (header) record[header] = cells[index] ?? '';
    });
    return record;
  });
}

export async function fetchCsvRecords(url: string, signal?: AbortSignal): Promise<CsvRecord[]> {
  const response = await fetch(url, { cache: 'force-cache', signal });
  if (!response.ok) {
    throw new Error(`Could not load the source dataset (${response.status}).`);
  }
  return parseCsv(await response.text());
}

export function optionalCell(record: CsvRecord, column: string): string | null {
  const value = record[column]?.trim();
  return value ? value : null;
}

export function requiredCell(record: CsvRecord, column: string, rowNumber: number): string {
  const value = optionalCell(record, column);
  if (!value) {
    throw new Error(`Dataset row ${rowNumber} is missing required column "${column}".`);
  }
  return value;
}
