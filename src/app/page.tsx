"use client";

import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Chat from "@/components/chat/Chat";

export default function Home() {
  return (
    <div className="font-sans min-h-screen w-full flex justify-center p-6 sm:p-10">
      <main className="w-full max-w-5xl space-y-8">
        <SiteHeader />

        <Card>
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>Ask questions and see inline UI responses.</CardDescription>
          </CardHeader>
          <CardContent>
            <Chat />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
