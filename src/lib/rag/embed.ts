import { createOpenAI } from '@ai-sdk/openai';
import { embedMany } from 'ai';
import { DEFAULT_EMBEDDING_MODEL } from '../ai/model';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const { embeddings } = await embedMany({
    model: openai.embedding(DEFAULT_EMBEDDING_MODEL),
    values: texts,
  });
  type EmbeddingRecord = { embedding: number[] } | number[];
  return embeddings.map((e: EmbeddingRecord) => (Array.isArray(e) ? e : e.embedding));
}


