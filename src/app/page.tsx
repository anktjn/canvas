import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatConversation } from "@/components/ai/ChatConversation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <Suspense fallback={null}>
          <AppSidebar />
        </Suspense>
        <SidebarInset>
          <div className="flex h-full justify-center flex-col">
            {/* Main Content - Full Width Chat */}
            <main className="flex-1 overflow-hidden">
              <Suspense fallback={null}>
                <ChatConversation />
              </Suspense>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
