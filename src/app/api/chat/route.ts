import { NextRequest } from 'next/server';
import { streamText, convertToModelMessages } from 'ai';
import { getDefaultModel } from '@/lib/ai/model';
import { tools } from '@/lib/ai/tools';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response('OPENAI_API_KEY missing', { status: 500 });
  }

  const { messages } = await req.json();
  const modelMessages = convertToModelMessages(messages, { tools });

  const result = streamText({
    model: getDefaultModel(),
    system:
      'You are a helpful assistant for Josys.\n\nTools:\n- Use the "retrieve" tool only when the user asks about Josys product features, usage, setup, integrations, or other support/documentation topics, or when you need knowledge-base context.\n- When using the retrieve tool, compose a concise, well-structured answer in paragraphs and bullet points. Quote key facts sparingly and include inline citations like [S1], [S2]. Conclude with a short "Sources" section listing the URLs. Do not dump raw data or JSON into the chat.\n- Use the "show_table" tool to present small sets of structured results as a table when it improves readability.\n- Use the "underutilized_licenses_card" tool to present the number of underutilized or inactive licenses, including a short app breakdown when available.\n\nGuidelines: Do NOT call tools for greetings, small talk, or meta conversation—reply directly. Always compose a human-readable answer. Avoid outputting raw JSON. Prefer rendering UI components via tools when it improves readability (e.g., a license utilization card or a small comparison table).',
    messages: modelMessages,
    tools,
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
    originalMessages: messages,
  });
}


