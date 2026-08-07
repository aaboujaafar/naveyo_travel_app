import type { ISO4217, Money } from "../../modules/_shared/model";
import type {
  ExchangeRateProvider,
  MoneyConversion,
} from "../../modules/expenses";

export class FakeExchangeRateProvider implements ExchangeRateProvider {
  public readonly requests: {
    amount: Money;
    targetCurrency: ISO4217;
    on: string;
  }[] = [];

  constructor(private readonly conversion?: MoneyConversion | Error) {}

  async convert(input: {
    amount: Money;
    targetCurrency: ISO4217;
    on: string;
  }): Promise<MoneyConversion> {
    this.requests.push(input);
    if (this.conversion instanceof Error) throw this.conversion;
    if (this.conversion === undefined)
      throw new Error("No exchange rate available");
    return structuredClone(this.conversion);
  }
}
