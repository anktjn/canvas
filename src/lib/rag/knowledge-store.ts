export type EmbeddedChunk = {
  id: string;
  url: string;
  content: string;
  embedding: number[];
};

export type SimilarityMatch = {
  id: string;
  url: string;
  content: string;
  score: number;
};

export interface KnowledgeStore {
  upsertChunks(chunks: Omit<EmbeddedChunk, 'id'>[]): Promise<{ ids: string[] }>; 
  similaritySearch(embedding: number[], k: number): Promise<SimilarityMatch[]>;
  deleteByUrl?(url: string): Promise<void>;
}


