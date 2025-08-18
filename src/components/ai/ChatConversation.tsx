"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { Conversation } from "@/components/ai-elements/conversation";
import { Message } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { PromptInput, PromptInputTextarea, PromptInputToolbar, PromptInputTools, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Loader } from "@/components/ai-elements/loader";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { Card } from "@/components/ui/card";

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

  const { messages, sendMessage, status, setMessages } = useChat({
    body: conversationId ? { id: conversationId } : undefined,
  });
  const [input, setInput] = React.useState<string>("");
  const isLoading = status !== 'ready';

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
          content: m.text,
        }));
        setMessages(restored as unknown as Array<{ id: string; role: string; content: string }>);
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
                  <Suggestion onClick={(s) => setInput(s)} text="Summarize our latest product update" />
                  <Suggestion onClick={(s) => setInput(s)} text="Show underutilized licenses" />
                  <Suggestion onClick={(s) => setInput(s)} text="What does our SSO setup require?" />
                </div>
              </div>
            </Card>
          ) : null}

          <Conversation>
            {messages.map((m) => (
              <Message key={m.id} role={m.role}>
                {/*
                  Elements' Response automatically handles markdown, code fences, and styling.
                  If the model emits code blocks, CodeBlock is used inside Response.
                */}
                <Response>{typeof m.content === "string" ? m.content : ""}</Response>

                {/* Render tool events/results if present in message data parts (handled by Elements in typical setups) */}
                {/* Example: <Tool name="retrieve" status="complete"> ... </Tool> */}
              </Message>
            ))}

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
              await (sendMessage as unknown as (arg: unknown) => Promise<void>)({ content: input });
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


