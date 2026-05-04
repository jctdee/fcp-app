import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { message } = (await req.json()) as { message?: string };

  if (!message || typeof message !== 'string') {
    return NextResponse.json(
      { error: 'message is required' },
      { status: 400 },
    );
  }

  // Demo response. Swap this block for a real LLM call (OpenAI, Anthropic,
  // etc.) when you're ready — keep the { reply: string } response shape.
  const reply = `You said: "${message}". (Wire up app/api/chat/route.ts to a real LLM to make me smarter.)`;

  return NextResponse.json({ reply });
}
