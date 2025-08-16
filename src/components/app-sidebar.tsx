"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
import { RenameDialog } from "@/components/ui/rename-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Conversation {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

export function AppSidebar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentConversationId = searchParams.get('c')
  
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false)
  const [conversationToRename, setConversationToRename] = React.useState<Conversation | null>(null)
  const [isRenaming, setIsRenaming] = React.useState(false)

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
      // Create a new conversation ID
      const newId = crypto.randomUUID()
      // Navigate to the new chat
      router.push(`/?c=${newId}`)
      // Refresh the list to show the new conversation
      setTimeout(() => loadConversations(), 100)
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

  return (
    <div className="flex h-full w-100 flex-col border-r bg-background">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Canvas AI</span>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4 flex gap-2">
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
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-2 p-2">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Navigation
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
            >
              <Database className="h-4 w-4" />
              Knowledge Base
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Conversation History */}
          <div className="space-y-2 p-2">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Chats
            </div>
            
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
                    <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-3 bg-muted rounded w-20 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent",
                    currentConversationId === conversation.id && "bg-accent"
                  )}
                >
                  <div 
                    className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                    onClick={() => selectConversation(conversation.id)}
                  >
                    <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {getConversationTitle(conversation)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{formatTimestamp(conversation.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Three-dot menu - always visible with fixed width */}
                  <div className="flex-shrink-0 ml-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRename(conversation)
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
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          AI Assistant Online
        </div>
      </div>

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
    </div>
  )
}
