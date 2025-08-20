"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { PromptInput, PromptInputTextarea, PromptInputToolbar, PromptInputTools, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Loader } from "@/components/ai-elements/loader";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Card } from "@/components/ui/card";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Sources, SourcesContent, SourcesTrigger, Source } from "@/components/ai-elements/source";
import { UnderutilizedLicensesCard } from "@/components/custom-components/UnderutilizedLicensesCard";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { WelcomeSuggestions } from "@/components/chat/WelcomeSuggestions";

export function ChatConversation() {
  const [conversationId, setConversationId] = React.useState<string>("");
  const searchParams = useSearchParams();
  const router = useRouter();

  const { messages, sendMessage, status, setMessages } = useChat();

  React.useEffect(() => {
    const idFromUrl = searchParams?.get('c');
    const key = "chat:conversation-id";
    const setLocal = (id: string) => {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, id);
    };
    if (idFromUrl && idFromUrl !== conversationId) {
      setConversationId(idFromUrl);
      setLocal(idFromUrl);
      // clear chat UI for a fresh conversation
      setMessages([] as any);
      return;
    }
    if (!idFromUrl && !conversationId) {
      try {
        const existing = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        const id = existing || crypto.randomUUID();
        setLocal(id);
        setConversationId(id);
        // push id into URL for consistency
        const qs = new URLSearchParams(searchParams ? Array.from(searchParams.entries()) : []);
        qs.set('c', id);
        router.replace(`/?${qs.toString()}`);
      } catch {
        setConversationId('default');
      }
    }
  }, [searchParams, conversationId, router, setMessages]);
  const [input, setInput] = React.useState<string>("");
  const isLoading = status !== 'ready';
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CHAT === '1';
  const lastSavedAssistantId = React.useRef<string | null>(null);
  const prevStatus = React.useRef(status);
  const [aiSuggestions, setAiSuggestions] = React.useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState<boolean>(false);
  const lastSuggestionForAssistantId = React.useRef<string | null>(null);

  function messageToText(msg: any): string {
    if (!msg) return '';
    if (typeof msg?.content === 'string' && msg.content.length > 0) return msg.content as string;
    if (Array.isArray(msg?.parts)) {
      const buffer: string[] = [];
      for (const p of msg.parts as any[]) {
        if (!p) continue;
        const t = String(p?.type ?? '');
        // Accept normal text, streaming deltas, and user input_text payloads
        if ((t === 'text' || t === 'input' || t === 'input_text' || t === 'input-text') && typeof p?.text === 'string') {
          buffer.push(p.text);
        }
        if (t === 'text-delta' && typeof p?.textDelta === 'string') buffer.push(p.textDelta);
      }
      const joined = buffer.filter(Boolean).join('');
      if (joined.trim().length > 0) return joined;
    }
    return '';
  }

  React.useEffect(() => {
    const wasStreaming = prevStatus.current === 'streaming';
    const isReadyNow = status === 'ready';
    prevStatus.current = status;
    if (!wasStreaming || !isReadyNow) return;

    const last = (messages as any[])[(messages as any[]).length - 1];
    if (!last || last.role !== 'assistant') return;
    if (lastSavedAssistantId.current === last.id) return;
    const assistantText = messageToText(last);
    if (!assistantText.trim()) return;

    const prevUser = [...(messages as any[])].slice(0, -1).reverse().find((m) => m.role === 'user');
    const userText = messageToText(prevUser);
    const toPersist = [
      prevUser && { id: prevUser.id as string, role: prevUser.role as 'user' | 'assistant' | 'system' | 'tool', text: userText },
      { id: last.id as string, role: 'assistant' as const, text: assistantText },
    ].filter(Boolean) as Array<{ id: string; role: 'user' | 'assistant' | 'system' | 'tool'; text: string }>;

    if (conversationId && toPersist.length > 0) {
      fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conversationId, messages: toPersist }),
      })
        .then(() => {
          lastSavedAssistantId.current = last.id as string;
        })
        .catch(() => {});

      if ((messages as any[]).length === 2 && prevUser) {
        const title = userText.length > 50 ? userText.substring(0, 50) + '...' : userText;
        fetch('/api/memory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: conversationId, title }),
        }).catch(() => {});
      }
    }
  }, [status, messages, conversationId]);

  // Fetch intelligent suggestions after assistant replies or on first load
  React.useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setIsLoadingSuggestions(true);
        const payload = {
          messages: (messages as any[]).slice(-8).map((m) => ({
            role: String(m.role ?? 'user'),
            text: messageToText(m),
          })),
          count: 3,
        };
        const res = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (Array.isArray(data?.suggestions)) setAiSuggestions(data.suggestions as string[]);
      } catch {
        // ignore
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    // On empty conversation, load suggestions once
    if ((messages as any[]).length === 0 && aiSuggestions.length === 0 && !isLoadingSuggestions) {
      fetchSuggestions();
      return;
    }

    // After an assistant message completes streaming, refresh suggestions once per assistant id
    const last = (messages as any[])[(messages as any[]).length - 1];
    if (!last || last.role !== 'assistant') return;
    if (status !== 'ready') return;
    if (lastSuggestionForAssistantId.current === last.id) return;
    lastSuggestionForAssistantId.current = last.id as string;
    fetchSuggestions();
  }, [messages, status]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!conversationId) return;
      try {
        const res = await fetch(`/api/memory?id=${encodeURIComponent(conversationId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.messages || cancelled) return;
        const restored = data.messages.map((m: { id: string; role: 'user' | 'assistant' | 'system' | 'tool'; text: string }) => ({
          id: m.id,
          role: m.role,
          parts: [{ type: 'text', text: m.text }],
        }));
        setMessages(restored as unknown as Array<any>);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, setMessages]);

  return (
    <div className="flex h-full flex-col">
      {messages.length === 0 ? (
        <WelcomeSuggestions
          aiSuggestions={aiSuggestions}
          isLoadingSuggestions={isLoadingSuggestions}
          onSuggestionClick={(suggestion) => setInput(suggestion)}
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          <div className="mx-auto min-w-sm max-w-4xl w-full space-y-6">

          <Conversation>
            <ConversationContent>
            {messages.map((m) => {
              const parts = (m as any)?.parts as any[] | undefined;
              // Collect standard source-url parts for assistant messages
              const msgSources = Array.isArray(parts)
                ? parts.filter((p: any) => p?.type === 'source-url' && typeof p?.url === 'string')
                : [];
              if (DEBUG) {
                try {
                  // eslint-disable-next-line no-console
                  console.log('chat:message', {
                    id: (m as any)?.id,
                    role: (m as any)?.role,
                    content: (m as any)?.content,
                    partTypes: Array.isArray(parts) ? parts.map((p) => p?.type) : null,
                    text: messageToText(m),
                  });
                } catch {}
              }
              return (
                <Message key={m.id} from={m.role}>
                  {m.role === 'assistant' ? (
                    <div className="flex flex-col gap-2">
                      {messageToText(m) ? (
                        <MessageContent>
                          <Response>{messageToText(m)}</Response>
                        </MessageContent>
                      ) : null}
                      {msgSources.length > 0 ? (
                        <Sources>
                          <SourcesTrigger count={msgSources.length} />
                          <SourcesContent>
                            {msgSources.map((s: any, i: number) => (
                              <Source key={`${m.id}-src-${i}`} href={s.url} title={s.title ?? s.url} />
                            ))}
                          </SourcesContent>
                        </Sources>
                      ) : null}
                    </div>
                  ) : (
                    messageToText(m) ? (
                      <MessageContent>
                        <Response>{messageToText(m)}</Response>
                      </MessageContent>
                    ) : null
                  )}

                  {Array.isArray(parts)
                    ? parts.map((part, idx) => {
                        const type = String(part?.type ?? "");
                        const state = part?.state as string | undefined;
                        const output = part?.output;

                        // Reasoning parts (show only while streaming or if provided)
                        if (type === "reasoning" && typeof part?.text === "string") {
                          return (
                            <Reasoning key={`rsn-${idx}`} className="w-full" isStreaming={status === 'streaming'}>
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
                            </Reasoning>
                          );
                        }

                        // For tool calls, show a reasoning panel while the tool is running,
                        // and only show the final output card when available
                        if (type.startsWith("tool-")) {
                          if (state !== "output-available") {
                            const toolName = type.slice(5) || 'tool';
                            if (toolName === 'underutilized_licenses_card') {
                              // Defer skeleton to avoid layout jank for fast responses
                              const [showSkeleton, setShowSkeleton] = React.useState(false);
                              React.useEffect(() => {
                                const t = setTimeout(() => setShowSkeleton(true), 600);
                                return () => clearTimeout(t);
                              }, []);
                              return (
                                <div key={`tool-reasoning-${idx}`} className="w-full flex flex-col gap-2">
                                  <Reasoning className="w-full" isStreaming={status === 'streaming'}>
                                    <ReasoningTrigger />
                                    <ReasoningContent>{`Using ${toolName}…`}</ReasoningContent>
                                  </Reasoning>
                                  {showSkeleton ? (
                                    <MessageContent>
                                      <UnderutilizedLicensesCard
                                        title="Underutilized Licenses"
                                        organizationName={undefined}
                                        totalLicenses={0}
                                        underutilizedCount={0}
                                        utilizationThresholdPercent={20}
                                        measurementPeriodDays={30}
                                        apps={new Array(3).fill(null).map((_, i) => ({ appName: ``, instanceName: '', accountsCount: 0 }))}
                                        isLoading={true}
                                        progressive={true}
                                      />
                                    </MessageContent>
                                  ) : null}
                                </div>
                              );
                            }
                            return (
                              <Reasoning key={`tool-reasoning-${idx}`} className="w-full" isStreaming={status === 'streaming'}>
                                <ReasoningTrigger />
                                <ReasoningContent>{`Using ${toolName}…`}</ReasoningContent>
                              </Reasoning>
                            );
                          }
                          if (state === "output-available" && output) {
                            const hasRenderable = Boolean(output.ui) || typeof output.summary === 'string';
                            if (!hasRenderable) return null; // hide raw tool data like {snippets}
                            const srcs = Array.isArray(output.sources) ? (output.sources as Array<{ id: string; url: string; label?: string; title?: string }>) : null;
                            return (
                              <div key={`tool-out-${idx}`} className="flex flex-col gap-2">
                                <MessageContent>
                                  {renderToolOutput(output)}
                                </MessageContent>
                                {srcs ? (
                                  <Sources>
                                    <SourcesTrigger count={srcs.length} />
                                    <SourcesContent>
                                      {srcs.map((s) => (
                                        <Source key={s.id} href={s.url} title={s.title ?? s.url} />
                                      ))}
                                    </SourcesContent>
                                  </Sources>
                                ) : null}
                              </div>
                            );
                          }
                          return null;
                        }

                        // Non-tool payloads (if any)
                        if (output?.sources && Array.isArray(output.sources)) {
                          const srcs = output.sources as Array<{ id: string; url: string; label?: string; title?: string }>;
                          return (
                            <Sources key={`sources-${idx}`}>
                              <SourcesTrigger count={srcs.length} />
                              <SourcesContent>
                                {srcs.map((s) => (
                                  <Source key={s.id} href={s.url} title={s.title ?? s.url} />
                                ))}
                              </SourcesContent>
                            </Sources>
                          );
                        }

                        return null;
                      })
                    : null}
                </Message>
              );
            })}

            {isLoading ? <Loader>Thinking…</Loader> : null}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>
      </div>
      )}

      <div className="bg-background p-4 flex-shrink-0">
        <div className="mx-auto min-w-sm max-w-4xl w-full">
          <PromptInput
            onSubmit={async (e) => {
              e.preventDefault();
              if (!input.trim()) return;
              await (sendMessage as unknown as (arg: unknown) => Promise<void>)({ text: input });
              setInput("");
            }}
          >
            {aiSuggestions.length > 0 && status === 'ready' && messages.length > 0 ? (
              <div className="px-2 pt-2">
                <Suggestions>
                  {aiSuggestions.slice(0, 3).map((s) => (
                    <Suggestion key={s} suggestion={s} onClick={(val) => setInput(val)} />
                  ))}
                </Suggestions>
              </div>
            ) : null}
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
            />
            <PromptInputToolbar>
              <PromptInputTools />
              <PromptInputSubmit status={status as any} />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

function renderToolOutput(output: any): React.ReactNode {
  if (!output) return null;
  // Custom UI payloads
  if (output.ui && typeof output.ui?.type === "string") {
    const t = output.ui.type as string;
    if (t === "card") {
      const props = output.ui.props as { title?: string; body?: string };
      return (
        <Card className="w-full">
          {props?.title ? (
            <div className="border-b p-3 text-sm font-medium">{props.title}</div>
          ) : null}
          {props?.body ? (
            <div className="p-3 text-sm whitespace-pre-wrap">{props.body}</div>
          ) : null}
        </Card>
      );
    }
    if (t === "underutilized-licenses-card") {
      return <UnderutilizedLicensesCard {...(output.ui.props ?? {})} />;
    }
    if (t === "table") {
      const props = output.ui.props as { columns: string[]; rows: Array<Record<string, unknown>> };
      return (
        <div className="w-full overflow-x-auto p-2">
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                {props.columns.map((c) => (
                  <th key={c} className="text-left p-2 font-medium border-b">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  {props.columns.map((c) => (
                    <td key={c} className="p-2 align-top">
                      {String((row as any)[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  // Summaries or text payloads
  if (typeof output.summary === "string") {
    return <Response>{output.summary}</Response>;
  }

  // Fallback raw JSON in debug-friendly block
  try {
    return (
      <pre className="p-3 text-xs overflow-x-auto">{JSON.stringify(output, null, 2)}</pre>
    );
  } catch {
    return null;
  }
}


