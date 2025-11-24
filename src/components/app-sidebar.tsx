"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  Plus, 
  MessageSquare, 
  Database, 
  Settings, 
  Clock,
  Sparkles,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RenameDialog } from "./rename-dialog"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar
} from "@/components/ui/sidebar"

interface Conversation {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

export function AppSidebar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const currentConversationId = searchParams.get('c')
  const { state } = useSidebar()
  
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false)
  const [conversationToRename, setConversationToRename] = React.useState<Conversation | null>(null)
  const [isRenaming, setIsRenaming] = React.useState(false)
  const [hoveredConversationId, setHoveredConversationId] = React.useState<string | null>(null)
  const [openDropdownId, setOpenDropdownId] = React.useState<string | null>(null)

  // Load conversations from API
  const loadConversations = async () => {
    try {
      setIsLoading(true)
      console.log('Loading conversations...')
      const response = await fetch('/api/memory')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('API response:', data)
      if (data.conversations) {
        setConversations(data.conversations)
      } else {
        console.error('No conversations in response:', data)
        setConversations([])
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadConversations()
  }, [])

  // Refresh conversations list
  const refreshConversations = () => {
    loadConversations()
  }

  const createNewChat = async () => {
    try {
      const newId = crypto.randomUUID()
      // set as current in localStorage so ChatConversation picks it up immediately
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('chat:conversation-id', newId)
      }
      // Navigate to the new chat URL with ?c=
      router.push(`/?c=${newId}`)
      // Optimistically add to the top of the list with a placeholder title
      setConversations((prev) => [
        { id: newId, title: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ...prev,
      ])
      // Defer a background refresh
      setTimeout(() => loadConversations(), 250)
    } catch (error) {
      console.error('Failed to create new chat:', error)
    }
  }

  const selectConversation = (id: string) => {
    router.push(`/?c=${id}`)
  }

  const handleRename = (conversation: Conversation) => {
    console.log('Opening rename dialog for conversation:', conversation.id, 'Current title:', conversation.title)
    setConversationToRename(conversation)
    setRenameDialogOpen(true)
  }

  const handleRenameSubmit = async (newTitle: string) => {
    if (!conversationToRename) return
    
    try {
      setIsRenaming(true)
      const response = await fetch('/api/memory', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: conversationToRename.id,
          title: newTitle,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to rename conversation')
      }

      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationToRename.id 
            ? { ...conv, title: newTitle }
            : conv
        )
      )
    } catch (error) {
      console.error('Failed to rename conversation:', error)
      throw error
    } finally {
      setIsRenaming(false)
    }
  }

  const deleteConversation = async (id: string) => {
    console.log('Deleting conversation:', id)
    try {
      const response = await fetch(`/api/memory?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete conversation')
      }

      console.log('Successfully deleted conversation:', id)
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== id))
      
      // If this was the current conversation, navigate to home
      if (currentConversationId === id) {
        router.push('/')
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getConversationTitle = (conversation: Conversation) => {
    if (conversation.title) return conversation.title
    return `Chat ${conversation.id.slice(0, 8)}`
  }

  const isCollapsed = state === "collapsed"

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Canvas AI</span>
          </div>
          <ThemeToggle />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* New Chat Button */}
        <div className="p-2 flex gap-2">
          {!isCollapsed ? (
            <>
              <Button 
                onClick={createNewChat}
                className="flex-1 justify-start gap-2"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
              <Button
                onClick={refreshConversations}
                variant="outline"
                size="sm"
                className="px-2"
                title="Refresh conversations"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button 
              onClick={createNewChat}
              variant="outline"
              size="sm"
              className="w-full"
              title="New Chat"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Separator />

        {/* Navigation */}
        <div className="space-y-1 py-2 px-2">
          {!isCollapsed && (
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Navigation
            </div>
          )}
          
          <Button
            variant={pathname === "/" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "w-full justify-start gap-2",
              isCollapsed && "justify-center px-2",
              pathname === "/" && "bg-secondary"
            )}
            title={isCollapsed ? "Chat" : undefined}
            onClick={() => router.push("/")}
          >
            <MessageSquare className="h-4 w-4" />
            {!isCollapsed && "Chat"}
          </Button>
          
          <Link href="/knowledge" className="block w-full">
            <Button
              asChild={false}
              variant={pathname === "/knowledge" ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-start gap-2",
                isCollapsed && "justify-center px-2",
                pathname === "/knowledge" && "bg-secondary"
              )}
              title={isCollapsed ? "Knowledge Base" : undefined}
            >
              <>
                <Database className="h-4 w-4" />
                {!isCollapsed && "Knowledge Base"}
              </>
            </Button>
          </Link>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings className="h-4 w-4" />
            {!isCollapsed && "Settings"}
          </Button>
        </div>

        <Separator />

        {/* Conversation History */}
        <div className="space-y-2 p-2">
          {!isCollapsed && (
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Chats
            </div>
          )}
          
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                  {!isCollapsed && (
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-3 bg-muted rounded w-20 animate-pulse" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            !isCollapsed && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No conversations yet
              </div>
            )
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer relative",
                  currentConversationId === conversation.id && "bg-accent",
                  isCollapsed && "justify-center px-2"
                )}
                onClick={() => selectConversation(conversation.id)}
                onMouseEnter={() => setHoveredConversationId(conversation.id)}
                onMouseLeave={() => setHoveredConversationId(null)}
              >
                {isCollapsed ? (
                  <div 
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted"
                    title={getConversationTitle(conversation)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0 truncate font-medium pr-2">
                      {getConversationTitle(conversation)}
                    </div>
                    
                    <div className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {formatTimestamp(conversation.updated_at)}
                    </div>

                    {(hoveredConversationId === conversation.id || openDropdownId === conversation.id) && (
                      <div 
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/95 rounded"
                        onMouseEnter={() => setHoveredConversationId(conversation.id)}
                        onMouseLeave={() => {
                          if (openDropdownId !== conversation.id) {
                            setHoveredConversationId(null)
                          }
                        }}
                      >
                        <DropdownMenu 
                          open={openDropdownId === conversation.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setOpenDropdownId(conversation.id)
                            } else {
                              setOpenDropdownId(null)
                              setHoveredConversationId(null)
                            }
                          }}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-accent"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRename(conversation)
                                setOpenDropdownId(null)
                              }}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteConversation(conversation.id)
                                setOpenDropdownId(null)
                              }}
                              className="cursor-pointer text-destructive focus:text-destructive"
                              variant="destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </SidebarContent>

      {/* Rename Dialog */}
      {conversationToRename && (
        <RenameDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          currentTitle={getConversationTitle(conversationToRename)}
          onRename={handleRenameSubmit}
          isLoading={isRenaming}
        />
      )}
    </Sidebar>
  )
}
