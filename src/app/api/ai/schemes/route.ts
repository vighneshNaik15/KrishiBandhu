import { NextRequest } from 'next/server';
import { z } from 'zod';

// ── Schema ────────────────────────────────────────────────────────────────────

const RequestBodySchema = z.object({
  query: z.string().max(500).optional().default(''),
});

const SchemeSchema = z.object({
  name: z.string(),
  description: z.string(),
  eligibility: z.string(),
  link: z.string(),
});

const ResponseSchema = z.object({
  schemes: z.array(SchemeSchema),
  message: z.string(),
});

export type SchemesApiResponse = z.infer<typeof ResponseSchema>;
export type Scheme = z.infer<typeof SchemeSchema>;

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'AI schemes search is not configured. Add GEMINI_API_KEY to your environment.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = RequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { query } = parsed.data;

  const prompt = query.trim()
    ? `You are an expert on agricultural policies and government schemes for farmers in India, especially in the Konkan region (Maharashtra and Goa).

Analyze the user's query: "${query}"
Find the most relevant central or state-level schemes. For each scheme, provide its name, a brief description, key eligibility criteria, and a link if you can find one. If a link is not available, return '#' as the link value.
Start with a friendly message to the user summarizing what you found for their specific query.

Respond ONLY with valid JSON in this exact shape:
{
  "schemes": [
    {
      "name": "<scheme name>",
      "description": "<brief description>",
      "eligibility": "<eligibility criteria>",
      "link": "<URL or '#'>"
    }
  ],
  "message": "<friendly introductory message>"
}`
    : `You are an expert on agricultural policies and government schemes for farmers in India, especially in the Konkan region (Maharashtra and Goa).

The user has not provided a specific query. Find 4-5 of the most important and widely available national-level and Maharashtra/Goa state-level agricultural schemes (e.g., PM-KISAN, PMFBY, Soil Health Card, state schemes for Konkan crops like coconut and mango). For each scheme, provide its name, a brief description, key eligibility criteria, and a link.
Start with a friendly introductory message like "Here are some of the major agricultural schemes currently available for Konkan farmers."

Respond ONLY with valid JSON in this exact shape:
{
  "schemes": [
    {
      "name": "<scheme name>",
      "description": "<brief description>",
      "eligibility": "<eligibility criteria>",
      "link": "<URL or '#'>"
    }
  ],
  "message": "<friendly introductory message>"
}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
            maxOutputTokens: 2048,
          },
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      console.error('Gemini API error:', geminiRes.status, errText);
      return Response.json({ error: 'AI service temporarily unavailable.' }, { status: 502 });
    }

    const geminiData = (await geminiRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!rawText) {
      return Response.json({ error: 'No response from AI.' }, { status: 502 });
    }

    const aiParsed = ResponseSchema.safeParse(JSON.parse(rawText));
    if (!aiParsed.success) {
      console.error('Schemes schema mismatch:', aiParsed.error);
      return Response.json({ error: 'Unexpected AI response format.' }, { status: 502 });
    }

    return Response.json(aiParsed.data);
  } catch (error: unknown) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    console.error('Schemes route error:', error);
    return Response.json(
      { error: timedOut ? 'Request timed out. Please try again.' : 'Schemes search failed. Please try again.' },
      { status: timedOut ? 504 : 502 }
    );
  }
}
