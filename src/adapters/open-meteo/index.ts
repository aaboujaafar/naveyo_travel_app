import type { WeatherForecastInput, WeatherProvider } from "../../modules/weather";
import type { WeatherForecast } from "../../modules/weather";

export function createOpenMeteoWeatherProvider(): WeatherProvider {
  return { async forecast(input: WeatherForecastInput): Promise<WeatherForecast> {
    // Request the rolling forecast window instead of asking Open-Meteo for the
    // trip dates directly. A trip can be months away and Open-Meteo rejects
    // dates outside its forecast horizon; the UI can still show the current
    // local forecast and refresh it as the trip approaches.
    const params = new URLSearchParams({ latitude: String(input.coordinates.latitude), longitude: String(input.coordinates.longitude), timezone: input.timeZone, forecast_days: "16", daily: "weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max,precipitation_sum,uv_index_max,wind_gusts_10m_max" });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) throw new Error("Météo indisponible");
    const body = await response.json() as { latitude: number; longitude: number; timezone: string; daily?: Record<string, unknown[]> };
    const daily = body.daily;
    if (!daily || !Array.isArray(daily.time)) throw new Error("Réponse météo invalide");
    const value = (key: string, index: number) => Number(daily[key]?.[index] ?? 0);
    return { coordinates: { latitude: body.latitude, longitude: body.longitude }, timeZone: body.timezone as WeatherForecast["timeZone"], fetchedAt: new Date().toISOString(), daily: daily.time.map((date, index) => ({ date: String(date), weatherCode: value("weather_code", index), temperatureMinC: value("temperature_2m_min", index), temperatureMaxC: value("temperature_2m_max", index), precipitationProbabilityMax: value("precipitation_probability_max", index), precipitationSumMm: value("precipitation_sum", index), uvIndexMax: value("uv_index_max", index), windGustsMaxKmh: value("wind_gusts_10m_max", index) })) };
  } };
}
