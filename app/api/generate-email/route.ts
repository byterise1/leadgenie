import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: `You are LeadGenie's AI cold email writer. Generate one realistic, personalized cold email based on the user's description.

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
    messages: [{ role: 'user', content: `Write a cold email for: ${query}` }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
  }
}
