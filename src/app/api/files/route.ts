import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractTextFromFile } from '@/lib/rag/ingest/document';
import { splitByParagraphs } from '@/lib/rag/chunk';
import { embedTexts } from '@/lib/rag/embed';
import { SupabaseVectorStore } from '@/lib/rag/vector/supabase';

export const runtime = 'nodejs';

function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function ensureBucket(client: ReturnType<typeof supabaseAdmin>, bucket: string, isPublic = false) {
  // Try to create; ignore if it already exists
  const { error } = await client.storage.createBucket(bucket, { public: isPublic });
  if (error && !/already exists/i.test(error.message)) {
    // If the error is not "already exists", surface it
    throw error;
  }
}

// List files
export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 });
  }
  const { data, error } = await supabaseAdmin().from('files').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ files: data });
}

// Create file (URL or Upload)
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 });
  }

  const contentType = req.headers.get('content-type') || '';
  const client = supabaseAdmin();

  try {
    const store = new SupabaseVectorStore();

    // Multipart: file upload
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });

      // Store raw file in Supabase Storage (bucket: 'kb')
      const bucket = 'kb';
      await ensureBucket(client, bucket, false);
      const storagePath = `${Date.now()}_${encodeURIComponent(file.name)}`;
      const arrayBuffer = await file.arrayBuffer();
      const { error: storageError } = await client.storage.from(bucket).upload(storagePath, new Blob([arrayBuffer]), { contentType: file.type, upsert: false });
      if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 });

      const text = await extractTextFromFile(file);
      const chunks = splitByParagraphs(text);
      const embeddings = await embedTexts(chunks);
      await store.upsertChunks(chunks.map((content, i) => ({ url: `storage://${bucket}/${storagePath}`, content, embedding: embeddings[i] })));

      const { data, error } = await client
        .from('files')
        .insert({
          name: file.name,
          source_type: 'upload',
          storage_path: `${bucket}/${storagePath}`,
          content_type: file.type,
          size_bytes: file.size,
          status: 'ingested',
        })
        .select('*')
        .single();
      if (error) throw error;
      return NextResponse.json({ file: data, chunks: chunks.length });
    }

    // JSON: URL
    const body = await req.json().catch(() => null);
    if (!body || typeof body.url !== 'string' || !body.url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // Reuse existing /api/ingest logic client-side; here we also persist metadata
    const resp = await fetch(new URL('/api/ingest', req.url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: body.url }) });
    const json = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: json?.error || 'failed to ingest url' }, { status: resp.status });

    const { data, error } = await client
      .from('files')
      .insert({ name: body.url, source_type: 'url', url: body.url, status: 'ingested' })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ file: data, chunks: json.chunks });
  } catch (err) {
    const message = err && typeof (err as { message?: unknown }).message === 'string' ? (err as { message: string }).message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Rename or delete
export async function PATCH(req: NextRequest) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 });
  }
  const body = await req.json().catch(() => null);
  if (!body || !body.id || typeof body.name !== 'string') return NextResponse.json({ error: 'id and name required' }, { status: 400 });
  const { data, error } = await supabaseAdmin().from('files').update({ name: body.name }).eq('id', body.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ file: data });
}

// Delete file metadata (note: does not delete vectors; could implement source-url delete later)
export async function DELETE(req: NextRequest) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 });
  }
  const search = new URL(req.url).searchParams;
  const id = search.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const client = supabaseAdmin();

  // Fetch the record to determine source for vector deletion
  const { data: record, error: fetchError } = await client.from('files').select('*').eq('id', id).single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  // If upload with storage path, delete vectors by source URL and optionally delete storage object
  if (record?.source_type === 'upload' && record?.storage_path) {
    try {
      const store = new SupabaseVectorStore();
      await store.deleteByUrl(`storage://${record.storage_path}`);
    } catch (e) {
      // If vector deletion fails, still attempt to proceed
    }
    const [bucket, ...rest] = String(record.storage_path).split('/');
    const storagePath = rest.join('/');
    if (bucket && storagePath) {
      await client.storage.from(bucket).remove([storagePath]);
    }
  }

  // If URL source, delete vectors by URL
  if (record?.source_type === 'url' && record?.url) {
    try {
      const store = new SupabaseVectorStore();
      await store.deleteByUrl(record.url);
    } catch (e) {}
  }

  const { error } = await client.from('files').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}


