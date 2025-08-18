import { z } from 'zod/v4';
import type { Tool } from '@ai-sdk/provider-utils';
import { retrieveFromKnowledgeBase } from '@/lib/rag/retrieve';
import { fetchUnderutilizedLicensesSummary } from '@/lib/data/licenses';
import { generateText } from 'ai';
import { getDefaultModel } from '@/lib/ai/model';

export type UIToolResponse = {
  ui?: { type: string; props?: Record<string, unknown> };
  text?: string;
};

/**
 * Example UI tools and retrieval tool. Add more tools here.
 */
export const tools = {
  retrieve: {
    description: 'Retrieve top-k context snippets from the knowledge base for a query',
    inputSchema: z.object({ query: z.string(), k: z.number().int().min(1).max(10).default(3) }),
    execute: async ({ query, k }) => {
      const result = await retrieveFromKnowledgeBase(query, k);
      type Snippet = { id: string; url: string; title?: string; content: string; score: number };
      const snippets: Snippet[] = Array.isArray((result as { snippets?: Snippet[] })?.snippets)
        ? ((result as { snippets: Snippet[] }).snippets)
        : ([] as Snippet[]);

      // If retrieval failed (embeddings/vector/RPC), degrade gracefully with a small inline note
      if ((result as { error?: string })?.error) {
        return {
          ui: {
            type: 'card',
            props: {
              title: 'Retrieval unavailable',
              body: `Knowledge-base context lookup failed. Proceeding without retrieval.\n\n(${(result as { error?: string }).error})`,
            },
          },
        } as { ui: { type: 'card'; props: { title: string; body: string } } };
      }

      // If nothing found, return a small info card so the UI never appears empty
      if (snippets.length === 0) {
        return {
          ui: {
            type: 'card',
            props: {
              title: 'No knowledge-base results',
              body: 'I could not find relevant Josys docs for this question. Try rephrasing or asking a more specific question.',
            },
          },
        } as { ui: { type: 'card'; props: { title: string; body: string } } };
      }

      // Provide a compact sources list for rendering citations/Sources UI
      const sources = snippets.map((s, i): { id: string; url: string; label: string; title?: string } => ({
        id: s.id,
        url: s.url,
        title: s.title,
        label: `S${i + 1}`,
      }));

      // Fallback: If the model does not compose an answer on its own, provide a concise summary
      // synthesized from retrieved snippets. This guarantees that users see an answer plus sources.
      let summary: string | undefined;
      try {
        if (snippets.length > 0) {
          const context = snippets
            .map((s, i) => `[S${i + 1}] ${s.content}`)
            .join('\n\n');
          const { text } = await generateText({
            model: getDefaultModel(),
            temperature: 0.2,
            system:
              'You are a helpful assistant for Josys. Using only the provided context snippets, write a short, accurate answer. Use clear bullets where helpful and avoid speculation. Include bracket citations like [S1], [S2] inline where facts come from. Keep it under 180 words.',
            prompt: `User question: "${query}"\n\nContext snippets:\n${context}\n\nWrite the answer now.`,
          });
          summary = text;
        }
      } catch {
        // Ignore summarization errors; still return sources/snippets
      }

      return {
        snippets,
        sources,
        ...(summary ? { summary } : {}),
      } as {
        snippets: Snippet[];
        sources: Array<{ id: string; url: string; title?: string; label: string }>;
        summary?: string;
      };
    },
  } satisfies Tool,



  show_table: {
    description: 'Render a table with columns and rows',
    inputSchema: z.object({ columns: z.array(z.string()), rows: z.array(z.record(z.string(), z.unknown())) }),
    execute: async ({ columns, rows }) => {
      return {
        ui: { type: 'table', props: { columns, rows } },
      } as { ui: { type: 'table'; props: { columns: string[]; rows: Array<Record<string, unknown>> } } };
    },
  } satisfies Tool,

  underutilized_licenses_card: {
    description:
      'Show a card with underutilized license counts. Use when the user asks about number of underutilized or inactive licenses.',
    // Let the model request parameters needed to fetch from the platform provider.
    // We purposely do NOT accept raw counts here to avoid hardcoding; the tool fetches data.
    inputSchema: z.object({
      organizationName: z.string().optional(),
      utilizationThresholdPercent: z.number().min(0).max(100).default(20),
      measurementPeriodDays: z.number().int().positive().default(30),
      topKApps: z.number().int().min(1).max(10).default(5),
    }),
    execute: async ({ organizationName, utilizationThresholdPercent, measurementPeriodDays, topKApps }) => {
      // If no provider is configured yet, return a sample UI payload for testing
      if (!process.env.LICENSES_API_URL) {
        const apps = [
          { appName: 'Gemini', instanceName: 'myInstance01', iconUrl: '/figma-assets/4c045ec501d4834ad96bcf5633af22a2536b2ac2.svg', accountsCount: 5 },
          { appName: 'Cursor', instanceName: 'myInstance01', iconUrl: '/figma-assets/c295673b2406ae3e73bb83a0587a421f49bef263.svg', accountsCount: 2 },
          { appName: 'Perplexity', instanceName: 'myInstance01', iconUrl: '/figma-assets/ffb63b26d6a620af59d89c4a1b3d09549f668aba.svg', accountsCount: 4 },
          { appName: 'Claude', instanceName: 'myInstance01', iconUrl: '/figma-assets/53fd8543116936d4ecefaf0e0d43e66f11d22582.svg', accountsCount: 1 },
          { appName: 'Suno.ai', instanceName: 'myInstance01', iconUrl: '/figma-assets/0a1889b7c0927cec8d4a7d75f9b7cdb7419f730c.svg', accountsCount: 8 },
        ];
        const underutilizedCount = apps.reduce((sum, a) => sum + a.accountsCount, 0);
        const totalLicenses = 100; // sample denominator for percentage
        return {
          ui: {
            type: 'underutilized-licenses-card',
            props: {
              organizationName,
              totalLicenses,
              underutilizedCount,
              utilizationThresholdPercent,
              measurementPeriodDays,
              apps,
              lastUpdatedIso: new Date().toISOString(),
              linkToReport: '#',
            },
          },
        } as { ui: { type: 'underutilized-licenses-card'; props: Record<string, unknown> } };
      }

      const { data, error } = await fetchUnderutilizedLicensesSummary({
        organizationName,
        utilizationThresholdPercent,
        measurementPeriodDays,
        topKApps,
      });

      if (error || !data) {
        return {
          ui: {
            type: 'card',
            props: {
              title: 'Underutilized Licenses',
              body: `Unable to fetch license utilization at the moment. Please try again.\n\n(${error || 'No data'})`,
            },
          },
        } as { ui: { type: 'card'; props: { title: string; body: string } } };
      }

      // Map provider data into card props; where detailed fields are missing, provide reasonable defaults
      type ProviderApp = { appName?: unknown; instanceName?: unknown; underutilizedCount?: unknown };
      type ProviderData = {
        organizationName: string;
        totalLicenses: number;
        underutilizedCount: number;
        utilizationThresholdPercent: number;
        measurementPeriodDays: number;
        topApps?: ProviderApp[];
        lastUpdatedIso: string;
        linkToReport: string;
      };
      const provider = data as ProviderData;
      const apps = Array.isArray(provider.topApps)
        ? provider.topApps.map((t) => ({
            appName: String(t.appName ?? 'Unknown'),
            instanceName: String(t.instanceName ?? '—'),
            accountsCount: Number(t.underutilizedCount ?? 0),
          }))
        : undefined;

      return {
        ui: {
          type: 'underutilized-licenses-card',
          props: {
            organizationName: provider.organizationName,
            totalLicenses: provider.totalLicenses,
            underutilizedCount: provider.underutilizedCount,
            utilizationThresholdPercent: provider.utilizationThresholdPercent,
            measurementPeriodDays: provider.measurementPeriodDays,
            apps,
            lastUpdatedIso: provider.lastUpdatedIso,
            linkToReport: provider.linkToReport,
          },
        },
      } as { ui: { type: 'underutilized-licenses-card'; props: Record<string, unknown> } };
    },
  } satisfies Tool,
};

export type AppTools = typeof tools;


