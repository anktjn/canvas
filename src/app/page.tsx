"use client";

import { AppSidebar } from "@/components/app-sidebar";
import Chat from "@/components/chat/Chat";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-full justify-center flex-col">
            {/* Main Content - Full Width Chat */}
            <main className="flex-1 overflow-hidden">
              <Chat />
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
