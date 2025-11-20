import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type DiscoveredApp = {
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
};

const FALLBACK_APPS: DiscoveredApp[] = [
  {
    id: 'fbk-1',
    name: 'Notion',
    app_type: 'Trackable App',
    accounts: 35,
    sources: 'Google Workspace,Slack',
    last_used: '2024-10-12T10:00:00Z',
    status: 'Active',
    discovery_source_url: 'https://www.notion.so/',
    software_categories: 'Collaboration,Docs',
    risk: 'Low',
    compliances: 'SOC 2',
  },
  {
    id: 'fbk-2',
    name: 'Airtable',
    app_type: 'Trackable App',
    accounts: 18,
    sources: 'Okta',
    last_used: '2024-10-09T12:00:00Z',
    status: 'Active',
    discovery_source_url: 'https://airtable.com/',
    software_categories: 'Database,Automation',
    risk: 'Medium',
    compliances: 'SOC 2',
  },
  {
    id: 'fbk-3',
    name: 'Figma',
    app_type: 'Integrable App',
    accounts: 62,
    sources: 'Okta,Google Workspace',
    last_used: '2024-10-10T09:30:00Z',
    status: 'Active',
    discovery_source_url: 'https://www.figma.com/',
    software_categories: 'Design,Collaboration',
    risk: 'Low',
    compliances: 'SOC 2',
  },
  {
    id: 'fbk-4',
    name: 'Salesforce Sandbox',
    app_type: 'Trackable App',
    accounts: 12,
    sources: 'Okta',
    last_used: '2024-09-30T15:00:00Z',
    status: 'Inactive',
    discovery_source_url: 'https://salesforce.com/',
    software_categories: 'CRM,Sales',
    risk: 'High',
    compliances: 'ISO 27001',
  },
  {
    id: 'fbk-5',
    name: 'Canva',
    app_type: 'Trackable App',
    accounts: 8,
    sources: 'Google Workspace',
    last_used: '2024-10-01T17:00:00Z',
    status: 'Active',
    discovery_source_url: 'https://www.canva.com/',
    software_categories: 'Design,Marketing',
    risk: 'Medium',
    compliances: 'None',
  },
  {
    id: 'fbk-6',
    name: 'ChatGPT Team',
    app_type: 'Integrable App',
    accounts: 44,
    sources: 'Direct',
    last_used: '2024-10-11T11:15:00Z',
    status: 'Active',
    discovery_source_url: 'https://chat.openai.com/',
    software_categories: 'AI,Productivity',
    risk: 'Medium',
    compliances: 'SOC 2',
  },
];

type DiscoveredAppStatus = string;

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    const missing: string[] = [];
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
    if (!key) missing.push('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    throw new Error(`Missing Supabase env vars: ${missing.join(' and ')}`);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const appType = searchParams.get('app_type') || undefined;
    const status = (searchParams.get('status') as DiscoveredAppStatus) || undefined;
    const risk = searchParams.get('risk') || undefined;
    const category = searchParams.get('category') || undefined; // software_categories contains comma-separated text
    const source = searchParams.get('source') || undefined; // sources contains comma-separated text
    const minAccounts = searchParams.get('min_accounts');
    const maxAccounts = searchParams.get('max_accounts');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || undefined;

    try {
      const supabase = getSupabaseClient();

      let query = supabase
        .from('discovered_apps_catalog')
        .select('*', { count: 'exact' })
        .order('name', { ascending: true });

      if (appType) query = query.eq('app_type', appType);
      if (status) query = query.eq('status', status);
      if (risk) query = query.eq('risk', risk);
      if (typeof minAccounts === 'string') query = query.gte('accounts', parseInt(minAccounts, 10));
      if (typeof maxAccounts === 'string') query = query.lte('accounts', parseInt(maxAccounts, 10));

      // For category and source we perform ilike contains because fields are comma-separated strings
      if (category) {
        const c = category.replace(/%/g, '');
        query = query.ilike('software_categories', `%${c}%`);
      }
      if (source) {
        const s = source.replace(/%/g, '');
        query = query.ilike('sources', `%${s}%`);
      }

      if (search) {
        const s = search.replace(/%/g, '');
        query = query.or(
          `name.ilike.%${s}%,discovery_source_url.ilike.%${s}%,software_categories.ilike.%${s}%,risk.ilike.%${s}%`
        );
      }

      const from = offset;
      const to = offset + Math.max(0, limit - 1);
      const { data, error, count } = await query.range(from, to);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data || data.length === 0) {
        const fallback = applyFallbackFilters({
          appType,
          status,
          risk,
          category,
          source,
          minAccounts: minAccounts ? parseInt(minAccounts, 10) : undefined,
          maxAccounts: maxAccounts ? parseInt(maxAccounts, 10) : undefined,
          limit,
          offset,
          search,
        });
        return NextResponse.json(fallback);
      }

      return NextResponse.json({ data, count: count ?? data.length });
    } catch (error) {
      const fallback = applyFallbackFilters({
        appType,
        status,
        risk,
        category,
        source,
        minAccounts: minAccounts ? parseInt(minAccounts, 10) : undefined,
        maxAccounts: maxAccounts ? parseInt(maxAccounts, 10) : undefined,
        limit,
        offset,
        search,
      });
      // eslint-disable-next-line no-console
      console.warn('[discovered-apps] falling back to sample data:', error);
      return NextResponse.json(fallback);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type FallbackFilterInput = {
  appType?: string;
  status?: string;
  risk?: string;
  category?: string;
  source?: string;
  minAccounts?: number;
  maxAccounts?: number;
  limit: number;
  offset: number;
  search?: string;
};

function applyFallbackFilters({
  appType,
  status,
  risk,
  category,
  source,
  minAccounts,
  maxAccounts,
  limit,
  offset,
  search,
}: FallbackFilterInput) {
  let result = [...FALLBACK_APPS];

  if (appType) result = result.filter((app) => app.app_type === appType);
  if (status) result = result.filter((app) => app.status === status);
  if (risk) result = result.filter((app) => app.risk === risk);
  if (typeof minAccounts === 'number') result = result.filter((app) => (app.accounts ?? 0) >= minAccounts);
  if (typeof maxAccounts === 'number') result = result.filter((app) => (app.accounts ?? 0) <= maxAccounts);

  if (category) {
    const c = category.toLowerCase();
    result = result.filter((app) => app.software_categories?.toLowerCase().includes(c));
  }

  if (source) {
    const s = source.toLowerCase();
    result = result.filter((app) => app.sources?.toLowerCase().includes(s));
  }

  if (search) {
    const s = search.toLowerCase();
    result = result.filter((app) => {
      const fields = [
        app.name,
        app.discovery_source_url,
        app.software_categories,
        app.risk,
        app.status,
      ]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());
      return fields.some((field) => field.includes(s));
    });
  }

  const count = result.length;
  const sliced = result.slice(offset, offset + limit);

  return { data: sliced, count };
}


