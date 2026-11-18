import { z } from 'zod';
import { OpenMeteoGeocodingResponseSchema } from '@/models/weather';

const locationQuerySchema = z.string().trim().min(2).max(100);

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q');
  const parsedQuery = locationQuerySchema.safeParse(query);

  if (!parsedQuery.success) {
    return Response.json(
      { error: 'Enter a location with at least 2 characters.' },
      { status: 400 }
    );
  }

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', parsedQuery.data);
  url.searchParams.set('count', '8');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  url.searchParams.set('countryCode', 'IN');

  try {
    const response = await fetch(url, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return Response.json(
        { error: 'Location search is temporarily unavailable. Please try again.' },
        { status: 502 }
      );
    }

    const upstreamData: unknown = await response.json();
    const parsedData = OpenMeteoGeocodingResponseSchema.safeParse(upstreamData);

    if (!parsedData.success) {
      return Response.json(
        { error: 'The location service returned invalid data. Please try again.' },
        { status: 502 }
      );
    }

    const locations = (parsedData.data.results ?? [])
      .filter((location) => location.country_code?.toUpperCase() === 'IN')
      .map((location) => ({
        id: location.id,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        admin1: location.admin1,
        admin2: location.admin2,
        country: location.country,
        countryCode: location.country_code,
        timezone: location.timezone,
      }));

    return Response.json({ locations });
  } catch (error: unknown) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return Response.json(
      {
        error: timedOut
          ? 'Location search timed out. Please try again.'
          : 'Could not reach the location service. Check your connection and try again.',
      },
      { status: timedOut ? 504 : 502 }
    );
  }
}
