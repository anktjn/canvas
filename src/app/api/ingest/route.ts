import { NextRequest, NextResponse } from 'next/server';
import { extractFromUrl } from '@/lib/rag/ingest/url';
import { splitByParagraphs } from '@/lib/rag/chunk';
import { embedTexts } from '@/lib/rag/embed';
import { SupabaseVectorStore } from '@/lib/rag/vector/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 });
  }
  const { url } = await req.json();
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  const article = await extractFromUrl(url);
  const chunks = splitByParagraphs(article.content);
  const embeddings = await embedTexts(chunks);
  const store = new SupabaseVectorStore();
  await store.upsertChunks(
    chunks.map((content, i) => ({ url, content, embedding: embeddings[i] }))
  );

  return NextResponse.json({ ok: true, chunks: chunks.length });
}


