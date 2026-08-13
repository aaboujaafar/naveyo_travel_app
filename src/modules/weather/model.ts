import type { Coordinates, IANATimeZone } from "../_shared/model";
export interface DailyWeather { date: string; weatherCode: number; temperatureMinC: number; temperatureMaxC: number; precipitationProbabilityMax: number; precipitationSumMm: number; uvIndexMax: number; windGustsMaxKmh: number }
export interface WeatherForecast { coordinates: Coordinates; timeZone: IANATimeZone; fetchedAt: string; daily: DailyWeather[] }
