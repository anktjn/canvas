This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## AI Chat + RAG (Supabase)

Environment variables:

```
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Create Supabase schema (pgvector + chat persistence):

Run the SQL in `supabase-schema.sql` or run these commands:

```sql
-- enable extension
create extension if not exists vector;

-- documents table for RAG
create table if not exists public.documents (
  id bigserial primary key,
  url text not null,
  content text not null,
  embedding vector(1536)
);

-- similarity search function (cosine distance)
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

-- chat conversations table
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- chat messages table with full message structure support
create table if not exists public.chat_messages (
  id bigserial primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  external_id text not null unique,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  parts jsonb, -- stores full message structure including tool outputs
  created_at timestamptz not null default now()
);

-- indexes for performance
create index if not exists idx_chat_messages_external_id on public.chat_messages(external_id);
create index if not exists idx_chat_messages_conversation_id on public.chat_messages(conversation_id);
```

**Important**: The `parts` column stores the complete message structure including tool outputs with UI components (charts, cards, etc.). This ensures that when you reload a conversation, all interactive components are restored exactly as they appeared.

API routes:

- `POST /api/ingest` with `{ url }` to ingest a public URL into the vector store
- `POST /api/chat` to converse; the model may call tools to retrieve snippets or render inline UI


You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
