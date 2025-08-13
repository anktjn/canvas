import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateConversation, loadMessages, saveMessages, type PersistedMessage } from '@/lib/ai/memory';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const conv = await getOrCreateConversation(id);
    const msgs = await loadMessages(conv.id);
    return NextResponse.json({ id: conv.id, messages: msgs });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id: string | undefined = body?.id;
    const messages: Array<any> = Array.isArray(body?.messages) ? body.messages : [];
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    if (!messages.length) return NextResponse.json({ ok: true });

    const conv = await getOrCreateConversation(id);

    const toPersist: PersistedMessage[] = messages
      .filter((m) => typeof m?.role === 'string')
      .map((m) => ({
        id: String(m.id ?? crypto.randomUUID()),
        role: m.role,
        text:
          typeof m.text === 'string'
            ? m.text
            : typeof m.content === 'string'
            ? m.content
            : Array.isArray(m.parts)
            ? m.parts
                .filter((p: any) => p?.type === 'text' && typeof p?.text === 'string')
                .map((p: any) => p.text)
                .join('\n')
            : '',
      }));

    await saveMessages(conv.id, toPersist);
    return NextResponse.json({ ok: true, id: conv.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 });
  }
}


