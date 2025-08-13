"use client";

import Link from "next/link";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Conversation = { id: string; title: string | null; updated_at: string };

export function SiteHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/memory/list?limit=30`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data?.conversations) ? data.conversations : [];
        setConversations(list);
      } catch {}
    })();
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    const idFromUrl = searchParams.get("c");
    setSelectedId(idFromUrl ?? undefined);
  }, [searchParams]);

  function startNewChat() {
    const newId = crypto.randomUUID();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chat:conversation-id", newId);
    }
    const qs = new URLSearchParams(Array.from(searchParams.entries()));
    qs.set("c", newId);
    router.push(`/?${qs.toString()}`);
  }

  function selectConversation(id: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chat:conversation-id", id);
    }
    const qs = new URLSearchParams(Array.from(searchParams.entries()));
    qs.set("c", id);
    router.push(`/?${qs.toString()}`);
  }

  return (
    <header className="flex items-center justify-between w-full py-4">
      <Link href="/" className="font-semibold text-sm">
        Canvas
      </Link>
      <div className="flex items-center gap-2">
        <Select value={selectedId} onValueChange={(v) => selectConversation(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select conversation" />
          </SelectTrigger>
          <SelectContent>
            {conversations.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title?.trim() ? c.title : `Conversation ${c.id.slice(0, 8)}…`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={startNewChat}>New chat</Button>
        <ThemeToggle />
      </div>
    </header>
  );
}


