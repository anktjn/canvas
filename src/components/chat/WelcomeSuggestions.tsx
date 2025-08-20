"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Suggestion } from "@/components/ai-elements/suggestion";

interface WelcomeSuggestionsProps {
  aiSuggestions: string[];
  isLoadingSuggestions: boolean;
  onSuggestionClick: (suggestion: string) => void;
}

export function WelcomeSuggestions({ 
  aiSuggestions, 
  isLoadingSuggestions, 
  onSuggestionClick 
}: WelcomeSuggestionsProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="mx-auto min-w-sm max-w-4xl w-full">
        <Card className="w-full border-0 p-4 sm:p-8 text-center shadow-none">
          <div className="mx-auto max-w-2xl space-y-3 text-left">
            <h2 className="text-xl sm:text-2xl font-semibold">Welcome to Canvas AI</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Start a conversation or use a suggestion below.</p>
            <div className="flex flex-wrap gap-1 sm:gap-2 pt-2">
              {aiSuggestions.length > 0 ? (
                aiSuggestions.map((s) => (
                  <Suggestion key={s} onClick={onSuggestionClick} suggestion={s} />
                ))
              ) : isLoadingSuggestions ? (
                <div className="text-sm text-muted-foreground">Loading suggestions...</div>
              ) : (
                <>
                  <Suggestion onClick={onSuggestionClick} suggestion="What are the top priorities of a Josys Admin" />
                  <Suggestion onClick={onSuggestionClick} suggestion="Show top 5 apps with underutilized licenses" />
                  <Suggestion onClick={onSuggestionClick} suggestion="What does our SSO setup require in Josys?" />
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
