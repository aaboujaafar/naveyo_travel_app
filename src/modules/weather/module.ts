import type { WeatherForecastInput, WeatherModule, WeatherProvider } from "./interface";
export class Weather implements WeatherModule {
  constructor(private readonly provider: WeatherProvider) {}
  forecast(input: WeatherForecastInput) { return this.provider.forecast(input); }
  async climate(input: WeatherForecastInput) { return this.provider.climate ? this.provider.climate(input) : null; }
}
