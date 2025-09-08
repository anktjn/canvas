import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Status = 'Active' | 'Inactive';
type UserCategory = 'Full-time' | 'Contractor' | 'External' | '';

export type UserProfile = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  status: Status;
  user_category: UserCategory;
  email: string;
  department: string | null;
  job_title: string | null;
  start_date: string | null;
  end_date: string | null;
  additional_information: string | null;
  work_location_code: string | null;
  username: string | null;
  personal_email: string | null;
  role: string | null;
  provisioned_apps_count: number;
  created_at: string;
  updated_at: string;
};

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

    const department = searchParams.get('department') || undefined;
    const status = (searchParams.get('status') as Status) || undefined;
    const userCategory = (searchParams.get('user_category') as UserCategory) || undefined;
    const workLocation = searchParams.get('work_location') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || undefined;

    const supabase = getSupabaseClient();

    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('user_id', { ascending: true });

    if (department) query = query.eq('department', department);
    if (status) query = query.eq('status', status);
    if (userCategory) query = query.eq('user_category', userCategory);
    if (workLocation) query = query.eq('work_location_code', workLocation);
    if (search) {
      const s = search.replace(/%/g, '');
      query = query.or(
        `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,job_title.ilike.%${s}%`
      );
    }

    // Supabase ranges are inclusive
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


