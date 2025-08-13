import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export type PersistedMessage = {
  id: string; // external client message id from useChat
  role: ChatRole;
  text: string;
  createdAt?: string;
};

export type ConversationRecord = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

function getServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase env missing');
  }
  return createClient(url, key);
}

export async function getOrCreateConversation(conversationId?: string, title?: string | null): Promise<ConversationRecord> {
  const client = getServiceClient();
  if (conversationId) {
    const { data, error } = await client
      .from('chat_conversations')
      .select('id, title, created_at, updated_at')
      .eq('id', conversationId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as ConversationRecord;
    // Create with the provided id to keep client and server in sync
    const create = await client
      .from('chat_conversations')
      .insert({ id: conversationId, title: title ?? null })
      .select('id, title, created_at, updated_at')
      .single();
    if (create.error) throw create.error;
    return create.data as ConversationRecord;
  }

  const { data, error } = await client
    .from('chat_conversations')
    .insert({ title: title ?? null })
    .select('id, title, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as ConversationRecord;
}

export async function saveMessages(conversationId: string, messages: PersistedMessage[]): Promise<void> {
  if (!messages.length) return;
  const client = getServiceClient();
  const rows = messages.map((m) => ({
    conversation_id: conversationId,
    external_id: m.id,
    role: m.role,
    content: m.text,
    created_at: m.createdAt ?? new Date().toISOString(),
  }));
  const { error } = await client
    .from('chat_messages')
    .upsert(rows, { onConflict: 'external_id' });
  if (error) throw error;
}

export async function loadMessages(conversationId: string, limit = 200): Promise<PersistedMessage[]> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('chat_messages')
    .select('external_id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.external_id as string,
    role: row.role as ChatRole,
    text: row.content as string,
    createdAt: row.created_at as string,
  }));
}

export type ConversationListItem = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export async function listConversations(limit = 20): Promise<ConversationListItem[]> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('chat_conversations')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ConversationListItem[];
}


