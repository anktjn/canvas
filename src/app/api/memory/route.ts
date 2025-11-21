import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateConversation, loadMessages, saveMessages, listConversations, updateConversationTitle, type PersistedMessage, deleteConversation } from '@/lib/ai/memory';

export const runtime = 'nodejs';

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    // If no id, return list of conversations
    if (!id) {
      if (!isSupabaseConfigured()) {
        return NextResponse.json({ conversations: [] });
      }
      const conversations = await listConversations(50);
      return NextResponse.json({ conversations });
    }
    
    // If id provided, return conversation and messages
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ id, messages: [] });
    }
    const conv = await getOrCreateConversation(id);
    const msgs = await loadMessages(conv.id);
    return NextResponse.json({ id: conv.id, messages: msgs });
  } catch (e) {
    const message = e && typeof (e as { message?: unknown }).message === 'string' ? (e as { message: string }).message : 'unknown';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id: string | undefined = body?.id;
    type IncomingMessage = { 
      id?: string; 
      role: 'user' | 'assistant' | 'system' | 'tool'; 
      text?: string; 
      content?: string; 
      parts?: Array<{ type?: string; text?: string; [key: string]: unknown }> 
    };
    const messages: IncomingMessage[] = Array.isArray(body?.messages) ? (body.messages as IncomingMessage[]) : [];
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    if (!messages.length) return NextResponse.json({ ok: true });

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, id });
    }

    const conv = await getOrCreateConversation(id);

    const toPersist: PersistedMessage[] = messages
      .filter((m) => typeof m?.role === 'string')
      .map((m: IncomingMessage) => ({
        id: String(m.id ?? crypto.randomUUID()),
        role: m.role,
        text:
          typeof m.text === 'string'
            ? m.text
            : typeof m.content === 'string'
            ? m.content
            : Array.isArray(m.parts)
            ? m.parts
                .filter((p) => p?.type === 'text' && typeof p?.text === 'string')
                .map((p) => String(p.text))
                .join('\n')
            : '',
        parts: Array.isArray(m.parts) ? m.parts : undefined, // Store full parts structure
      }));

    await saveMessages(conv.id, toPersist);
    return NextResponse.json({ ok: true, id: conv.id });
  } catch (e) {
    const message = e && typeof (e as { message?: unknown }).message === 'string' ? (e as { message: string }).message : 'unknown';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id: string | undefined = body?.id;
    const title: string | undefined = body?.title;
    
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

    if (isSupabaseConfigured()) {
      await updateConversationTitle(id, title);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e && typeof (e as { message?: unknown }).message === 'string' ? (e as { message: string }).message : 'unknown';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    if (isSupabaseConfigured()) {
      await deleteConversation(id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e && typeof (e as { message?: unknown }).message === 'string' ? (e as { message: string }).message : 'unknown';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


