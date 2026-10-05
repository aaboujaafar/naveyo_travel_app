import type { ExpenseCategory } from "../modules/expenses";

/** What a receipt photo can suggest; every field is reviewed before the expense is added. */
export interface ReceiptDraft {
  amountMinorUnits?: number;
  currency?: string;
  occurredOn?: string;
  merchant?: string;
  category?: ExpenseCategory;
}

const MONEY = /(?:(€|EUR|£|GBP|\$|USD|CHF)\s*)?(\d{1,3}(?:[ . ]\d{3})+|\d+)[.,](\d{2})(?!\d)(?:\s*(€|EUR|£|GBP|\$|USD|CHF))?/gi;
const TOTAL_WORDS = /\b(total|a pagar|montant|net a payer|a payer|importe|summe|amount due|totale|valor)\b/;
// Lines whose amount is not what was spent: taxes, subtotals, cash handed over and change given back.
const NOT_TOTAL_WORDS = /\b(sous[- ]?total|subtotal|sub-total|ht|hors taxe|iva|tva|vat|taxa|taxe|troco|rendu|change|especes|numerario|dinheiro|cash|recebido|remis|pago em)\b/;
const CURRENCIES: Record<string, string> = { "€": "EUR", EUR: "EUR", "£": "GBP", GBP: "GBP", $: "USD", USD: "USD", CHF: "CHF" };
const MERCHANT_SKIP = /\b(fatura|factura|facture|ticket|recibo|nif|contribuinte|siret|tva|tel|telefone|www|http|rua|avenida|av\.|data|date|caixa|operador|n[º°o]\s?\d)/;
const CATEGORY_WORDS: [ExpenseCategory, RegExp][] = [
  ["food", /\b(restaurante?|cafe|caf[eé]|pastelaria|padaria|tasca|cervejaria|snack|pizzaria|pizza|bar|brasserie|boulangerie|bistro|sushi|burger|gelataria)\b/],
  ["transport", /\b(uber|bolt|taxi|t[aá]xi|metro|carris|comboio|cp lisboa|train|sncf|bus|autocarro|parking|estacionamento|gasolina|combust[ií]vel|fuel|portagem|peage)\b/],
  ["accommodation", /\b(hotel|h[oó]tel|hostel|alojamento|guest ?house|airbnb|pousada)\b/],
  ["activity", /\b(museu|museum|mus[eé]e|bilheteira|entrada|tour|visita|oceanario|castelo|palacio|monumento)\b/],
  ["shopping", /\b(supermercado|pingo doce|continente|lidl|auchan|carrefour|farm[aá]cia|pharmacie|loja|boutique|store|shop)\b/],
];

export function parseReceiptText(text: string, options: { defaultCurrency: string }): ReceiptDraft {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const normalizedLines = lines.map(normalize);
  const draft: ReceiptDraft = {};

  const totals: { minorUnits: number; currency?: string }[] = [];
  const others: { minorUnits: number; currency?: string }[] = [];
  lines.forEach((line, index) => {
    const normalized = normalizedLines[index]!;
    if (NOT_TOTAL_WORDS.test(normalized)) return;
    // On many receipts the amount of the "TOTAL" line is printed on the next line.
    const totalLine = TOTAL_WORDS.test(normalized) || (index > 0 && TOTAL_WORDS.test(normalizedLines[index - 1]!) && !MONEY_TEST.test(lines[index - 1]!));
    for (const amount of amountsIn(line)) (totalLine ? totals : others).push(amount);
  });
  const best = largest(totals) ?? largest(others);
  if (best) {
    draft.amountMinorUnits = best.minorUnits;
    draft.currency = best.currency ?? currencyIn(text) ?? options.defaultCurrency;
  } else {
    const currency = currencyIn(text);
    if (currency) draft.currency = currency;
  }

  const date = dateIn(text);
  if (date) draft.occurredOn = date;

  const merchant = lines.slice(0, 6).find((line, index) => {
    const normalized = normalizedLines[index]!;
    const letters = line.replace(/[^\p{L}]/gu, "").length;
    return letters >= 3 && letters >= line.replace(/\s/g, "").length * 0.6 && !MERCHANT_SKIP.test(normalized);
  });
  if (merchant) draft.merchant = tidyMerchant(merchant);

  const allText = normalizedLines.join(" ");
  const category = CATEGORY_WORDS.find(([, words]) => words.test(allText))?.[0];
  if (category) draft.category = category;
  return draft;
}

/** "12,50" for a form field, from minor units. */
export function formatAmountInput(minorUnits: number): string {
  return `${Math.floor(minorUnits / 100)},${String(minorUnits % 100).padStart(2, "0")}`;
}

const MONEY_TEST = /\d[.,]\d{2}(?!\d)/;

function amountsIn(line: string): { minorUnits: number; currency?: string }[] {
  return [...line.matchAll(MONEY)].map((match) => {
    const units = Number(match[2]!.replace(/[ . ]/g, ""));
    const symbol = (match[1] ?? match[4])?.toUpperCase();
    return { minorUnits: units * 100 + Number(match[3]), ...(symbol && CURRENCIES[symbol] ? { currency: CURRENCIES[symbol] } : {}) };
  }).filter((amount) => amount.minorUnits > 0 && amount.minorUnits < 10_000_000);
}

function largest(amounts: { minorUnits: number; currency?: string }[]) {
  return amounts.reduce<{ minorUnits: number; currency?: string } | undefined>((best, amount) => (!best || amount.minorUnits > best.minorUnits ? amount : best), undefined);
}

function currencyIn(text: string): string | undefined {
  const match = /(€|\bEUR\b|£|\bGBP\b|\$|\bUSD\b|\bCHF\b)/i.exec(text);
  return match ? CURRENCIES[match[1]!.toUpperCase()] : undefined;
}

function dateIn(text: string): string | undefined {
  const iso = /\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso && validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  for (const match of text.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g)) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = match[3]!.length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    if (validDate(year, month, day)) return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return undefined;
}

function validDate(year: number, month: number, day: number): boolean {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function tidyMerchant(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim().slice(0, 60);
  // Receipts shout: "PASTELARIA SAO ROQUE" reads better as "Pastelaria Sao Roque".
  return trimmed === trimmed.toUpperCase()
    ? trimmed.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, separator: string, letter: string) => `${separator}${letter.toUpperCase()}`)
    : trimmed;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
