import { z } from 'zod';
import { authorizeAi, readAiJson } from '../access';
import { generateGeminiJson } from '../gemini';

// ── Schema ────────────────────────────────────────────────────────────────────

const RequestBodySchema = z.object({
  query: z.string().max(500).optional().default(''),
});

function governmentLink(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        (url.hostname.endsWith('.gov.in') || url.hostname.endsWith('.nic.in'))) {
      return url.href;
    }
  } catch { /* An invalid model-generated link is omitted. */ }
  return '#';
}

const SchemeSchema = z.object({
  name: z.string(),
  description: z.string(),
  eligibility: z.string(),
  link: z.string().transform(governmentLink),
});

const ResponseSchema = z.object({
  schemes: z.array(SchemeSchema),
  message: z.string(),
});

export type SchemesApiResponse = z.infer<typeof ResponseSchema>;
export type Scheme = z.infer<typeof SchemeSchema>;

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const input = await readAiJson(req);
  if ('error' in input) return input.error;
  const denied = await authorizeAi(req);
  if (denied) return denied;

  const parsed = RequestBodySchema.safeParse(input.body);
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

  return generateGeminiJson({ prompt, schema: ResponseSchema, temperature: 0.4 });
}
