import type { Coordinates, IANATimeZone } from "../_shared/model";
import type { ClimateSummary, WeatherForecast } from "./model";

export interface WeatherForecastInput { coordinates: Coordinates; timeZone: IANATimeZone; startDate: string; endDate: string }
export interface WeatherProvider { forecast(input: WeatherForecastInput): Promise<WeatherForecast>; climate?(input: WeatherForecastInput): Promise<ClimateSummary | null> }
export interface WeatherModule { forecast(input: WeatherForecastInput): Promise<WeatherForecast>; climate(input: WeatherForecastInput): Promise<ClimateSummary | null> }
