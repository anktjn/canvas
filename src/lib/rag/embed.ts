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
  return embeddings.map((e) => (e as any).embedding ?? e) as number[][];
}


