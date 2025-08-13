import { z } from 'zod/v4';
import type { Tool } from '@ai-sdk/provider-utils';
import { retrieveFromKnowledgeBase } from '@/lib/rag/retrieve';
import { generateText } from 'ai';
import { getDefaultModel } from './model';
import { fetchUnderutilizedLicensesSummary } from '@/lib/data/licenses';

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
      const snippets = Array.isArray((result as any)?.snippets)
        ? ((result as any).snippets as Array<{ id: string; url: string; content: string; score: number }>)
        : ([] as Array<{ id: string; url: string; content: string; score: number }>);

      // If retrieval failed (embeddings/vector/RPC), degrade gracefully with a small inline note
      if ((result as any)?.error) {
        return {
          ui: {
            type: 'card',
            props: {
              title: 'Retrieval unavailable',
              body: `Knowledge-base context lookup failed. Proceeding without retrieval.\n\n(${(result as any).error})`,
            },
          },
        } as { ui: { type: 'card'; props: { title: string; body: string } } };
      }
      // Compose a concise answer using the model on the server for better UX.
      const model = getDefaultModel();
      const sources = snippets.map((s: { url: string }, i: number) => `S${i + 1}: ${s.url}`).join('\n');
      const context = snippets
        .map((s: { content: string }, i: number) => `[[S${i + 1}]]\n${s.content}`)
        .join('\n\n');
      const prompt = `Answer the user's question concisely using only the context. Add a short bullet list of sources at the end using their labels.\n\nQuestion: ${query}\n\nContext:\n${context}\n\nSources:\n${sources}`;

      let summary = '';
      try {
        const { text } = await generateText({ model, prompt });
        summary = text ?? '';
      } catch {
        summary = '';
      }

      return {
        snippets,
        summary,
      } as {
        snippets: Array<{ id: string; url: string; content: string; score: number }>;
        summary: string;
      };
    },
  } satisfies Tool,

  show_card: {
    description: 'Render a card UI element with a title and body content',
    inputSchema: z.object({ title: z.string(), body: z.string() }),
    execute: async ({ title, body }) => {
      return { ui: { type: 'card', props: { title, body } } } as { ui: { type: 'card'; props: { title: string; body: string } } };
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
        } as any;
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
      const apps = Array.isArray((data as any).topApps)
        ? (data as any).topApps.map((t: any) => ({
            appName: String(t.appName ?? 'Unknown'),
            instanceName: String(t.instanceName ?? '—'),
            accountsCount: Number(t.underutilizedCount ?? 0),
          }))
        : undefined;

      return {
        ui: {
          type: 'underutilized-licenses-card',
          props: {
            organizationName: data.organizationName,
            totalLicenses: data.totalLicenses,
            underutilizedCount: data.underutilizedCount,
            utilizationThresholdPercent: data.utilizationThresholdPercent,
            measurementPeriodDays: data.measurementPeriodDays,
            apps,
            lastUpdatedIso: data.lastUpdatedIso,
            linkToReport: data.linkToReport,
          },
        },
      } as any;
    },
  } satisfies Tool,
};

export type AppTools = typeof tools;


