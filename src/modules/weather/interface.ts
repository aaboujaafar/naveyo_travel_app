import type { Coordinates, IANATimeZone } from "../_shared/model";
import type { WeatherForecast } from "./model";

export interface WeatherForecastInput { coordinates: Coordinates; timeZone: IANATimeZone; startDate: string; endDate: string }
export interface WeatherProvider { forecast(input: WeatherForecastInput): Promise<WeatherForecast> }
export interface WeatherModule { forecast(input: WeatherForecastInput): Promise<WeatherForecast> }
