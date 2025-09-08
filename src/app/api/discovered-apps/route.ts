import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

    return NextResponse.json({ data, count: count ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


