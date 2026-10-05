import { describe, expect, it } from "vitest";
import { formatAmountInput, parseReceiptText } from "./receipt-model";

const options = { defaultCurrency: "EUR" };

describe("receipt reading", () => {
  it("reads a Portuguese café receipt", () => {
    const text = [
      "PASTELARIA SAO ROQUE",
      "Rua da Misericordia 12",
      "NIF 501234567",
      "Fatura simplificada FS 2026/1234",
      "16-11-2026 10:42",
      "2 Pastel de nata    2,60",
      "1 Galao            1,80",
      "IVA 23%            0,82",
      "TOTAL           4,40 €",
      "Numerario          10,00",
      "Troco               5,60",
    ].join("\n");
    expect(parseReceiptText(text, options)).toEqual({
      amountMinorUnits: 440,
      currency: "EUR",
      occurredOn: "2026-11-16",
      merchant: "Pastelaria Sao Roque",
      category: "food",
    });
  });

  it("reads a French receipt with the total on the next line", () => {
    const text = ["Musée de l'Orangerie", "Billet entrée x2", "Sous-total 25,00", "TVA 20% 4,17", "Montant à payer", "25,00 EUR", "Date : 03/07/26"].join("\n");
    expect(parseReceiptText(text, options)).toMatchObject({ amountMinorUnits: 2500, currency: "EUR", occurredOn: "2026-07-03", merchant: "Musée de l'Orangerie", category: "activity" });
  });

  it("falls back to the largest amount and keeps thousands separators", () => {
    const text = ["HOTEL AVENIDA", "2 nights", "1.250,00", "City tax 8,00"].join("\n");
    expect(parseReceiptText(text, { defaultCurrency: "GBP" })).toMatchObject({ amountMinorUnits: 125000, currency: "GBP", category: "accommodation" });
  });

  it("returns an empty draft when nothing is readable", () => {
    expect(parseReceiptText("", options)).toEqual({});
    expect(formatAmountInput(440)).toBe("4,40");
    expect(formatAmountInput(125000)).toBe("1250,00");
  });
});
