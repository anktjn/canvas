-- Supabase Schema for Canvas Chat Application
-- Run this in your Supabase SQL editor

-- Enable pgvector extension
create extension if not exists vector;

-- Documents table for vector storage (RAG)
create table if not exists public.documents (
  id bigserial primary key,
  url text not null,
  content text not null,
  embedding vector(1536)
);

-- Vector similarity search function (cosine distance)
create or replace function public.match_documents(
  query_embedding vector(1536),
  match_count int default 5
) returns table (
  id bigint,
  url text,
  content text,
  score float
) language sql stable as $$
  select d.id, d.url, d.content,
         1 - (d.embedding <=> query_embedding) as score
  from public.documents d
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- Chat conversations table
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chat messages table with full message structure support
create table if not exists public.chat_messages (
  id bigserial primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  external_id text not null unique,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  parts jsonb, -- NEW: stores full message structure including tool outputs
  created_at timestamptz not null default now()
);

-- Create index on external_id for upsert operations
create index if not exists idx_chat_messages_external_id on public.chat_messages(external_id);

-- Create index on conversation_id for faster queries
create index if not exists idx_chat_messages_conversation_id on public.chat_messages(conversation_id);

-- Migration: Add parts column to existing chat_messages table (if it already exists)
-- This is safe to run - it will only add the column if it doesn't exist
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'chat_messages' 
    and column_name = 'parts'
  ) then
    alter table public.chat_messages add column parts jsonb;
  end if;
end $$;

-- User profiles table (if not exists)
create table if not exists public.user_profiles (
  id bigserial primary key,
  user_id text unique not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  status text not null check (status in ('Active', 'Inactive')),
  user_category text not null,
  department text,
  job_title text,
  work_location_code text,
  provisioned_apps_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Discovered apps catalog table (if not exists)
create table if not exists public.discovered_apps_catalog (
  id bigserial primary key,
  name text not null,
  app_type text,
  accounts integer,
  sources text,
  last_used timestamptz,
  status text,
  discovery_source_url text,
  software_categories text,
  risk text,
  compliances text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (optional, uncomment if needed)
-- alter table public.chat_conversations enable row level security;
-- alter table public.chat_messages enable row level security;
-- alter table public.user_profiles enable row level security;
-- alter table public.discovered_apps_catalog enable row level security;

