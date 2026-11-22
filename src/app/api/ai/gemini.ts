import 'server-only';

import { z } from 'zod';

const model = 'gemini-3.5-flash-lite';
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const errorEnvelope = z.object({
  error: z.object({
    message: z.string().optional(),
    details: z.array(z.object({ reason: z.string().optional() })).optional(),
  }),
});
const generation = z.object({
  candidates: z.array(z.object({
    finishReason: z.string().optional(),
    content: z.object({
      parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })),
    }).optional(),
  })).optional(),
});

async function upstreamError(response: Response): Promise<Response> {
  const failure = errorEnvelope.safeParse(await response.json().catch(() => null));
  const details = failure.data?.error;
  const keyError = details?.details?.some(({ reason }) => reason?.startsWith('API_KEY_')) ||
    /api key (?:is )?(?:not valid|invalid|expired|blocked)/i.test(details?.message ?? '');

  if (response.status === 401 || response.status === 403 || keyError) {
    return Response.json({ error: 'Gemini credentials were rejected. Check the server key and project permissions.' }, { status: 503 });
  }
  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    return Response.json({ error: 'Gemini rate limit or quota reached. Try again later.' }, {
      status: 429,
      headers: retryAfter && /^\d+$/.test(retryAfter) ? { 'Retry-After': retryAfter } : undefined,
    });
  }
  if (response.status === 404) {
    return Response.json({ error: 'The Gemini model is unavailable for this project.' }, { status: 503 });
  }
  if (response.status === 503) {
    return Response.json({ error: 'Gemini is temporarily unavailable. Try again later.' }, { status: 503 });
  }
  if (response.status === 504) {
    return Response.json({ error: 'Gemini timed out. Please try again.' }, { status: 504 });
  }
  return Response.json({ error: 'Gemini could not complete the request. Please try again.' }, { status: 502 });
}

export async function generateGeminiJson({
  prompt, systemInstruction, schema, temperature,
}: {
  prompt: string;
  systemInstruction?: string;
  schema: z.ZodType;
  temperature: number;
}): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: 'Gemini is not configured. Set GEMINI_API_KEY on the server.' }, { status: 503 });
  }

  const responseJsonSchema = z.toJSONSchema(schema, { io: 'input' });
  delete responseJsonSchema.$schema;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      cache: 'no-store',
      body: JSON.stringify({
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema, temperature, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return await upstreamError(response);

    const result = generation.safeParse(await response.json().catch(() => null));
    const candidate = result.data?.candidates?.[0];
    const text = candidate?.content?.parts.filter(part => !part.thought).map(part => part.text ?? '').join('');
    if (!text || (candidate?.finishReason && candidate.finishReason !== 'STOP')) {
      return Response.json({ error: 'Gemini returned no complete answer. Try rephrasing your request.' }, { status: 502 });
    }
    let json: unknown;
    try { json = JSON.parse(text); } catch { /* Invalid model output is handled by schema validation. */ }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: 'Gemini returned an unexpected response format. Please try again.' }, { status: 502 });
    }
    return Response.json(parsed.data);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return Response.json(
      { error: timedOut ? 'Gemini timed out. Please try again.' : 'Could not reach Gemini. Please try again.' },
      { status: timedOut ? 504 : 502 },
    );
  }
}
