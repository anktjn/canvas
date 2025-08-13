import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

/**
 * Factory for creating the default LLM used by the chat API.
 * Swap model/provider here without touching the rest of the app.
 */
export function getDefaultModel(): LanguageModel {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // Choose a capable reasoning/chat model; update as needed.
  return openai('gpt-4o-mini');
}

/** Embedding model id used for vector storage (1536 dims for small). */
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';


