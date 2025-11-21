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
import { UserProfilesCard } from "@/components/custom-components/UserProfilesCard";
import { UserProfilesList } from "@/components/custom-components/UserProfilesList";
import { DiscoveredAppsList } from "@/components/custom-components/DiscoveredAppsList";
import { ChartCard } from "@/components/custom-components/ChartCard";
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
        
        // Extract text from tool outputs (check both output-available state and any output)
        if (t.startsWith('tool-')) {
          const output = p?.output;
          if (output) {
            const toolText = extractTextFromToolOutput(output);
            if (toolText) buffer.push(toolText);
          }
        }
      }
      const joined = buffer.filter(Boolean).join('');
      if (joined.trim().length > 0) return joined;
    }
    return '';
  }

  function extractTextFromToolOutput(output: any): string {
    if (!output) return '';
    
    // If there's a summary, use it
    if (typeof output.summary === 'string' && output.summary.trim()) {
      return output.summary;
    }
    
    // Extract text from UI components
    if (output.ui && typeof output.ui?.type === 'string') {
      const uiType = output.ui.type;
      const props = output.ui.props || {};
      
      switch (uiType) {
        case 'card':
          const cardTitle = props.title || '';
          const cardBody = props.body || '';
          return cardTitle && cardBody ? `${cardTitle}: ${cardBody}` : cardTitle || cardBody || '';
        
        case 'underutilized-licenses-card':
          const licensesCount = props.underutilizedCount ?? 0;
          const totalLicenses = props.totalLicenses ?? 0;
          const orgName = props.organizationName ? ` for ${props.organizationName}` : '';
          return `Underutilized Licenses${orgName}: ${licensesCount} out of ${totalLicenses} licenses are underutilized.`;
        
        case 'user-profiles-card':
          const totalUsers = props.totalUsers ?? 0;
          const activeUsers = props.activeUsers ?? 0;
          const inactiveUsers = props.inactiveUsers ?? 0;
          return `User Profiles Overview: ${totalUsers} total users (${activeUsers} active, ${inactiveUsers} inactive).`;
        
        case 'user-profiles-list':
          const usersCount = Array.isArray(props.users) ? props.users.length : 0;
          const totalCount = props.totalCount ?? usersCount;
          const filters = props.filters || {};
          const filterParts: string[] = [];
          if (filters.department) filterParts.push(`department: ${filters.department}`);
          if (filters.status) filterParts.push(`status: ${filters.status}`);
          if (filters.userCategory) filterParts.push(`category: ${filters.userCategory}`);
          if (filters.workLocation) filterParts.push(`location: ${filters.workLocation}`);
          if (typeof filters.minApps === 'number') filterParts.push(`min apps: ${filters.minApps}`);
          if (typeof filters.maxApps === 'number') filterParts.push(`max apps: ${filters.maxApps}`);
          if (filters.search) filterParts.push(`search: "${filters.search}"`);
          const filterText = filterParts.length > 0 ? ` (${filterParts.join(', ')})` : '';
          return `User Profiles List: Showing ${usersCount}${totalCount !== usersCount ? ` of ${totalCount}` : ''} users${filterText}.`;
        
        case 'discovered-apps-list':
          const appsCount = Array.isArray(props.apps) ? props.apps.length : 0;
          const appsTotalCount = props.totalCount ?? appsCount;
          const appFilters = props.filters || {};
          const appFilterParts: string[] = [];
          if (appFilters.risk) appFilterParts.push(`risk: ${appFilters.risk}`);
          if (appFilters.appType) appFilterParts.push(`type: ${appFilters.appType}`);
          if (appFilters.category) appFilterParts.push(`category: ${appFilters.category}`);
          if (appFilters.search) appFilterParts.push(`search: "${appFilters.search}"`);
          const appFilterText = appFilterParts.length > 0 ? ` (${appFilterParts.join(', ')})` : '';
          return `Discovered Apps List: Showing ${appsCount}${appsTotalCount !== appsCount ? ` of ${appsTotalCount}` : ''} apps${appFilterText}.`;
        
        case 'chart':
          const chartTitle = props.title || 'Chart';
          return `Chart displayed: ${chartTitle}`;

        case 'table':
          const columns = Array.isArray(props.columns) ? props.columns : [];
          const rows = Array.isArray(props.rows) ? props.rows : [];
          return `Table: ${rows.length} rows with columns: ${columns.join(', ')}.`;
        
        default:
          // Fallback: try to extract any meaningful text from props
          if (props.title) return String(props.title);
          if (props.body) return String(props.body);
          return `[${uiType} component displayed]`;
      }
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
    // Don't skip saving if there's no text - tool outputs might have generated summaries
    // But still check if there's any meaningful content
    if (!assistantText.trim()) {
      // Check if there are tool outputs that should be saved
      const parts = (last as any)?.parts as any[] | undefined;
      const hasToolOutputs = Array.isArray(parts) && parts.some((p: any) => {
        const t = String(p?.type ?? '');
        return t.startsWith('tool-') && p?.output && p?.state === 'output-available';
      });
      if (!hasToolOutputs) return; // Skip if no text and no tool outputs
    }

    const prevUser = [...(messages as any[])].slice(0, -1).reverse().find((m) => m.role === 'user');
    const userText = messageToText(prevUser);
    const toPersist = [
      prevUser && { 
        id: prevUser.id as string, 
        role: prevUser.role as 'user' | 'assistant' | 'system' | 'tool', 
        text: userText,
        parts: Array.isArray(prevUser.parts) ? prevUser.parts : undefined,
      },
      { 
        id: last.id as string, 
        role: 'assistant' as const, 
        text: assistantText,
        parts: Array.isArray(last.parts) ? last.parts : undefined,
      },
    ].filter(Boolean) as Array<{ id: string; role: 'user' | 'assistant' | 'system' | 'tool'; text: string; parts?: any[] }>;

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
        const restored = data.messages.map((m: { id: string; role: 'user' | 'assistant' | 'system' | 'tool'; text: string; parts?: any[] }) => ({
          id: m.id,
          role: m.role,
          // If we have full parts (with tool outputs), use them; otherwise fall back to text-only
          parts: Array.isArray(m.parts) && m.parts.length > 0 
            ? m.parts 
            : [{ type: 'text', text: m.text }],
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
              const hasUiToolOutput =
                Array.isArray(parts) &&
                parts.some(
                  (part) =>
                    typeof part?.type === 'string' &&
                    part.type.startsWith('tool-') &&
                    part?.state === 'output-available' &&
                    part?.output &&
                    typeof part.output === 'object' &&
                    part.output !== null &&
                    (part.output as any).ui
                );
              const text = messageToText(m);
              const shouldRenderPrimaryText = Boolean(text) && !hasUiToolOutput;

              return (
                <Message key={m.id} from={m.role}>
                  {m.role === 'assistant' ? (
                    <div className="flex flex-col gap-2 w-full">
                      {shouldRenderPrimaryText ? (
                        <MessageContent>
                          <Response>{text}</Response>
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
                              const isResultAvailable = state === "output-available" || state === "result";
                              
                              if (!isResultAvailable) {
                                const toolName = type.slice(5) || 'tool';
                                // Check for error state
                                const isError = state === 'error' || state === 'failed';
                                if (isError) {
                                  return (
                                    <div key={`tool-err-${idx}`} className="w-full">
                                       <Card className="p-3 text-sm text-destructive border-destructive/50 bg-destructive/10">
                                         Error using {toolName}: {(part as any)?.error || 'Unknown error'}
                                       </Card>
                                    </div>
                                  );
                                }

                                return (
                                  <div key={`tool-reasoning-${idx}`} className="w-full flex flex-col gap-2">
                                    <Reasoning className="w-full" isStreaming={status === 'streaming'}>
                                      <ReasoningTrigger />
                                      <ReasoningContent>{`Using ${toolName}…`}</ReasoningContent>
                                    </Reasoning>
                                    {toolName === 'underutilized_licenses_card' && (
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
                                    )}
                                    {toolName === 'user_profiles_card' && (
                                      <MessageContent>
                                        <UserProfilesCard
                                          title="User Profiles Overview"
                                          totalUsers={0}
                                          activeUsers={0}
                                          inactiveUsers={0}
                                          isLoading={true}
                                          progressive={true}
                                        />
                                      </MessageContent>
                                    )}
                                    {toolName === 'user_profiles_list' && (
                                      <MessageContent>
                                        <UserProfilesList
                                          title="User Profiles"
                                          users={[]}
                                          isLoading={true}
                                          progressive={true}
                                        />
                                      </MessageContent>
                                    )}
                                    {toolName === 'discovered_apps_list' && (
                                      <MessageContent>
                                        <DiscoveredAppsList
                                          title="Discovered Apps"
                                          apps={[]}
                                          isLoading={true}
                                          progressive={true}
                                        />
                                      </MessageContent>
                                    )}
                                    {toolName === 'show_chart' && (
                                      <MessageContent>
                                         <Card className="w-full h-[350px] flex items-center justify-center text-muted-foreground">
                                            Generating Chart...
                                         </Card>
                                      </MessageContent>
                                    )}
                                  </div>
                                );
                              }
                              if (isResultAvailable && output) {
                                const hasRenderable = Boolean(output.ui) || typeof output.summary === 'string';
                                if (!hasRenderable) return null; // hide raw tool data like {snippets}
                                const srcs = Array.isArray(output.sources) ? (output.sources as Array<{ id: string; url: string; label?: string; title?: string }>) : null;
                                return (
                                  <div key={`tool-out-${idx}`} className="flex flex-col gap-2 w-full">
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
                    </div>
                  ) : (
                    messageToText(m) ? (
                      <MessageContent>
                        <Response>{messageToText(m)}</Response>
                      </MessageContent>
                    ) : null
                  )}
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
    if (t === "user-profiles-card") {
      return <UserProfilesCard {...(output.ui.props ?? {})} />;
    }
    if (t === "user-profiles-list") {
      return <UserProfilesList {...(output.ui.props ?? {})} />;
    }
    if (t === "discovered-apps-list") {
      return <DiscoveredAppsList {...(output.ui.props ?? {})} />;
    }
    if (t === "chart") {
      return <ChartCard {...(output.ui.props as any)} />;
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
