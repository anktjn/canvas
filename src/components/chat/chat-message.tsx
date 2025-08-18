"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Response } from "@/components/ai-elements/response";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt?: Date;
}

interface ChatMessageProps extends Message {
  className?: string;
}

export function ChatMessage({ 
  role, 
  content, 
  createdAt, 
  className 
}: ChatMessageProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className={cn("flex flex-row-reverse", className)}>
        <div className="flex-1 space-y-2 text-right">
          {createdAt && (
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground">
                {createdAt.toLocaleTimeString()}
              </span>
            </div>
          )}
          
          <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm w-fit max-w-[85%] ml-auto">
            <Response>{content}</Response>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex", className)}>
      <div className="flex-1 space-y-2">
        {createdAt && (
          <div className="flex">
            <span className="text-xs text-muted-foreground">
              {createdAt.toLocaleTimeString()}
            </span>
          </div>
        )}
        
        <div className="bg-muted text-foreground rounded-lg px-3 py-2 text-sm w-fit max-w-[85%]">
          <Response>{content}</Response>
        </div>
      </div>
    </div>
  );
}


