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
      'You are a helpful assistant for Josys.\n\nTools:\n- Use the "retrieve" tool only when the user asks about Josys product features, usage, setup, integrations, or other support/documentation topics, or when you need knowledge-base context.\n- When using the retrieve tool, compose a concise, well-structured answer in paragraphs and bullet points. Quote key facts sparingly and include inline citations like [S1], [S2]. Conclude with a short "Sources" section listing the URLs. Do not dump raw data or JSON into the chat.\n- Use the "show_table" tool to present small sets of structured results as a table when it improves readability.\n- Use the "show_chart" tool to visualize numeric comparisons or trends (bar, line, pie). This is preferred over tables for data visualization.\n- Use the "underutilized_licenses_card" tool to present the number of underutilized or inactive licenses, including a short app breakdown when available.\n- Use the "user_profiles_card" tool to present user profile statistics including total users, active/inactive counts, department breakdown, and top users when the user asks about user statistics, employee counts, or department distribution.\n- Use the "user_profiles_list" tool to show a list of specific users when the user asks to list, show, find, or search for users. Use filters like department, status, category, location, app count (e.g., "more than 10 apps" = minApps: 11, "at least 10 apps" = minApps: 10), or search terms.\n- Use the "discovered_apps_list" tool to show a list of discovered apps when the user asks to list, show, find, or search for discovered apps. Supports filtering by app type, status, risk level, category, source, account count, or search terms.\n- Use the "deactivate_user" tool to handle requests to suspend or disable a user account.\n\nGuidelines: Do NOT call tools for greetings, small talk, or meta conversation—reply directly. Always compose a human-readable answer. Avoid outputting raw JSON. Prefer rendering UI components via tools when it improves readability (e.g., a license utilization card, user statistics card, user list, discovered apps list, charts, or a small comparison table).',
    messages: modelMessages,
    tools,
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
    originalMessages: messages,
  });
}
