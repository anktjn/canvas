export type DiscoveredApp = {
  id: string;
  name: string;
  app_type: string | null;
  accounts: number | null;
  sources: string | null;
  last_used: string | null;
  status: string | null;
  discovery_source_url: string | null;
  software_categories: string | null;
  risk: string | null;
  compliances: string | null;
  created_at: string;
  updated_at: string;
};

export type FetchDiscoveredAppsInput = {
  appType?: string;
  status?: string;
  risk?: string;
  category?: string;
  source?: string;
  minAccounts?: number;
  maxAccounts?: number;
  limit?: number;
  offset?: number;
  search?: string;
};

export type DiscoveredAppsResponse = {
  data?: DiscoveredApp[];
  error?: string;
  count?: number;
};

/**
 * Fetch discovered apps from the internal API route
 */
export async function fetchDiscoveredApps(
  input: FetchDiscoveredAppsInput = {}
): Promise<DiscoveredAppsResponse> {
  try {
    const params = new URLSearchParams();

    if (input.appType) params.set('app_type', input.appType);
    if (input.status) params.set('status', input.status);
    if (input.risk) params.set('risk', input.risk);
    if (input.category) params.set('category', input.category);
    if (input.source) params.set('source', input.source);
    if (typeof input.minAccounts === 'number') params.set('min_accounts', String(input.minAccounts));
    if (typeof input.maxAccounts === 'number') params.set('max_accounts', String(input.maxAccounts));
    if (input.limit) params.set('limit', String(input.limit));
    if (input.offset) params.set('offset', String(input.offset));
    if (input.search) params.set('search', input.search);

    const url = `/api/discovered-apps?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}` };
    }

    const result = await response.json();
    return result as DiscoveredAppsResponse;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}


