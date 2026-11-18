import { INCOME_CATEGORY, TransactionType } from '../models/transaction.model';
import { addDays } from './dates';

export interface ParsedVoiceTransaction {
  name: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
}

/** Palabras que indican que el movimiento es un ingreso. */
const INCOME_KEYWORDS = [
  'ingres',
  'recibi',
  'gane',
  'cobre',
  'sueldo',
  'salario',
  'nomina',
  'deposito',
  'bono',
  'venta',
  'dividendo',
  'interes',
];

/** Palabras que indican que el movimiento es un gasto. */
const EXPENSE_KEYWORDS = [
  'gaste',
  'pague',
  'compre',
  'gasto',
  'compra',
  'pago',
  'costo',
  'transferi',
  'saque',
  'retire',
];

/**
 * Sinónimos habituales en español para las categorías de la aplicación.
 * Se usan sólo si la categoría existe en la cuenta del usuario.
 */
const CATEGORY_ALIASES: Record<string, string[]> = {
  Alimentos: [
    'alimento',
    'almuerzo',
    'comida',
    'cena',
    'desayuno',
    'supermercado',
    'mercado',
    'restaurante',
    'cafe',
    'pan',
    'pizza',
    'hamburguesa',
    'domicilio',
    'rappi',
  ],
  Transporte: [
    'transporte',
    'taxi',
    'bus',
    'metro',
    'gasolina',
    'combustible',
    'uber',
    'pasaje',
    'peaje',
    'parqueadero',
    'moto',
    'carro',
  ],
  Servicios: [
    'servicio',
    'luz',
    'agua',
    'internet',
    'telefono',
    'celular',
    'gas',
    'arriendo',
    'renta',
    'factura',
    'energia',
  ],
  Entretenimiento: [
    'entretenimiento',
    'netflix',
    'cine',
    'juego',
    'concierto',
    'streaming',
    'spotify',
    'salida',
    'rumba',
    'fiesta',
  ],
  Salud: ['salud', 'farmacia', 'medicina', 'medico', 'doctor', 'cita', 'hospital', 'drogueria', 'odontologo'],
  Otros: ['otro', 'regalo', 'compra', 'varios', 'imprevisto'],
};

/** Quita tildes y normaliza espacios para comparar texto hablado. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convierte un número escrito con separadores colombianos o internacionales:
 * "25.000" → 25000, "25,50" → 25.5, "1.234,56" → 1234.56.
 */
function parseAmount(raw: string, multiplier?: string): number {
  let normalized = raw.replace(/\s/g, '');
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');
    normalized =
      lastComma > lastDot
        ? normalized.replace(/\./g, '').replace(',', '.')
        : normalized.replace(/,/g, '');
  } else if (hasComma) {
    normalized = interpretSeparator(normalized, ',');
  } else if (hasDot) {
    normalized = interpretSeparator(normalized, '.');
  }

  let amount = Number(normalized);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const unit = multiplier?.toLowerCase();
  if (unit === 'mil' || unit === 'k') {
    amount *= 1000;
  } else if (unit?.startsWith('millon')) {
    amount *= 1_000_000;
  }

  return Math.round(amount * 100) / 100;
}

function interpretSeparator(value: string, separator: '.' | ','): string {
  const parts = value.split(separator);
  if (parts.length === 1) {
    return value;
  }

  // Grupos de tres dígitos: separador de miles ("25.000" o "1.234.567").
  if (parts[parts.length - 1].length === 3) {
    return parts.join('');
  }

  // Uno o dos dígitos: separador decimal ("25.5" o "25,50").
  return `${parts.slice(0, -1).join('')}.${parts[parts.length - 1]}`;
}

function detectTypeOrNull(text: string): TransactionType | null {
  const hasIncome = INCOME_KEYWORDS.some((keyword) => text.includes(keyword));
  const hasExpense = EXPENSE_KEYWORDS.some((keyword) => text.includes(keyword));

  if (hasIncome && !hasExpense) {
    return 'income';
  }
  if (hasExpense && !hasIncome) {
    return 'expense';
  }
  return null;
}

/** Busca una palabra o frase completa dentro del texto normalizado. */
function containsWord(text: string, word: string): boolean {
  if (word.trim().length === 0) {
    return false;
  }
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
}

function detectCategory(text: string, categories: string[], type: TransactionType): string {
  if (type === 'income') {
    return INCOME_CATEGORY;
  }

  const available = categories.map((name) => ({ name, normalized: normalize(name) }));

  // 1. Coincidencia directa con el nombre de una categoría real.
  const direct = available.find((category) => containsWord(text, category.normalized));
  if (direct) {
    return direct.name;
  }

  // 2. Sinónimos ("almuerzo" → Alimentos) sólo si la categoría existe.
  for (const [categoryName, aliases] of Object.entries(CATEGORY_ALIASES)) {
    const real = available.find((category) => category.normalized === normalize(categoryName));
    if (real && aliases.some((alias) => containsWord(text, normalize(alias)))) {
      return real.name;
    }
  }

  // 3. Categoría comodín para no dejar el movimiento sin clasificar.
  const fallback = available.find((category) => category.normalized === 'otros') ?? available[0];
  return fallback?.name ?? '';
}

function capitalize(value: string): string {
  if (value.length === 0) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Verbos y palabras que indican el inicio de otro movimiento dentro de la frase. */
const MOVEMENT_KEYWORDS = [...INCOME_KEYWORDS, ...EXPENSE_KEYWORDS, 'tuve', 'vendi', 'vendo'];

/**
 * Conectores que pueden separar varios movimientos:
 * "gasté 20.000 en comida y 30.000 en taxi", "... , recibí 1.000.000 ...".
 * No se separa en los puntos de "25.000" porque el punto debe ir seguido de espacio.
 */
const SEGMENT_SEPARATOR =
  /\s*(?:;|,\s+|\.(?=\s|$)|\by\b|\be\b|\btambien\b|\bademas\b|\bluego\b|\bdespues\b)\s*/g;

/** Limpia verbos y conectores para quedarse con una descripción corta y legible. */
function buildName(text: string, amountMatch: RegExpMatchArray | null, fallback: string): string {
  let candidate = text;

  if (amountMatch?.index !== undefined) {
    const before = text.slice(0, amountMatch.index);
    const after = text.slice(amountMatch.index + amountMatch[0].length);
    candidate = after.trim().length > 1 ? after : before;
  }

  candidate = candidate
    .replace(
      /\b(gaste|gasto|pague|pago|compre|compra|ingrese|ingreso|recibi|gane|cobre|deposito|tuve|vendi|vendo|transferi|saque|retire)\b/gi,
      ' ',
    )
    .replace(
      /\b(en|de|del|por|para|un|una|unos|unas|el|la|los|las|mi|mis|hoy|ayer|anteayer|tambien|ademas|luego|despues)\b/gi,
      ' ',
    )
    .replace(/[.,;:!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return capitalize((candidate || fallback).slice(0, 60));
}

/** Detecta la fecha dicha en el texto; null si no se menciona ninguna. */
function detectDateOrNull(text: string, todayIso: string): string | null {
  if (text.includes('anteayer')) {
    return addDays(todayIso, -2);
  }
  if (text.includes('ayer')) {
    return addDays(todayIso, -1);
  }
  if (text.includes('hoy')) {
    return todayIso;
  }
  return null;
}

/** Busca el monto principal de un fragmento (el número más grande). */
function findAmount(text: string): { amount: number; match: RegExpMatchArray } | null {
  const amountPattern =
    /\b(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d+)?)\s*(mil|millon(?:es)?|k)?\b/gi;
  const matches = Array.from(text.matchAll(amountPattern));

  let best: { amount: number; match: RegExpMatchArray } | null = null;
  for (const match of matches) {
    const amount = parseAmount(match[1], match[2]);
    if (amount > 0 && (!best || amount > best.amount)) {
      best = { amount, match };
    }
  }
  return best;
}

/**
 * Un fragmento inicia otro movimiento cuando trae un monto y, además, empieza
 * con el número ("30.000 en taxi") o menciona un verbo de movimiento
 * ("y pagué 30.000..."). Así "pan y leche por 20.000" sigue siendo una compra.
 */
function startsNewMovement(segment: string): boolean {
  if (!/\d/.test(segment)) {
    return false;
  }
  if (/^\d/.test(segment)) {
    return true;
  }
  return MOVEMENT_KEYWORDS.some((keyword) => segment.includes(keyword));
}

/** Divide la frase en movimientos y une los trozos que no son uno nuevo. */
function splitSegments(text: string): string[] {
  const parts = text
    .split(SEGMENT_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const segments: string[] = [];
  for (const part of parts) {
    if (segments.length === 0 || startsNewMovement(part)) {
      segments.push(part);
    } else {
      segments[segments.length - 1] = `${segments[segments.length - 1]} ${part}`;
    }
  }

  return segments.length > 0 ? segments : [text.trim()];
}

interface ParsedDefaults {
  type: TransactionType;
  date: string;
}

function parseSegment(
  rawSegment: string,
  categories: string[],
  todayIso: string,
  defaults: ParsedDefaults,
): ParsedVoiceTransaction {
  const text = normalize(rawSegment);
  const type = detectTypeOrNull(text) ?? defaults.type;
  const date = detectDateOrNull(text, todayIso) ?? defaults.date;
  const best = findAmount(text);
  const category = detectCategory(text, categories, type);

  return {
    name: buildName(text, best?.match ?? null, category || 'Movimiento por voz'),
    amount: best?.amount ?? 0,
    type,
    category,
    date,
  };
}

/**
 * Interpreta una frase con uno o varios movimientos. Ejemplos:
 * "Gasté 25.000 en almuerzo ayer" (uno) o
 * "Gasté 20.000 en comida y 30.000 en taxi, y recibí 1.000.000 de salario" (tres).
 * El panel de confirmación permite editar, quitar o añadir movimientos.
 */
export function parseVoiceTransactions(
  rawText: string,
  categories: string[],
  todayIso: string,
): ParsedVoiceTransaction[] {
  const text = normalize(rawText);
  const defaults: ParsedDefaults = { type: 'expense', date: todayIso };
  const results: ParsedVoiceTransaction[] = [];

  for (const segment of splitSegments(text)) {
    const parsed = parseSegment(segment, categories, todayIso, defaults);
    results.push(parsed);
    // El siguiente fragmento hereda tipo y fecha si no los menciona.
    defaults.type = parsed.type;
    defaults.date = parsed.date;
  }

  return results.length > 0 ? results : [parseSegment(text, categories, todayIso, defaults)];
}

/**
 * Versión de un solo movimiento (se conserva para usos puntuales): devuelve
 * el primer movimiento detectado en la frase.
 */
export function parseVoiceTransaction(
  rawText: string,
  categories: string[],
  todayIso: string,
): ParsedVoiceTransaction {
  return parseVoiceTransactions(rawText, categories, todayIso)[0];
}
