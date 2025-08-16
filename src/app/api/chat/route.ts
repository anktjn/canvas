import { NextRequest } from 'next/server';
import { streamText, convertToModelMessages } from 'ai';
import { getDefaultModel } from '@/lib/ai/model';
import { tools } from '@/lib/ai/tools';
import { getOrCreateConversation, saveMessages } from '@/lib/ai/memory';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response('OPENAI_API_KEY missing', { status: 500 });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Chat can still work without retrieval/tools that use Supabase, but our retrieve tool depends on it.
    // Return a 500 to avoid runtime crashes during build-time data collection.
    return new Response('Supabase env missing', { status: 500 });
  }
  const { messages, id: conversationId } = await req.json();
  // Convert UI messages from the client into model messages expected by streamText
  const modelMessages = convertToModelMessages(messages, { tools });

  const result = streamText({
    model: getDefaultModel(),
    system:
      'You are a helpful assistant for Josys.\n\nTools:\n- Use the "retrieve" tool only when the user asks about Josys product features, usage, setup, integrations, or other support/documentation topics, or when you need knowledge-base context.\n- When using the retrieve tool, use the returned snippets to craft a comprehensive answer. Include the key information from the snippets and add a "Sources:" section at the end listing the source URLs (S1, S2, etc.).\n- Use the "show_table" tool to present small sets of structured results as a table.\n- Use the "underutilized_licenses_card" tool to present the number of underutilized or inactive licenses, including a short app breakdown when available.\n\nGuidelines: Do NOT call tools for greetings, small talk, or meta conversation—reply directly. When you use retrieval, craft a concise, grounded answer using the snippets data and list short sources at the end. Prefer rendering UI components via tools when it improves readability (e.g., a license utilization card or a small comparison table).',
    messages: modelMessages,
    tools,
  });

  // Persist messages when the stream finishes. This uses AI SDK onFinish hook via .merge() helper on the response.
  const response = result.toUIMessageStreamResponse();

  return response;
}


