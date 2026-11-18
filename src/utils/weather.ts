import type { WeatherForecast } from '@/models/weather';

export type WeatherAdvisory = {
  title: string;
  message: string;
  severity: 'info' | 'warning';
};

const WEATHER_CONDITIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

export function getWeatherCondition(code: number | null): string {
  return code === null ? 'Conditions unavailable' : WEATHER_CONDITIONS[code] ?? 'Conditions unavailable';
}

export function getWeatherAdvisories(forecast: WeatherForecast): WeatherAdvisory[] {
  const days = forecast.daily;
  const rainfallValues = days
    .map((day) => day.precipitationMm)
    .filter((value): value is number => value !== null);
  const temperatureValues = days
    .map((day) => day.maxTemperatureC)
    .filter((value): value is number => value !== null);
  const maxRainfall = rainfallValues.length > 0 ? Math.max(...rainfallValues) : null;
  const maxTemperature = temperatureValues.length > 0 ? Math.max(...temperatureValues) : null;
  const rainyDays = days.filter((day) =>
    (day.precipitationMm !== null && day.precipitationMm > 0) ||
    (day.precipitationProbability !== null && day.precipitationProbability >= 50)
  );
  const drierDays = days.filter((day) =>
    day.precipitationMm !== null &&
    day.precipitationMm <= 1 &&
    (day.precipitationProbability === null || day.precipitationProbability < 50)
  );

  const rainDates = rainyDays.slice(0, 3).map((day) => day.date).join(', ');
  const drierDates = drierDays.slice(0, 3).map((day) => day.date).join(', ');

  return [
    {
      title: 'Irrigation planning',
      severity: 'info',
      message: rainyDays.length > 0
        ? `Rain is forecast on ${rainDates}. Check soil moisture and crop needs before irrigating; forecasts can change.`
        : rainfallValues.length > 0
          ? 'No rainfall is shown in this forecast. Check field moisture and crop requirements before irrigating.'
          : 'Rainfall data is unavailable. Base irrigation on field conditions and local agricultural guidance.',
    },
    {
      title: 'Rainfall preparation',
      severity: maxRainfall !== null && maxRainfall >= 25 ? 'warning' : 'info',
      message: maxRainfall !== null && maxRainfall >= 25
        ? `The forecast shows up to ${maxRainfall.toFixed(1)} mm of rain in a day. Check drainage and local weather alerts; this is not an official warning.`
        : rainyDays.length > 0
          ? 'Rainfall is possible during the forecast period. Check drainage and secure loose equipment.'
          : rainfallValues.length > 0
            ? 'No rain is currently indicated in the forecast period. Continue checking local forecasts.'
            : 'Rainfall data is unavailable. Check official local weather updates.',
    },
    {
      title: 'Harvest timing',
      severity: 'info',
      message: drierDays.length > 0
        ? `Drier forecast days include ${drierDates}. Confirm field conditions close to harvest time.`
        : 'Review the forecast near the planned harvest date and verify conditions in the field.',
    },
    {
      title: 'Spraying weather',
      severity: 'info',
      message: 'Check wind and rain before any application. Avoid spraying during rain or unsafe winds, and follow product labels and local expert advice.',
    },
    {
      title: 'High-temperature precautions',
      severity: maxTemperature !== null && maxTemperature >= 35 ? 'warning' : 'info',
      message: maxTemperature !== null && maxTemperature >= 35
        ? `Temperatures may reach ${maxTemperature.toFixed(1)}°C. Consider worker heat safety and monitor crop water stress; seek local guidance.`
        : maxTemperature !== null
          ? 'Review forecast highs and monitor workers and crops during hot periods.'
          : 'Temperature forecast is unavailable. Check local conditions before field work.',
    },
    {
      title: 'Heavy-rain precautions',
      severity: maxRainfall !== null && maxRainfall >= 25 ? 'warning' : 'info',
      message: maxRainfall !== null && maxRainfall >= 25
        ? 'Monitor official local weather alerts, drainage, and access routes. This forecast does not replace official warnings.'
        : rainyDays.length > 0
          ? 'Rain is possible. Keep checking updated forecasts and local weather alerts.'
          : 'No higher rainfall total is shown in the current forecast; continue monitoring updates.',
    },
  ];
}
