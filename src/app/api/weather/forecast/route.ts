import { z } from 'zod';
import { OpenMeteoForecastResponseSchema } from '@/models/weather';

const latitudeSchema = z.coerce.number().finite().min(-90).max(90);
const longitudeSchema = z.coerce.number().finite().min(-180).max(180);

function valueAt(values: (number | null | undefined)[] | undefined, index: number): number | null {
  return values?.[index] ?? null;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const latitudeValue = searchParams.get('latitude');
  const longitudeValue = searchParams.get('longitude');

  if (!latitudeValue?.trim() || !longitudeValue?.trim()) {
    return Response.json(
      { error: 'Valid latitude and longitude are required.' },
      { status: 400 }
    );
  }

  const latitude = latitudeSchema.safeParse(latitudeValue);
  const longitude = longitudeSchema.safeParse(longitudeValue);

  if (!latitude.success || !longitude.success) {
    return Response.json(
      { error: 'Latitude must be between -90 and 90 and longitude between -180 and 180.' },
      { status: 400 }
    );
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude.data));
  url.searchParams.set('longitude', String(longitude.data));
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m'
  );
  url.searchParams.set(
    'daily',
    'temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,weather_code'
  );
  url.searchParams.set('forecast_days', '7');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('precipitation_unit', 'mm');

  try {
    const response = await fetch(url, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return Response.json(
        { error: 'Weather data is temporarily unavailable. Please try again.' },
        { status: 502 }
      );
    }

    const upstreamData: unknown = await response.json();
    const parsedData = OpenMeteoForecastResponseSchema.safeParse(upstreamData);

    if (!parsedData.success) {
      return Response.json(
        { error: 'The weather service returned invalid data. Please try again.' },
        { status: 502 }
      );
    }

    const { current, daily, timezone } = parsedData.data;
    return Response.json({
      timezone,
      current: {
        time: current.time,
        temperatureC: current.temperature_2m ?? null,
        apparentTemperatureC: current.apparent_temperature ?? null,
        humidityPercent: current.relative_humidity_2m ?? null,
        windSpeedKmh: current.wind_speed_10m ?? null,
        precipitationMm: current.precipitation ?? null,
        weatherCode: current.weather_code ?? null,
      },
      daily: daily.time.slice(0, 7).map((date, index) => ({
        date,
        minTemperatureC: valueAt(daily.temperature_2m_min, index),
        maxTemperatureC: valueAt(daily.temperature_2m_max, index),
        precipitationMm: valueAt(daily.precipitation_sum, index),
        precipitationProbability: valueAt(daily.precipitation_probability_max, index),
        weatherCode: valueAt(daily.weather_code, index),
      })),
    });
  } catch (error: unknown) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return Response.json(
      {
        error: timedOut
          ? 'Weather request timed out. Please try again.'
          : 'Could not reach the weather service. Check your connection and try again.',
      },
      { status: timedOut ? 504 : 502 }
    );
  }
}
