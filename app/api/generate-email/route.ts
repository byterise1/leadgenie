import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `You are LeadGenie's AI cold email writer. Generate one realistic, personalized cold email based on the user's description.

Return ONLY valid JSON — no markdown, no extra text:
{
  "to": "First Last · Job Title, Company Name",
  "subject": "subject line here",
  "body": "email body here — use \\n for line breaks"
}

Rules:
- Under 150 words total
- Conversational and human — not salesy or generic
- Invent a realistic recipient name, title, and company that fits the context
- Include one believable specific detail about their business
- End with a simple, low-friction CTA (short call or quick question)
- Sign off as "— Alex"`,
        },
        {
          role: 'user',
          content: `Write a cold email for: ${query}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? '';

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid format — try again' }, { status: 500 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const isAuthError = msg.includes('401') || msg.includes('auth') || msg.toLowerCase().includes('api key');
    return NextResponse.json(
      { error: isAuthError ? 'Invalid API key — check GROQ_API_KEY in .env.local' : msg },
      { status: 500 }
    );
  }
}
