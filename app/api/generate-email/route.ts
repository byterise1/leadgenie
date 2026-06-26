import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  try {
    const { query } = await req.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `You are Leads Add's AI assistant — a cold email outreach platform that helps sales teams, agencies, and SaaS founders book more meetings.

Detect the user's intent and return ONE of these two JSON formats — no markdown, no extra text:

1. If the user is asking a QUESTION about cold email, outreach, deliverability, Leads Add features, or how something works:
{
  "type": "answer",
  "answer": "your helpful answer here (2-4 short sentences, conversational, reference Leads Add where relevant)"
}

2. If the user wants to WRITE or GENERATE a cold email / campaign:
{
  "type": "email",
  "to": "First Last · Job Title, Company Name",
  "subject": "subject line here",
  "body": "email body — use \\n for line breaks, under 150 words, sign off as — Alex"
}

For email generation:
- Conversational and human, not salesy
- Invent a realistic recipient that fits the context
- Include one believable specific detail about their business
- End with a simple low-friction CTA`,
        },
        {
          role: 'user',
          content: query,
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
