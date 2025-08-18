import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { generateObject } from 'ai';
import { getDefaultModel } from '@/lib/ai/model';

const InputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']).default('user'),
        text: z.string().trim().min(0).default(''),
      })
    )
    .optional(),
  context: z.string().optional(),
  count: z.number().int().min(1).max(3).optional(),
});

const OutputSchema = z.object({
  suggestions: z.array(z.string().trim().min(3)).min(1).max(3),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const input = InputSchema.parse(json ?? {});

    const count = Math.min(3, Math.max(1, input.count ?? 3));
    const recent = Array.isArray(input.messages)
      ? input.messages
          .slice(-10)
          .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
          .join('\n')
      : '';

    const system = [
      'You generate short, helpful, clickable chat suggestions for an enterprise AI assistant called Canvas AI.',
      'Each suggestion must be a concise, standalone prompt the user could send next.',
      'Avoid code blocks, apologies, or meta comments. Prefer action-oriented phrasing.',
      'Keep each suggestion under 40 characters. Vary phrasings and topics slightly.',
    ].join(' ');

    const contextBlock = [
      input.context ? `Context: ${input.context}` : null,
      recent ? `Recent conversation (most recent last):\n${recent}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    const { object } = await generateObject({
      model: getDefaultModel(),
      temperature: 0.3,
      system,
      prompt: [
        'Generate intelligent next-step suggestions tailored to the user and conversation.',
        `Return exactly ${count} items as JSON using the provided schema.`,
        contextBlock || 'No prior messages.',
      ]
        .filter(Boolean)
        .join('\n\n'),
      schema: OutputSchema,
    });

    const list = Array.isArray(object?.suggestions)
      ? (object.suggestions as string[]).slice(0, 3)
      : [];

    return NextResponse.json({ suggestions: list }, { status: 200 });
  } catch (err) {
    // Fallback: return a safe default list to avoid breaking the UI
    return NextResponse.json(
      {
        suggestions: [
          'Summarize our latest product update',
          'Show underutilized licenses',
          'What does our SSO setup require?',
        ],
      },
      { status: 200 }
    );
  }
}


