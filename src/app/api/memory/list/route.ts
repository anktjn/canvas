import { NextRequest, NextResponse } from 'next/server';
import { listConversations } from '@/lib/ai/memory';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.max(1, Math.min(100, Number(limitParam) || 20));
    const list = await listConversations(limit);
    return NextResponse.json({ conversations: list });
  } catch (e) {
    const message = e && typeof (e as { message?: unknown }).message === 'string' ? (e as { message: string }).message : 'unknown';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


