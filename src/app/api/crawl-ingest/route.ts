import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'node-html-parser';
import { extractFromUrl } from '@/lib/rag/ingest/url';
import { splitByParagraphs } from '@/lib/rag/chunk';
import { embedTexts } from '@/lib/rag/embed';
import { SupabaseVectorStore } from '@/lib/rag/vector/supabase';

export const runtime = 'nodejs';

type CrawlRequest = {
  baseUrl: string;
  pathPrefix?: string; // restrict to URLs starting with this path
  sameOrigin?: boolean; // restrict to same hostname (default true)
  maxPages?: number; // default 200
  maxDepth?: number; // default 3
};

function normalizeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

function isAllowedUrl(target: URL, base: URL, pathPrefix?: string, sameOrigin = true) {
  if (sameOrigin && target.hostname !== base.hostname) return false;
  if (pathPrefix) {
    const normalizedPrefix = pathPrefix.startsWith('/') ? pathPrefix : `/${pathPrefix}`;
    if (!target.pathname.startsWith(normalizedPrefix)) return false;
  } else {
    // Default: keep inside base path
    if (!target.pathname.startsWith(base.pathname)) return false;
  }
  return true;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'canvas-ingestor/1.0' } });
    if (!res.ok) return null;
    const text = await res.text();
    return text;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CrawlRequest;
  const { baseUrl, pathPrefix, sameOrigin = true, maxPages = 200, maxDepth = 3 } = body || {};

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 500 });
  }
  if (!baseUrl || typeof baseUrl !== 'string') {
    return NextResponse.json({ error: 'Missing baseUrl' }, { status: 400 });
  }

  const base = normalizeUrl(baseUrl);
  if (!base) return NextResponse.json({ error: 'Invalid baseUrl' }, { status: 400 });
  const baseURL = new URL(base);

  const queue: Array<{ url: string; depth: number } > = [{ url: base, depth: 0 }];
  const seen = new Set<string>([base]);
  const toIngest: string[] = [];

  while (queue.length && toIngest.length < maxPages) {
    const { url, depth } = queue.shift()!;

    toIngest.push(url);
    if (depth >= maxDepth) continue;

    const html = await fetchHtml(url);
    if (!html) continue;
    const root = parse(html);
    const anchors = root.querySelectorAll('a');
    for (const a of anchors) {
      const href = a.getAttribute('href');
      if (!href) continue;
      let abs: string | null = null;
      try {
        abs = new URL(href, url).toString();
      } catch {
        continue;
      }
      if (!abs) continue;
      const normalized = normalizeUrl(abs);
      if (!normalized || seen.has(normalized)) continue;
      const targetURL = new URL(normalized);
      if (!isAllowedUrl(targetURL, baseURL, pathPrefix, sameOrigin)) continue;
      seen.add(normalized);
      if (seen.size > maxPages * 3) continue; // simple guardrail
      queue.push({ url: normalized, depth: depth + 1 });
    }
  }

  const store = new SupabaseVectorStore();
  let pagesIngested = 0;
  let chunksTotal = 0;
  const errors: Array<{ url: string; error: string }> = [];

  for (const url of toIngest) {
    try {
      const article = await extractFromUrl(url);
      if (!article.content || article.content.length < 20) continue;
      const chunks = splitByParagraphs(article.content);
      if (chunks.length === 0) continue;
      const embeddings = await embedTexts(chunks);
      await store.upsertChunks(chunks.map((content, i) => ({ url, content, embedding: embeddings[i] })));
      pagesIngested += 1;
      chunksTotal += chunks.length;
    } catch (e: any) {
      errors.push({ url, error: e?.message ?? 'unknown' });
    }
  }

  return NextResponse.json({
    ok: true,
    baseUrl: base,
    discovered: seen.size,
    queued: toIngest.length,
    pagesIngested,
    chunksTotal,
    errors,
  });
}


