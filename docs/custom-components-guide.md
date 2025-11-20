# Custom Components & Tool Calling Guide

## Overview

This guide explains how to create custom UI components that are rendered through AI tool calls in Canvas AI. The system allows you to define tools that return structured UI payloads, which are then rendered as React components in the chat interface.

## Architecture Flow

```
User Query → AI Model → Tool Call → Tool Execute Function → UI Payload → renderToolOutput → Custom Component
```

## Step-by-Step Process

### 1. Define the Tool in `tools.ts`

A tool has three parts:
- **description**: Tells the AI when to use this tool
- **inputSchema**: Zod schema defining tool parameters
- **execute**: Async function that returns a UI payload

**Example Structure:**
```typescript
tool_name: {
  description: 'When to use this tool...',
  inputSchema: z.object({
    param1: z.string(),
    param2: z.number().optional(),
  }),
  execute: async ({ param1, param2 }) => {
    // Fetch data, process, etc.
    const data = await fetchSomeData(param1, param2);
    
    // Return UI payload
    return {
      ui: {
        type: 'your-component-type', // Must match renderToolOutput
        props: {
          // All props your component needs
          title: data.title,
          items: data.items,
          // ...
        },
      },
    };
  },
} satisfies Tool,
```

### 2. Create the Custom Component

Create a React component in `/src/components/custom-components/`:

```typescript
"use client";
import React from 'react';

export type YourComponentProps = {
  title?: string;
  items?: Array<{ id: string; name: string }>;
  isLoading?: boolean;
  progressive?: boolean;
};

export const YourComponent: React.FC<YourComponentProps> = ({
  title = 'Default Title',
  items = [],
  isLoading = false,
  progressive = false,
}) => {
  // Component implementation
  return (
    <div className="rounded-lg border p-4">
      {/* Your UI */}
    </div>
  );
};
```

**Best Practices:**
- Use TypeScript with proper prop types
- Support `isLoading` and `progressive` props for better UX
- Use Tailwind CSS and shadcn/ui components
- Make it responsive and accessible

### 3. Register in `renderToolOutput`

In `/src/components/ai/ChatConversation.tsx`, add your component to the `renderToolOutput` function:

```typescript
function renderToolOutput(output: any): React.ReactNode {
  if (!output) return null;
  
  if (output.ui && typeof output.ui?.type === "string") {
    const t = output.ui.type as string;
    
    // Add your new component here
    if (t === "your-component-type") {
      return <YourComponent {...(output.ui.props ?? {})} />;
    }
    
    // ... existing components
  }
}
```

### 4. Add Loading State (Optional)

For better UX during tool execution, add a loading placeholder in the tool call rendering section (around line 267-290):

```typescript
if (type.startsWith("tool-")) {
  if (state !== "output-available") {
    const toolName = type.slice(5) || 'tool';
    return (
      <div key={`tool-reasoning-${idx}`} className="w-full flex flex-col gap-2">
        <Reasoning className="w-full" isStreaming={status === 'streaming'}>
          <ReasoningTrigger />
          <ReasoningContent>{`Using ${toolName}…`}</ReasoningContent>
        </Reasoning>
        {toolName === 'your_tool_name' && (
          <MessageContent>
            <YourComponent
              isLoading={true}
              progressive={true}
              // ... default props
            />
          </MessageContent>
        )}
      </div>
    );
  }
  // ... rest of rendering
}
```

## Example: Underutilized Licenses Card

### Tool Definition (`tools.ts`)

```typescript
underutilized_licenses_card: {
  description: 'Show a card with underutilized license counts...',
  inputSchema: z.object({
    organizationName: z.string().optional(),
    utilizationThresholdPercent: z.number().min(0).max(100).default(20),
    // ...
  }),
  execute: async ({ organizationName, ... }) => {
    const { data, error } = await fetchUnderutilizedLicensesSummary({...});
    
    if (error || !data) {
      return {
        ui: {
          type: 'card',
          props: {
            title: 'Error',
            body: `Unable to fetch: ${error}`,
          },
        },
      };
    }
    
    return {
      ui: {
        type: 'underutilized-licenses-card',
        props: {
          organizationName: data.organizationName,
          totalLicenses: data.totalLicenses,
          // ... map all props
        },
      },
    };
  },
} satisfies Tool,
```

### Component (`UnderutilizedLicensesCard.tsx`)

- Receives props from tool output
- Handles loading states
- Progressive reveal for better UX
- Uses shadcn/ui components

### Rendering (`ChatConversation.tsx`)

```typescript
if (t === "underutilized-licenses-card") {
  return <UnderutilizedLicensesCard {...(output.ui.props ?? {})} />;
}
```

## Key Patterns

### 1. Error Handling

Always handle errors gracefully:

```typescript
if (error || !data) {
  return {
    ui: {
      type: 'card',
      props: {
        title: 'Error Title',
        body: `Error message: ${error || 'Unknown error'}`,
      },
    },
  };
}
```

### 2. Data Fetching

Tools can fetch from:
- External APIs (via environment variables)
- Internal API routes (`/api/*`)
- Data utility functions (`/lib/data/*`)

### 3. UI Types

Current supported types:
- `card`: Simple card with title and body
- `table`: Structured table
- `underutilized-licenses-card`: Custom component
- Add your own types as needed

### 4. Props Mapping

Map API responses to component props:

```typescript
const apps = Array.isArray(provider.topApps)
  ? provider.topApps.map((t) => ({
      appName: String(t.appName ?? 'Unknown'),
      instanceName: String(t.instanceName ?? '—'),
      accountsCount: Number(t.underutilizedCount ?? 0),
    }))
  : undefined;
```

## Testing Your Component

1. **Test the tool directly**: Call the tool execute function with test data
2. **Test in chat**: Ask the AI a question that triggers your tool
3. **Test loading states**: Check the progressive rendering
4. **Test error cases**: Ensure graceful error handling

## Common Pitfalls

1. **Type mismatch**: Ensure `output.ui.type` matches the string in `renderToolOutput`
2. **Missing props**: Provide default values in component props
3. **Async errors**: Always wrap async operations in try-catch
4. **Loading states**: Don't forget to handle loading/streaming states

## Next Steps

See `docs/user-profiles-example.md` for a complete example using user profiles data.

