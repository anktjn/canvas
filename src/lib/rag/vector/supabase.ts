import { createClient } from '@supabase/supabase-js';
import type { KnowledgeStore, SimilarityMatch } from '../knowledge-store';

export class SupabaseVectorStore implements KnowledgeStore {
  private client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  private table = 'documents';

  async upsertChunks(chunks: { url: string; content: string; embedding: number[] }[]): Promise<{ ids: string[] }> {
    const rows = chunks.map((c) => ({ url: c.url, content: c.content, embedding: c.embedding }));
    const { data, error } = await this.client.from(this.table).insert(rows).select('id');
    if (error) throw error;
    return { ids: (data as Array<{ id: number }> | null)?.map((d) => String(d.id)) ?? [] };
  }

  async similaritySearch(embedding: number[], k: number): Promise<SimilarityMatch[]> {
    const { data, error } = await this.client.rpc('match_documents', {
      query_embedding: embedding,
      match_count: k,
    });
    if (error) throw error;
    return ((data as Array<{ id: number; url: string; content: string; score: number }> | null) ?? []).map(
      (row) => ({ id: String(row.id), url: row.url, content: row.content, score: row.score })
    );
  }
}


