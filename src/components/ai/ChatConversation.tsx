"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { Conversation } from "@/components/ai-elements/conversation";
import { Message } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { PromptInput, PromptInputTextarea, PromptInputToolbar, PromptInputTools, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Loader } from "@/components/ai-elements/loader";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { Card } from "@/components/ui/card";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Sources, SourcesContent, SourcesTrigger, Source } from "@/components/ai-elements/source";
import { UnderutilizedLicensesCard } from "@/components/custom-components/UnderutilizedLicensesCard";

export function ChatConversation() {
  const [conversationId, setConversationId] = React.useState<string>("");

  React.useEffect(() => {
    try {
      const key = "chat:conversation-id";
      const existing = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      const id = existing || crypto.randomUUID();
      if (typeof window !== "undefined") window.localStorage.setItem(key, id);
      setConversationId(id);
    } catch {
      setConversationId("default");
    }
  }, []);

  const { messages, sendMessage, status, setMessages } = useChat();
  const [input, setInput] = React.useState<string>("");
  const isLoading = status !== 'ready';
  const lastSavedAssistantId = React.useRef<string | null>(null);
  const prevStatus = React.useRef(status);

  function messageToText(msg: any): string {
    if (!msg) return '';
    if (typeof msg?.content === 'string') return msg.content as string;
    if (Array.isArray(msg?.parts)) {
      const text = msg.parts
        .filter((p: any) => p?.type === 'text' && typeof p?.text === 'string')
        .map((p: any) => p.text)
        .join('\n');
      if (text) return text;
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
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <div className="mx-auto max-w-4xl space-y-6">
          {messages.length === 0 ? (
            <Card className="w-full border-0 bg-gradient-to-br from-background to-muted/20 p-8 text-center">
              <div className="mx-auto max-w-2xl space-y-3 text-left">
                <h2 className="text-2xl font-semibold">Welcome to Canvas AI</h2>
                <p className="text-muted-foreground">Start a conversation or use a suggestion below.</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Suggestion onClick={(s) => setInput(s)} suggestion="Summarize our latest product update" />
                  <Suggestion onClick={(s) => setInput(s)} suggestion="Show underutilized licenses" />
                  <Suggestion onClick={(s) => setInput(s)} suggestion="What does our SSO setup require?" />
                </div>
              </div>
            </Card>
          ) : null}

          <Conversation>
            {messages.map((m) => {
              const parts = (m as any)?.parts as any[] | undefined;
              return (
                <Message key={m.id} from={m.role}>
                  <Response>{typeof (m as any)?.content === "string" ? (m as any).content : ""}</Response>

                  {Array.isArray(parts)
                    ? parts.map((part, idx) => {
                        const type = String(part?.type ?? "");
                        const state = part?.state as string | undefined;
                        const input = part?.input;
                        const output = part?.output;

                        // Tool lifecycle UI
                        if (type.startsWith("tool-")) {
                          return (
                            <Tool key={`tool-${idx}`}>
                              <ToolHeader type={type as any} state={(state as any) ?? "input-streaming"} />
                              <ToolContent>
                                {input ? <ToolInput input={input} /> : null}
                                <ToolOutput
                                  errorText={part?.errorText}
                                  output={renderToolOutput(output)}
                                />
                              </ToolContent>
                            </Tool>
                          );
                        }

                        // Post-tool payloads embedded directly as data
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
          </Conversation>
        </div>
      </div>

      <div className="border-t bg-background p-4 flex-shrink-0">
        <div className="mx-auto max-w-4xl">
          <PromptInput
            onSubmit={async (e) => {
              e.preventDefault();
              if (!input.trim()) return;
              await (sendMessage as unknown as (arg: unknown) => Promise<void>)({ text: input });
              setInput("");
            }}
          >
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


