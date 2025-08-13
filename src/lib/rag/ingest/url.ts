import { extract } from '@extractus/article-extractor';

export type ExtractedArticle = {
  url: string;
  title?: string | null;
  content: string;
};
export async function extractFromUrl(url: string): Promise<ExtractedArticle> {
  const result = await extract(url);
  const content = (result?.content || '').trim();
  return { url, title: result?.title ?? null, content };
}


