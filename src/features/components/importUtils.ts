import type { ComponentStatus, CreateComponentInput } from '@/types';
import { componentImportRowSchema } from './schemas';
import { calcPrice } from '@/utils/calc';
import { logger } from '@/utils/logger';

/**
 * Импорт запчастей из CSV или JSON.
 * CSV: разделитель ; или , (определяется автоматически), первая строка — заголовки.
 * Поддерживаются русские альтернативы колонок (наименование, артикул, закупка…).
 */

export interface ParsedImportRow {
  row: number;
  data?: CreateComponentInput;
  errors?: Record<string, string>;
}

export interface ImportParseResult {
  rows: ParsedImportRow[];
  validCount: number;
  errorCount: number;
}

/** Возможные имена колонок для поля (первое совпадение побеждает). */
const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['name', 'наименование', 'название'],
  article: ['article', 'артикул'],
  purchasePrice: ['purchaseprice', 'закупка', 'ценазакупки', 'цена закупки'],
  markupPercent: ['markuppercent', 'маржа', 'наценка', 'процентнаценки'],
  warehouseCell: ['warehousecell', 'ячейка', 'склад', 'место'],
  quantity: ['quantity', 'количество', 'кол-во', 'колво'],
  searchUrl: ['searchurl', 'ссылка', 'url'],
  note: ['note', 'примечание', 'комментарий'],
  status: ['status', 'статус'],
};

const STATUS_ALIASES: Record<string, ComponentStatus> = {
  active: 'active',
  'в наличии': 'active',
  archived: 'archived',
  архив: 'archived',
  out_of_stock: 'out_of_stock',
  'нет в наличии': 'out_of_stock',
};

/** Простейший RFC-совместимый разбор CSV: кавычки, экранирование "", переводы строк. */
function parseCsvText(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else if (char !== '\r') {
      currentField += char;
    }
  }
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows.filter((row) => row.some((cell) => cell.trim() !== ''));
}

/** Определяет разделитель по первой строке. */
function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'));
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ';' : ',';
}

/** Приводит первую буквы ключей к нижнему регистру для JSON. */
function normalizeKeys(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    result[key.toLowerCase().trim()] = value;
  }
  return result;
}

/** Ищет значение колонки по алиасам. */
function pickValue(normalized: Record<string, unknown>, field: keyof CreateComponentInput): unknown {
  for (const alias of COLUMN_ALIASES[field]) {
    const value = normalized[alias.toLowerCase()];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
}

/** Парсит число с поддержкой запятой как десятичного разделителя. */
function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(String(value).trim().replace(',', '.'));
  return Number.isNaN(num) ? undefined : num;
}

/** Преобразует сырую строку в CreateComponentInput + ошибки валидации. */
function normalizeRow(raw: Record<string, unknown>, rowNumber: number): ParsedImportRow {
  const normalized = normalizeKeys(raw);
  const statusRaw = String(pickValue(normalized, 'status') ?? '').toLowerCase();

  const candidate = {
    name: String(pickValue(normalized, 'name') ?? ''),
    article: String(pickValue(normalized, 'article') ?? ''),
    purchasePrice: toNumber(pickValue(normalized, 'purchasePrice')),
    markupPercent: toNumber(pickValue(normalized, 'markupPercent')),
    warehouseCell: String(pickValue(normalized, 'warehouseCell') ?? ''),
    quantity: toNumber(pickValue(normalized, 'quantity')),
    searchUrl: String(pickValue(normalized, 'searchUrl') ?? '') || undefined,
    note: String(pickValue(normalized, 'note') ?? '') || undefined,
    status: STATUS_ALIASES[statusRaw],
  };

  const parsed = componentImportRowSchema.safeParse(candidate);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? 'row');
      if (!errors[field]) errors[field] = issue.message;
    }
    return { row: rowNumber, errors };
  }

  const valid = parsed.data;
  return {
    row: rowNumber,
    data: {
      name: valid.name,
      article: valid.article,
      purchasePrice: valid.purchasePrice,
      markupPercent: valid.markupPercent,
      // Цена всегда рассчитывается из закупки и наценки при импорте.
      price: calcPrice(valid.purchasePrice, valid.markupPercent),
      warehouseCell: valid.warehouseCell,
      quantity: valid.quantity,
      searchUrl: valid.searchUrl || undefined,
      note: valid.note || undefined,
      status: valid.status ?? 'active',
    },
  };
}

/** Разбирает содержимое файла импорта (CSV или JSON). */
export function parseImportContent(fileName: string, text: string): ImportParseResult {
  const trimmed = text.trim();
  const isJson = /\.json$/i.test(fileName) || trimmed.startsWith('[') || trimmed.startsWith('{');

  let rawRows: Record<string, unknown>[] = [];
  let parseError: string | null = null;

  if (isJson) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      const array = Array.isArray(parsed) ? parsed : [parsed];
      rawRows = array.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
    } catch (error) {
      parseError = 'Не удалось разобрать JSON: проверьте синтаксис файла.';
      logger.warn('import', 'JSON parse error', error);
    }
  } else {
    const table = parseCsvText(trimmed, detectDelimiter(trimmed));
    if (table.length < 2) {
      parseError = 'CSV должен содержать строку заголовков и хотя бы одну строку данных.';
    } else {
      const headers = table[0].map((h) => h.toLowerCase().trim());
      rawRows = table.slice(1).map((cells) => {
        const row: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          row[header] = cells[index] ?? '';
        });
        return row;
      });
    }
  }

  if (parseError || rawRows.length === 0) {
    return { rows: [{ row: 1, errors: { row: parseError ?? 'Файл не содержит данных.' } }], validCount: 0, errorCount: 1 };
  }

  const rows = rawRows.map((raw, index) => normalizeRow(raw, index + 1));
  return {
    rows,
    validCount: rows.filter((r) => r.data).length,
    errorCount: rows.filter((r) => r.errors).length,
  };
}

/** Пример-шаблон для подсказки в диалоге импорта. */
export const IMPORT_TEMPLATE = 'наименование,артикул,закупка,наценка,ячейка,количество,комментарии\nКолодки тормозные передние,BP-4521,1850,30,A-01-02,10\nФильтр масляный,OF-310,420,35,A-02-01,40';
