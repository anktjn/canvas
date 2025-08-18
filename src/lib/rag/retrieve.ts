import { SupabaseVectorStore } from './vector/supabase';
import { createOpenAI } from '@ai-sdk/openai';
import { embed } from 'ai';
import { DEFAULT_EMBEDDING_MODEL } from '../ai/model';

let store: SupabaseVectorStore | null = null;
function getStore() {
  if (!store) store = new SupabaseVectorStore();
  return store;
}

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function retrieveFromKnowledgeBase(query: string, k = 3) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { snippets: [], error: 'supabase_not_configured' } as const;
    }
    const { embedding } = await embed({
      model: openai.embedding(DEFAULT_EMBEDDING_MODEL),
      value: query,
    });
    const matches = await getStore().similaritySearch(embedding, k);
    return {
      snippets: matches.map((m) => {
        let title: string | undefined;
        try {
          title = new URL(m.url).hostname;
        } catch {}
        return {
          id: m.id,
          url: m.url,
          title,
          // Trim excessively long snippets to keep model context under control
          content: m.content.length > 1200 ? `${m.content.slice(0, 1200)}…` : m.content,
          score: m.score,
        };
      }),
    } as const;
  } catch (err) {
    const message = err && typeof (err as { message?: unknown }).message === 'string' ? (err as { message: string }).message : 'unknown error';
    return { snippets: [], error: `retrieval_failed: ${message}` } as const;
  }
}


