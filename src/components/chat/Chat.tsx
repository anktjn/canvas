"use client";
import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { renderUIMessage, UIMessagePayload } from './ui-registry';
import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChatContainer, ChatForm, ChatMessages } from '@/components/ui/chat';
import { MessageInput } from '@/components/ui/message-input';
import { ChatMessage, type Message as UIMessageType } from '@/components/ui/chat-message';
import { TypingIndicator } from '@/components/ui/typing-indicator';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { Skeleton } from '@/components/ui/skeleton';
//

export default function Chat() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversationId, setConversationId] = React.useState<string>('');

  const { messages, sendMessage, status, error, clearError, setMessages } = useChat();
  const [input, setInput] = React.useState<string>('');
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CHAT === '1';

  useEffect(() => {
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
    // Pass through attachments when provided (supported by AI SDK UI messages)
    // Casting to any to avoid tight coupling with library types across versions
    (sendMessage as any)({ text: input, experimental_attachments: options?.experimental_attachments });
    setInput('');
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/memory?id=${encodeURIComponent(conversationId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.messages || cancelled) return;
        const restored = (data.messages as Array<{ id: string; role: string; text: string }>).map((m) => ({
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

  // Persist once after streaming finishes to avoid saving partials
  const lastSavedAssistantId = useRef<string | null>(null);
  const prevStatus = useRef(status);
  useEffect(() => {
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
      prevUser && { id: prevUser.id, role: 'user', text: userText },
      { id: last.id, role: 'assistant' as const, text: assistantText },
    ].filter(Boolean);

    fetch(`/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conversationId, messages: toPersist }),
    })
      .then(() => {
        lastSavedAssistantId.current = last.id as string;
      })
      .catch(() => {});
  }, [status, messages, conversationId]);

  function toPlainText(html: string) {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function truncate(text: string, max = 300) {
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

  const displayMessages: UIMessageType[] = React.useMemo(() => {
    return (messages as any[]).map((m) => ({
      // Preserve all fields coming from AI SDK UI messages
      ...m,
      // Ensure a string content exists for ChatMessage typing; fall back to assembled text
      content: typeof m?.content === 'string' && m.content.length > 0 ? m.content : messageToText(m),
    })) as UIMessageType[];
  }, [messages]);

  return (
    <ChatContainer className="h-full max-h-[80vh]">
      <ChatMessages messages={displayMessages}>
        <div className="space-y-4 p-4">
          {error ? (
            <div className="text-sm text-red-600 flex items-center justify-between bg-red-50 border border-red-200 rounded p-2">
              <span>{error.message}</span>
              <button className="text-xs underline" onClick={clearError}>dismiss</button>
            </div>
          ) : null}

          {displayMessages.map((m) => (
            <div key={m.id} className="space-y-2">
              {/* Primary message bubble using shadcn ChatMessage */}
              <ChatMessage {...(m as any)} />

              {/* Additional rich payloads rendered below the bubble */}
              {Array.isArray((m as any)?.parts)
                ? (m as any).parts.map((part: any, idx: number) => {
                    const anyPart = part as Record<string, any>;
                    const payload = anyPart.data ?? anyPart;
                    // Ignore low-level step markers
                    if (
                      typeof anyPart.type === 'string' &&
                      (anyPart.type === 'step-start' ||
                        anyPart.type === 'step-end' ||
                        anyPart.type === 'tool-start' ||
                        anyPart.type === 'tool-end')
                    ) {
                      return null;
                    }

                    // Handle AI SDK 5 typed tool parts with streaming states
                    if (typeof anyPart.type === 'string' && anyPart.type.startsWith('tool-')) {
                      const state = anyPart.state as string | undefined;
                      if (state === 'input-available') {
                        return (
                          <div key={`tool-loading-${idx}`} className="flex items-center gap-2">
                            <Skeleton className="h-4 w-24" />
                            <span className="text-xs text-muted-foreground">Running tool…</span>
                          </div>
                        );
                      }
                      if (state === 'output-error') {
                        return (
                          <div key={`tool-error-${idx}`} className="text-xs text-red-600">
                            Error: {String(anyPart.errorText ?? 'Tool execution failed')}
                          </div>
                        );
                      }
                      if (state === 'output-available') {
                        const out = anyPart.output ?? {};
                        if (out.ui) {
                          return <div key={`tool-ui-${idx}`}>{renderUIMessage(out.ui as UIMessagePayload)}</div>;
                        }
                        const outSummary: string | undefined = out.summary;
                        if (outSummary && typeof outSummary === 'string') {
                          return <MarkdownRenderer key={`tool-md-${idx}`}>{outSummary}</MarkdownRenderer>;
                        }
                        const outSnippets = Array.isArray(out?.snippets) ? out.snippets : null;
                        if (outSnippets) {
                          return (
                            <div key={`tool-snip-${idx}`} className="space-y-2">
                              {outSnippets.map((s: any) => (
                                <div key={s.id} className="text-sm">
                                  <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                                    {s.url}
                                  </a>
                                  <div className="text-muted-foreground">
                                    {truncate(toPlainText(String(s.content ?? '')))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        if (DEBUG) {
                          return (
                            <pre key={`tool-raw-${idx}`} className="text-xs bg-muted/30 p-2 rounded border overflow-x-auto">
                              {JSON.stringify(out, null, 2)}
                            </pre>
                          );
                        }
                        return null;
                      }
                    }

                    // Back-compat: directly embedded UI payload
                    if (payload?.ui) {
                      return <div key={`ui-${idx}`}>{renderUIMessage(payload.ui as UIMessagePayload)}</div>;
                    }
                    // Textual summary either at top-level or under output
                    const summary: string | undefined = payload?.summary ?? payload?.output?.summary;
                    if (summary && typeof summary === 'string') {
                      return <MarkdownRenderer key={`md-${idx}`}>{summary}</MarkdownRenderer>;
                    }
                    // Snippets either at top-level or under output
                    const snippets = Array.isArray(payload?.snippets)
                      ? payload.snippets
                      : Array.isArray(payload?.output?.snippets)
                      ? payload.output.snippets
                      : null;
                    if (snippets) {
                      return (
                        <div key={`snip-${idx}`} className="space-y-2">
                          {snippets.map((s: any) => (
                            <div key={s.id} className="text-sm">
                              <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                                {s.url}
                              </a>
                              <div className="text-muted-foreground">
                                {truncate(toPlainText(String(s.content ?? '')))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    if (DEBUG && anyPart && !anyPart.type) {
                      return (
                        <pre key={`raw-${idx}`} className="text-xs bg-muted/30 p-2 rounded border overflow-x-auto">
                          {JSON.stringify(payload, null, 2)}
                        </pre>
                      );
                    }
                    return null;
                  })
                : null}
            </div>
          ))}

          {status === 'streaming' ? <TypingIndicator /> : null}
        </div>
      </ChatMessages>

      <ChatForm className="mt-auto p-4" isPending={status !== 'ready'} handleSubmit={onSubmit}>
        {({ files, setFiles }) => (
          <MessageInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            allowAttachments
            files={files}
            setFiles={setFiles}
            isGenerating={status !== 'ready'}
          />
        )}
      </ChatForm>
    </ChatContainer>
  );
}


