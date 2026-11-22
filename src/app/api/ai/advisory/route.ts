import { z } from 'zod';
import { generateGeminiJson } from '../gemini';

// ── Schema ────────────────────────────────────────────────────────────────────

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const RequestBodySchema = z.object({
  question: z.string().min(1).max(2000),
  language: z.string().optional(),
  farmerContext: z.string().optional(),
  conversationHistory: z.array(MessageSchema).max(20).optional(),
});

const ResponseSchema = z.object({
  answer: z.string(),
  suggestedFollowups: z.array(z.string()).max(3),
  confidence: z.number().min(0).max(1),
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = RequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request.', details: parsed.error.flatten() }, { status: 400 });
  }

  const { question, language = 'English', farmerContext, conversationHistory } = parsed.data;

  // Build conversation history context
  let historyContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    historyContext =
      '\n\n**Previous Conversation:**\n' +
      conversationHistory
        .slice(-6)
        .map((m) => `${m.role === 'user' ? 'Farmer' : 'AI'}: ${m.content}`)
        .join('\n');
  }

  const systemInstruction = `You are an expert AI agronomist assistant for **KrishiBandhu**, an agriculture app for farmers in the Konkan region of India (Maharashtra and Goa).

Your role is to provide:
1. Accurate, actionable farming advice tailored to Konkan agriculture (coconut, arecanut, cashew, mango, rice, spices)
2. Personalized recommendations based on the farmer's specific crops and situation
3. Practical solutions that consider local conditions, monsoon seasons, and available resources

Response Guidelines:
- Be warm, empathetic, and supportive
- Use simple language that is easy to understand
- Give specific, actionable advice with quantities, timings, and methods
- Consider the Indian agricultural context (monsoons, local crops, market cycles, Konkan geography)
- If unsure, say so and suggest consulting a local KVK (Krishi Vigyan Kendra)
- Respond in ${language}

${farmerContext ? `\n**Farmer's Context:**\n${farmerContext}` : ''}${historyContext}`;

  const prompt = `Farmer's Question: "${question}"

Please provide a helpful, detailed answer. Also suggest up to 3 follow-up questions they might want to ask.

Respond ONLY with valid JSON in this exact shape:
{
  "answer": "<your answer here>",
  "suggestedFollowups": ["<followup 1>", "<followup 2>", "<followup 3>"],
  "confidence": <0.0 to 1.0>
}`;

  return generateGeminiJson({ prompt, systemInstruction, schema: ResponseSchema, temperature: 0.7 });
}
