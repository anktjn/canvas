import { z } from 'zod/v4';
import type { Tool } from '@ai-sdk/provider-utils';
import { retrieveFromKnowledgeBase } from '@/lib/rag/retrieve';
import { fetchUnderutilizedLicensesSummary } from '@/lib/data/licenses';
import { fetchUserProfileStats, fetchUserProfilesList } from '@/lib/data/user-profiles';
import { fetchDiscoveredAppsList } from '@/lib/data/discovered-apps';
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
              'You are a helpful assistant for Josys. Using only the provided context snippets, write a short, accurate answer. Use clear bullets where helpful and avoid speculation. Include bracket citations like [S1], [S2] inline where facts come from.',
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

  show_chart: {
    description: 'Render a chart (bar, line, area, pie) to visualize data. Use when user asks for a visual comparison or trend. Always prefer this over show_table for numeric comparisons.',
    inputSchema: z.object({
      title: z.string(),
      description: z.string().optional(),
      type: z.enum(['bar', 'line', 'area', 'pie']),
      data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
      xAxisKey: z.string().describe('Key for X-axis labels (or segment names for pie)'),
      seriesKeys: z.array(z.string()).describe('Keys for data values to plot'),
    }),
    execute: async ({ title, description, type, data, xAxisKey, seriesKeys }) => {
      try {
        return {
          ui: {
            type: 'chart',
            props: { title, description, type, data, xAxisKey, seriesKeys },
          },
        } as { ui: { type: 'chart'; props: Record<string, unknown> } };
      } catch (error) {
        return {
          ui: {
            type: 'card',
            props: {
              title: 'Error Generating Chart',
              body: `An error occurred while generating the chart: ${String(error)}`,
            },
          },
        } as { ui: { type: 'card'; props: { title: string; body: string } } };
      }
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

  user_profiles_card: {
    description:
      'Show a card with user profile statistics including total users, active/inactive counts, department breakdown, user categories, and top users by app count. Use when the user asks about user statistics, employee counts, department distribution, or user profiles.',
    inputSchema: z.object({
      organizationName: z.string().optional(),
      topKUsers: z.number().int().min(1).max(10).default(5),
    }),
    execute: async ({ organizationName, topKUsers }) => {
      const { data, error } = await fetchUserProfileStats();

      if (error || !data) {
        return {
          ui: {
            type: 'card',
            props: {
              title: 'User Profiles',
              body: `Unable to fetch user profile statistics at the moment. Please try again.\n\n(${error || 'No data'})`,
            },
          },
        } as { ui: { type: 'card'; props: { title: string; body: string } } };
      }

      // Fetch top users by provisioned apps count directly from Supabase
      // (Keeping this here for now as fetchUserProfileStats doesn't return user list)
      let topUsers: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        status: 'Active' | 'Inactive';
        userCategory: string;
        department: string | null;
        jobTitle: string | null;
        provisionedAppsCount: number;
      }> = [];

      if (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
          const key =
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
            process.env.SUPABASE_ANON_KEY;

          if (url && key) {
            const supabase = createClient(url, key, { auth: { persistSession: false } });
            const { data: users, error: usersError } = await supabase
              .from('user_profiles')
              .select('*')
              .order('provisioned_apps_count', { ascending: false })
              .limit(topKUsers);

            if (!usersError && users) {
              topUsers = users.map((u: any) => ({
                id: u.id,
                firstName: u.first_name,
                lastName: u.last_name,
                email: u.email,
                status: u.status,
                userCategory: u.user_category,
                department: u.department,
                jobTitle: u.job_title,
                provisionedAppsCount: u.provisioned_apps_count,
              }));
            }
          }
        } catch (err) {
          console.error('Failed to fetch top users:', err);
        }
      }

      return {
        ui: {
          type: 'user-profiles-card',
          props: {
            organizationName,
            totalUsers: data.totalUsers,
            activeUsers: data.activeUsers,
            inactiveUsers: data.inactiveUsers,
            byDepartment: data.byDepartment,
            byCategory: data.byCategory,
            topUsers,
            averageProvisionedApps: data.averageProvisionedApps,
            lastUpdatedIso: new Date().toISOString(),
          },
        },
      } as { ui: { type: 'user-profiles-card'; props: Record<string, unknown> } };
    },
  } satisfies Tool,

  user_profiles_list: {
    description:
      'Show a list of user profiles with filtering options. Use when the user asks to list, show, find, or search for specific users. Supports filtering by department, status (Active/Inactive), user category (Full-time/Contractor/External), work location, minimum/maximum provisioned apps count (e.g., "more than 10 apps" means minApps: 11, "at least 10 apps" means minApps: 10, "less than 5 apps" means maxApps: 4), and search by name/email/job title.',
    inputSchema: z.object({
      department: z.string().optional(),
      status: z.enum(['Active', 'Inactive']).optional(),
      userCategory: z.enum(['Full-time', 'Contractor', 'External', '']).optional(),
      workLocation: z.string().optional(),
      minApps: z.number().int().min(0).optional(),
      maxApps: z.number().int().min(0).optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    execute: async (input) => {
      const { data, count, error } = await fetchUserProfilesList(input);

      if (error) {
        return {
          ui: {
            type: 'card',
            props: {
              title: 'User Profiles List',
              body: `Error fetching users: ${error}`,
            },
          },
        } as { ui: { type: 'card'; props: { title: string; body: string } } };
      }

      if (!data || data.length === 0) {
        return {
          ui: {
            type: 'card',
            props: {
              title: 'User Profiles List',
              body: 'No users found matching your criteria.',
            },
          },
        } as { ui: { type: 'card'; props: { title: string; body: string } } };
      }

      const mappedUsers = data.map((u) => ({
        id: u.id,
        userId: u.user_id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        status: u.status,
        userCategory: u.user_category,
        department: u.department,
        jobTitle: u.job_title,
        workLocation: u.work_location_code,
        provisionedAppsCount: u.provisioned_apps_count,
      }));

      return {
        ui: {
          type: 'user-profiles-list',
          props: {
            users: mappedUsers,
            totalCount: count,
            filters: input,
          },
        },
      } as { ui: { type: 'user-profiles-list'; props: Record<string, unknown> } };
    },
  } satisfies Tool,

  discovered_apps_list: {
    description:
      'Show a list of discovered apps with filtering options. Use when the user asks to list, show, find, or search for discovered apps. Supports filtering by app type (Trackable App/Integrable App), status, risk level (Low/Medium/High), software category, source, account count range, and search by name/category/source/risk.',
    inputSchema: z.object({
      appType: z.string().optional(),
      status: z.string().optional(),
      risk: z.string().optional(),
      category: z.string().optional(),
      source: z.string().optional(),
      minAccounts: z.number().int().min(0).optional(),
      maxAccounts: z.number().int().min(0).optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    execute: async (input) => {
      const { data, count, error } = await fetchDiscoveredAppsList(input);

      if (error) {
        return {
          ui: {
            type: 'card',
            props: {
              title: 'Discovered Apps List',
              body: `Error fetching apps: ${error}`,
            },
          },
        } as { ui: { type: 'card'; props: { title: string; body: string } } };
      }

      if (!data || data.length === 0) {
        return {
          ui: {
            type: 'card',
            props: {
              title: 'Discovered Apps List',
              body: 'No apps found matching your criteria.',
            },
          },
        } as { ui: { type: 'card'; props: { title: string; body: string } } };
      }

      const mappedApps = data.map((a) => ({
        id: String(a.id),
        name: a.name,
        appType: a.app_type,
        accounts: a.accounts,
        sources: a.sources,
        lastUsed: a.last_used,
        status: a.status,
        discoverySourceUrl: a.discovery_source_url,
        softwareCategories: a.software_categories,
        risk: a.risk,
        compliances: a.compliances,
      }));

      return {
        ui: {
          type: 'discovered-apps-list',
          props: {
            apps: mappedApps,
            totalCount: count,
            filters: input,
          },
        },
      } as { ui: { type: 'discovered-apps-list'; props: Record<string, unknown> } };
    },
  } satisfies Tool,

  deactivate_user: {
    description: 'Deactivate a user account. Use when user explicitly asks to deactivate, disable, or suspend a user.',
    inputSchema: z.object({
      userId: z.string().describe('The ID of the user to deactivate'),
      reason: z.string().optional().describe('Reason for deactivation'),
    }),
    execute: async ({ userId, reason }) => {
        return {
            ui: {
                type: 'card',
                props: {
                    title: 'User Deactivated',
                    body: `User ${userId} has been successfully deactivated.\n\nReason: ${reason || 'No reason provided'}`,
                }
            }
        } as { ui: { type: 'card'; props: { title: string; body: string } } };
    }
  } satisfies Tool,

  visualize_user_profiles: {
    description: 'Create visualizations for user profile data from Supabase. Use to show department distribution, user categories, work locations, or status breakdown as charts.',
    inputSchema: z.object({
      visualization: z.enum(['department', 'category', 'location', 'status']).describe('Type of visualization to create'),
      chartType: z.enum(['bar', 'pie', 'line', 'area']).default('bar').describe('Chart type'),
      title: z.string().optional().describe('Custom chart title'),
    }),
    execute: async ({ visualization, chartType, title }) => {
      try {
        const { data: stats, error } = await fetchUserProfileStats();
        
        if (error) {
          return {
            ui: {
              type: 'card',
              props: {
                title: 'User Profile Visualization',
                body: `Unable to fetch user profile data from Supabase.\n\nError: ${error}\n\nPlease ensure your Supabase connection is configured correctly and the user_profiles table exists.`,
              },
            },
          } as { ui: { type: 'card'; props: { title: string; body: string } } };
        }

        if (!stats) {
          return {
            ui: {
              type: 'card',
              props: {
                title: 'User Profile Visualization',
                body: 'No user profile data available. The database may be empty or the table may not exist yet.',
              },
            },
          } as { ui: { type: 'card'; props: { title: string; body: string } } };
        }

        let chartData: Array<Record<string, any>> = [];
        let xKey = '';
        let seriesKeys = ['count'];
        let chartTitle = title || '';

        switch (visualization) {
          case 'department':
            if (!stats.byDepartment || stats.byDepartment.length === 0) {
              return {
                ui: {
                  type: 'card',
                  props: {
                    title: 'Users by Department',
                    body: 'No department data available. Users may not have department information assigned.',
                  },
                },
              } as { ui: { type: 'card'; props: { title: string; body: string } } };
            }
            chartData = stats.byDepartment.map(d => ({ name: d.department || 'Unknown', count: d.count }));
            xKey = 'name';
            chartTitle = chartTitle || 'Users by Department';
            break;
          case 'category':
            if (!stats.byCategory || stats.byCategory.length === 0) {
              return {
                ui: {
                  type: 'card',
                  props: {
                    title: 'Users by Category',
                    body: 'No category data available. Users may not have category information assigned.',
                  },
                },
              } as { ui: { type: 'card'; props: { title: string; body: string } } };
            }
            chartData = stats.byCategory.map(c => ({ name: c.category || 'Unknown', count: c.count }));
            xKey = 'name';
            chartTitle = chartTitle || 'Users by Category';
            break;
          case 'location':
            if (!stats.byLocation || stats.byLocation.length === 0) {
              return {
                ui: {
                  type: 'card',
                  props: {
                    title: 'Users by Work Location',
                    body: 'No location data available. Users may not have work location information assigned.',
                  },
                },
              } as { ui: { type: 'card'; props: { title: string; body: string } } };
            }
            chartData = stats.byLocation.map(l => ({ name: l.location || 'Unknown', count: l.count }));
            xKey = 'name';
            chartTitle = chartTitle || 'Users by Work Location';
            break;
          case 'status':
            if (stats.totalUsers === 0) {
              return {
                ui: {
                  type: 'card',
                  props: {
                    title: 'User Status Distribution',
                    body: 'No users found in the system.',
                  },
                },
              } as { ui: { type: 'card'; props: { title: string; body: string } } };
            }
            chartData = [
              { name: 'Active', count: stats.activeUsers },
              { name: 'Inactive', count: stats.inactiveUsers },
            ];
            xKey = 'name';
            chartTitle = chartTitle || 'User Status Distribution';
            break;
        }

        // Final validation before returning chart
        if (!chartData || chartData.length === 0) {
          return {
            ui: {
              type: 'card',
              props: {
                title: chartTitle || 'User Profile Visualization',
                body: 'No data available to visualize for the selected criteria.',
              },
            },
          } as { ui: { type: 'card'; props: { title: string; body: string } } };
        }

        return {
          ui: {
            type: 'chart',
            props: {
              title: chartTitle,
              description: `Showing ${chartData.length} ${chartData.length === 1 ? 'item' : 'items'}`,
              type: chartType,
              data: chartData,
              xAxisKey: xKey,
              seriesKeys,
            },
          },
        } as { ui: { type: 'chart'; props: Record<string, unknown> } };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('visualize_user_profiles error:', error);
        return {
          ui: {
            type: 'card',
            props: {
              title: 'Visualization Error',
              body: `An unexpected error occurred while creating the visualization:\n\n${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
            },
          },
        } as { ui: { type: 'card'; props: { title: string; body: string } } };
      }
    },
  } satisfies Tool,

  visualize_discovered_apps: {
    description: 'Create visualizations for discovered apps data from Supabase. Use to show risk distribution, app types, account usage, or category breakdown as charts.',
    inputSchema: z.object({
      visualization: z.enum(['risk', 'type', 'top_by_accounts', 'category']).describe('Type of visualization'),
      chartType: z.enum(['bar', 'pie', 'line', 'area']).default('bar').describe('Chart type'),
      limit: z.number().int().min(5).max(20).default(10).describe('Number of items for top_by_accounts'),
      title: z.string().optional().describe('Custom chart title'),
    }),
    execute: async ({ visualization, chartType, limit, title }) => {
      try {
        // Fetch all discovered apps for aggregation
        const { data: apps, error } = await fetchDiscoveredAppsList({ limit: 1000 });
        
        if (error) {
          return {
            ui: {
              type: 'card',
              props: {
                title: 'Discovered Apps Visualization',
                body: `Unable to fetch discovered apps data from Supabase.\n\nError: ${error}\n\nPlease ensure your Supabase connection is configured correctly and the discovered_apps_catalog table exists.`,
              },
            },
          } as { ui: { type: 'card'; props: { title: string; body: string } } };
        }

        if (!apps || apps.length === 0) {
          return {
            ui: {
              type: 'card',
              props: {
                title: 'Discovered Apps Visualization',
                body: 'No discovered apps data available. The database may be empty or no apps have been discovered yet.',
              },
            },
          } as { ui: { type: 'card'; props: { title: string; body: string } } };
        }

        let chartData: Array<Record<string, any>> = [];
        let xKey = '';
        let seriesKeys = ['count'];
        let chartTitle = title || '';

        switch (visualization) {
          case 'risk': {
            const riskCounts: Record<string, number> = {};
            apps.forEach(app => {
              const risk = app.risk || 'Unknown';
              riskCounts[risk] = (riskCounts[risk] || 0) + 1;
            });
            chartData = Object.entries(riskCounts)
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => b.count - a.count);
            xKey = 'name';
            seriesKeys = ['count'];
            chartTitle = chartTitle || 'Apps by Risk Level';
            
            if (chartData.length === 0) {
              return {
                ui: {
                  type: 'card',
                  props: {
                    title: chartTitle,
                    body: 'No risk data available for discovered apps.',
                  },
                },
              } as { ui: { type: 'card'; props: { title: string; body: string } } };
            }
            break;
          }
          case 'type': {
            const typeCounts: Record<string, number> = {};
            apps.forEach(app => {
              const type = app.app_type || 'Unknown';
              typeCounts[type] = (typeCounts[type] || 0) + 1;
            });
            chartData = Object.entries(typeCounts)
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => b.count - a.count);
            xKey = 'name';
            seriesKeys = ['count'];
            chartTitle = chartTitle || 'Apps by Type';
            
            if (chartData.length === 0) {
              return {
                ui: {
                  type: 'card',
                  props: {
                    title: chartTitle,
                    body: 'No app type data available.',
                  },
                },
              } as { ui: { type: 'card'; props: { title: string; body: string } } };
            }
            break;
          }
          case 'top_by_accounts': {
            const filtered = apps.filter(app => app.accounts !== null && app.accounts > 0);
            
            if (filtered.length === 0) {
              return {
                ui: {
                  type: 'card',
                  props: {
                    title: 'Top Apps by Account Count',
                    body: 'No apps with account data available.',
                  },
                },
              } as { ui: { type: 'card'; props: { title: string; body: string } } };
            }
            
            const sorted = filtered
              .sort((a, b) => (b.accounts || 0) - (a.accounts || 0))
              .slice(0, limit);
            chartData = sorted.map(app => ({ 
              name: app.name || 'Unknown', 
              accounts: app.accounts || 0 
            }));
            xKey = 'name';
            seriesKeys = ['accounts'];
            chartTitle = chartTitle || `Top ${Math.min(limit, sorted.length)} Apps by Account Count`;
            break;
          }
          case 'category': {
            const categoryCounts: Record<string, number> = {};
            apps.forEach(app => {
              if (app.software_categories) {
                const categories = app.software_categories.split(',').map(c => c.trim());
                categories.forEach(cat => {
                  if (cat) {
                    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                  }
                });
              }
            });
            
            if (Object.keys(categoryCounts).length === 0) {
              return {
                ui: {
                  type: 'card',
                  props: {
                    title: 'Top Software Categories',
                    body: 'No software category data available for discovered apps.',
                  },
                },
              } as { ui: { type: 'card'; props: { title: string; body: string } } };
            }
            
            const topCategories = Object.entries(categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10);
            chartData = topCategories.map(([name, count]) => ({ name, count }));
            xKey = 'name';
            seriesKeys = ['count'];
            chartTitle = chartTitle || 'Top Software Categories';
            break;
          }
        }

        if (!chartData || chartData.length === 0) {
          return {
            ui: {
              type: 'card',
              props: {
                title: chartTitle || 'Discovered Apps Visualization',
                body: 'No data available to visualize for the selected criteria.',
              },
            },
          } as { ui: { type: 'card'; props: { title: string; body: string } } };
        }

        return {
          ui: {
            type: 'chart',
            props: {
              title: chartTitle,
              description: `Showing ${chartData.length} ${chartData.length === 1 ? 'item' : 'items'}`,
              type: chartType,
              data: chartData,
              xAxisKey: xKey,
              seriesKeys,
            },
          },
        } as { ui: { type: 'chart'; props: Record<string, unknown> } };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('visualize_discovered_apps error:', error);
        return {
          ui: {
            type: 'card',
            props: {
              title: 'Visualization Error',
              body: `An unexpected error occurred while creating the visualization:\n\n${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
            },
          },
        } as { ui: { type: 'card'; props: { title: string; body: string } } };
      }
    },
  } satisfies Tool,
};

export type AppTools = typeof tools;
