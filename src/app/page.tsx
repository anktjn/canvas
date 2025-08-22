import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatConversation } from "@/components/ai/ChatConversation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-full justify-center flex-col">
          {/* Header with sidebar trigger */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
          </header>
          
          {/* Main Content - Full Width Chat */}
          <main className="flex-1 overflow-hidden">
            <Suspense fallback={null}>
              <ChatConversation />
            </Suspense>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
