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
    const { embedding } = await embed({
      model: openai.embedding(DEFAULT_EMBEDDING_MODEL),
      value: query,
    });
    const matches = await getStore().similaritySearch(embedding, k);
    return {
      snippets: matches.map((m) => ({
        id: m.id,
        url: m.url,
        // Trim excessively long snippets to keep model context under control
        content: m.content.length > 1200 ? `${m.content.slice(0, 1200)}…` : m.content,
        score: m.score,
      })),
    } as const;
  } catch (err: any) {
    const message = typeof err?.message === 'string' ? err.message : 'unknown error';
    return { snippets: [], error: `retrieval_failed: ${message}` } as const;
  }
}


