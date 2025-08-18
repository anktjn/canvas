"use client";

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { renderUIMessage, UIMessagePayload } from './ui-registry';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChatForm } from '@/components/chat/chat-form';
import { MessageInput } from '@/components/chat/message-input';
import { ChatMessage, type Message as UIMessageType } from '@/components/chat/chat-message';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Sparkles, MessageSquare, Database } from 'lucide-react';

type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export default function Chat() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversationId, setConversationId] = React.useState<string>('');

  const { messages, sendMessage, status, error, clearError, setMessages } = useChat();
  const [input, setInput] = React.useState<string>('');
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CHAT === '1';

  React.useEffect(() => {
    const idFromUrl = searchParams.get('c');
    if (idFromUrl && idFromUrl !== conversationId) {
      setConversationId(idFromUrl);
      setMessages([] as any);
      lastSavedAssistantId.current = null;
      if (typeof window !== 'undefined') window.localStorage.setItem('chat:conversation-id', idFromUrl);
      return;
    }
    if (!idFromUrl && !conversationId) {
      try {
        const key = 'chat:conversation-id';
        const existing = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        const id = existing || crypto.randomUUID();
        if (typeof window !== 'undefined') window.localStorage.setItem(key, id);
        setConversationId(id);
        const qs = new URLSearchParams(Array.from(searchParams.entries()));
        qs.set('c', id);
        router.replace(`/?${qs.toString()}`);
      } catch {
        setConversationId('default');
      }
    }
  }, [searchParams, conversationId, router, setMessages]);

  function onSubmit(
    e?: { preventDefault?: () => void },
    options?: { experimental_attachments?: FileList }
  ) {
    e?.preventDefault?.();
    if (!input.trim()) return;
    (sendMessage as any)({ text: input, experimental_attachments: options?.experimental_attachments });
    setInput('');
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!conversationId) return;
      try {
        const response = await fetch(`/api/memory?id=${encodeURIComponent(conversationId)}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!data?.messages || cancelled) return;
        const restored = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role as any,
          parts: [{ type: 'text', text: m.text }],
        }));
        setMessages(restored as any);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, setMessages]);

  function messageToText(msg: any): string {
    if (!msg) return '';
    if (Array.isArray(msg.parts)) {
      const textParts = msg.parts
        .filter((p: any) => p?.type === 'text' && typeof p?.text === 'string')
        .map((p: any) => p.text)
        .join('\n');
      if (textParts) return textParts;
      const payloads = msg.parts.map((p: any) => (p?.data ? p.data : p)).filter(Boolean);
      for (const pl of payloads) {
        const s = pl?.summary ?? pl?.output?.summary;
        if (typeof s === 'string' && s.trim()) return s;
      }
    }
    if (typeof (msg as any)?.content === 'string') return (msg as any).content;
    return '';
  }

  const lastSavedAssistantId = React.useRef<string | null>(null);
  const prevStatus = React.useRef(status);

  React.useEffect(() => {
    const wasStreaming = prevStatus.current === 'streaming';
    const isReady = status === 'ready';
    prevStatus.current = status;
    if (!wasStreaming || !isReady) return;

    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;
    if (lastSavedAssistantId.current === last.id) return;
    const assistantText = messageToText(last);
    if (!assistantText.trim()) return;

    const prevUser = [...messages].slice(0, -1).reverse().find((m) => m.role === 'user');
    const userText = messageToText(prevUser);
    const toPersist = [
      prevUser && { id: prevUser.id, role: prevUser.role as ChatRole, text: userText },
      { id: last.id, role: 'assistant' as ChatRole, text: assistantText },
    ].filter(Boolean) as Array<{ id: string; role: ChatRole; text: string }>;

    if (conversationId && toPersist.length > 0) {
      fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conversationId, messages: toPersist }),
      }).then(() => {
        lastSavedAssistantId.current = last.id as string;
      }).catch(() => {});

      if (messages.length === 2 && prevUser) {
        const title = userText.length > 50 ? userText.substring(0, 50) + '...' : userText;
        fetch('/api/memory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: conversationId, title }),
        }).catch(() => {});
      }
    }
  }, [status, messages, conversationId]);

  const displayMessages: UIMessageType[] = React.useMemo(() => {
    return (messages as any[]).map((m) => ({
      ...m,
      content: typeof m?.content === 'string' && m.content.length > 0 ? m.content : messageToText(m),
    })) as UIMessageType[];
  }, [messages]);

  if (displayMessages.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full">
            <Card className="w-full border-0 bg-gradient-to-br from-background to-muted/20 p-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-4 text-2xl font-semibold">Welcome to Canvas AI</h2>
              <p className="mb-6 text-muted-foreground">
                I'm your AI assistant, ready to help you with questions, insights, and knowledge base queries.
              </p>
              <div className="max-w-4xl mx-auto">
                <div className="space-y-3 text-left max-w-2xl mx-auto">
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                      <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Ask Questions</div>
                      <div className="text-muted-foreground">Get instant answers about your business</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                      <Database className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Knowledge Base</div>
                      <div className="text-muted-foreground">Access your documents and resources</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
                      <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">AI Tools</div>
                      <div className="text-muted-foreground">Use specialized tools and analytics</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
        
        <div className="border-t bg-background p-4">
          <div className="mx-auto max-w-4xl">
            <ChatForm className="w-full" isPending={status !== 'ready'} handleSubmit={onSubmit}>
              {(({ files, setFiles }: { files: File[] | null; setFiles: React.Dispatch<React.SetStateAction<File[] | null>> }): React.ReactNode => (
                <MessageInput
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  allowAttachments
                  files={files}
                  setFiles={setFiles}
                  isGenerating={status !== 'ready'}
                  placeholder="Start a conversation..."
                />
              )) as any}
            </ChatForm>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <div className="mx-auto max-w-4xl space-y-6">
          {DEBUG && (
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
              Messages: {displayMessages.length}, Status: {status}, Conversation: {conversationId}
            </div>
          )}
          
          {error ? (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <span className="text-sm font-medium">Error: {error.message}</span>
                </div>
                <button 
                  className="text-xs underline text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" 
                  onClick={clearError}
                >
                  Dismiss
                </button>
              </div>
            </Card>
          ) : null}

          {displayMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No messages yet. Start a conversation!</p>
            </div>
          ) : (
            displayMessages.map((m) => (
              <div key={m.id} className="space-y-4">
                <ChatMessage {...(m as any)} />

                {Array.isArray((m as any)?.parts)
                  ? (m as any).parts.map((part: any, idx: number) => {
                      const anyPart = part as Record<string, any>;
                      const payload = anyPart.data ?? anyPart;
                      
                      if (
                        typeof anyPart.type === 'string' &&
                        (anyPart.type === 'step-start' ||
                          anyPart.type === 'step-end' ||
                          anyPart.type === 'tool-start' ||
                          anyPart.type === 'tool-end')
                      ) {
                        return null;
                      }

                      if (typeof anyPart.type === 'string' && anyPart.type.startsWith('tool-')) {
                        const state = anyPart.state as string | undefined;
                        if (state === 'input-available') {
                          return (
                            <div key={`tool-loading-${idx}`} className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                              <Skeleton className="h-4 w-24" />
                              <span className="text-xs text-muted-foreground">Running tool…</span>
                            </div>
                          );
                        }
                        if (state === 'output-error') {
                          return (
                            <Card key={`tool-error-${idx}`} className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                              <div className="p-3 text-xs text-red-600 dark:text-red-400">
                                Error: {String(anyPart.errorText ?? 'Tool execution failed')}
                              </div>
                            </Card>
                          );
                        }
                        if (state === 'output-available') {
                          const out = anyPart.output ?? {};
                          if (out.ui) {
                            return <div key={`tool-ui-${idx}`}>{renderUIMessage(out.ui as UIMessagePayload)}</div>;
                          }
                          const outSummary: string | undefined = out.summary;
                          if (outSummary && typeof outSummary === 'string') {
                            return (
                              <Card key={`tool-md-${idx}`} className="border-0 bg-muted/30">
                                <div className="p-4">
                                  <MarkdownRenderer>{outSummary}</MarkdownRenderer>
                                </div>
                              </Card>
                            );
                          }
                          const outSnippets = Array.isArray(out?.snippets) ? out.snippets : null;
                          if (outSnippets) {
                            return null;
                          }
                          if (DEBUG) {
                            return (
                              <Card key={`tool-raw-${idx}`} className="border-0 bg-muted/30">
                                <pre className="p-4 text-xs overflow-x-auto">
                                  {JSON.stringify(out, null, 2)}
                                </pre>
                              </Card>
                            );
                          }
                          return null;
                        }
                      }

                      if (payload?.ui) {
                        return <div key={`ui-${idx}`}>{renderUIMessage(payload.ui as UIMessagePayload)}</div>;
                      }
                      
                      const summary: string | undefined = payload?.summary ?? payload?.output?.summary;
                      if (summary && typeof summary === 'string') {
                        return (
                          <Card key={`md-${idx}`} className="border-0 bg-muted/30">
                            <div className="p-4">
                              <MarkdownRenderer>{summary}</MarkdownRenderer>
                            </div>
                          </Card>
                        );
                      }
                      
                      const snippets = Array.isArray(payload?.snippets)
                        ? payload.snippets
                        : Array.isArray(payload?.output?.snippets)
                        ? payload.output.snippets
                        : null;
                      if (snippets) {
                        return null;
                      }
                      
                      if (DEBUG && anyPart && !anyPart.type) {
                        return (
                          <Card key={`raw-${idx}`} className="border-0 bg-muted/30">
                            <pre className="p-4 text-xs overflow-x-auto">
                              {JSON.stringify(payload, null, 2)}
                            </pre>
                          </Card>
                        );
                      }
                      return null;
                    })
                  : null}
              </div>
            ))
          )}

          {status === 'streaming' ? <TypingIndicator /> : null}
        </div>
      </div>

      <div className="border-t bg-background p-4 flex-shrink-0">
        <div className="mx-auto max-w-4xl">
          <ChatForm className="w-full" isPending={status !== 'ready'} handleSubmit={onSubmit}>
            {(({ files, setFiles }: { files: File[] | null; setFiles: React.Dispatch<React.SetStateAction<File[] | null>> }): React.ReactNode => (
              <MessageInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                allowAttachments
                files={files}
                setFiles={setFiles}
                isGenerating={status !== 'ready'}
                placeholder="Ask me anything..."
              />
            )) as any}
          </ChatForm>
        </div>
      </div>
    </div>
  );
}

 