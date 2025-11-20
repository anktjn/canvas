# Tool-to-Component Rendering Flow - Complete Example

## Overview

This document explains the complete flow from AI tool call to custom component rendering, using the **User Profiles Card** as a working example.

## Complete Flow Diagram

```
┌─────────────────┐
│  User Query     │
│  "Show user     │
│   statistics"   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Model       │
│  (gpt-4o-mini) │
│  Decides to     │
│  call tool      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tool Call      │
│  user_profiles_ │
│  card           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  tools.ts       │
│  execute()     │
│  function      │
└────────┬────────┘
         │
         ├─► Fetch data from API
         │   (fetchUserProfileStats)
         │
         ├─► Process & transform
         │   (map to component props)
         │
         └─► Return UI payload
             {
               ui: {
                 type: "user-profiles-card",
                 props: { ... }
               }
             }
         │
         ▼
┌─────────────────┐
│  ChatConversation│
│  renderToolOutput│
│  function        │
└────────┬────────┘
         │
         ├─► Check output.ui.type
         │
         └─► Render component
             <UserProfilesCard {...props} />
         │
         ▼
┌─────────────────┐
│  UserProfilesCard│
│  Component       │
│  Renders UI      │
└─────────────────┘
```

## Step-by-Step Implementation

### Step 1: Define Tool in `tools.ts`

```typescript
user_profiles_card: {
  description: 'Show a card with user profile statistics...',
  inputSchema: z.object({
    organizationName: z.string().optional(),
    topKUsers: z.number().int().min(1).max(10).default(5),
  }),
  execute: async ({ organizationName, topKUsers }) => {
    // 1. Fetch data
    const { data, error } = await fetchUserProfileStats();
    
    // 2. Handle errors
    if (error || !data) {
      return {
        ui: {
          type: 'card',
          props: { title: 'Error', body: error }
        }
      };
    }
    
    // 3. Fetch additional data if needed
    const { fetchUserProfiles } = await import('@/lib/data/user-profiles');
    const usersResponse = await fetchUserProfiles({ limit: topKUsers });
    
    // 4. Transform data to component props
    const topUsers = usersResponse.data
      ? usersResponse.data
          .sort((a, b) => b.provisioned_apps_count - a.provisioned_apps_count)
          .slice(0, topKUsers)
          .map((u) => ({
            id: u.id,
            firstName: u.first_name,
            lastName: u.last_name,
            // ... map all fields
          }))
      : [];
    
    // 5. Return UI payload
    return {
      ui: {
        type: 'user-profiles-card',  // Must match renderToolOutput
        props: {
          organizationName,
          totalUsers: data.totalUsers,
          activeUsers: data.activeUsers,
          // ... all props component needs
        },
      },
    };
  },
} satisfies Tool,
```

**Key Points:**
- `description` tells AI when to use the tool
- `inputSchema` defines tool parameters (Zod schema)
- `execute` function:
  - Fetches data (from API, data files, etc.)
  - Handles errors gracefully
  - Transforms data to match component props
  - Returns `{ ui: { type: string, props: object } }`

### Step 2: Create Component in `custom-components/`

```typescript
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type UserProfilesCardProps = {
  title?: string;
  totalUsers: number;
  activeUsers: number;
  // ... all props
  isLoading?: boolean;
  progressive?: boolean;
};

export const UserProfilesCard: React.FC<UserProfilesCardProps> = ({
  title = 'User Profiles Overview',
  totalUsers,
  activeUsers,
  isLoading = false,
  progressive = false,
}) => {
  // Component implementation
  return (
    <Card>
      {/* Your UI */}
    </Card>
  );
};
```

**Key Points:**
- Use TypeScript with proper prop types
- Support `isLoading` and `progressive` for better UX
- Use shadcn/ui components and Tailwind CSS
- Make it responsive

### Step 3: Register in `ChatConversation.tsx`

#### 3a. Import Component

```typescript
import { UserProfilesCard } from "@/components/custom-components/UserProfilesCard";
```

#### 3b. Add Loading State (Optional but Recommended)

```typescript
if (type.startsWith("tool-")) {
  if (state !== "output-available") {
    const toolName = type.slice(5) || 'tool';
    return (
      <div>
        <Reasoning>Using {toolName}…</Reasoning>
        {toolName === 'user_profiles_card' && (
          <MessageContent>
            <UserProfilesCard
              totalUsers={0}
              activeUsers={0}
              inactiveUsers={0}
              isLoading={true}
              progressive={true}
            />
          </MessageContent>
        )}
      </div>
    );
  }
}
```

#### 3c. Add to `renderToolOutput`

```typescript
function renderToolOutput(output: any): React.ReactNode {
  if (output.ui && typeof output.ui?.type === "string") {
    const t = output.ui.type as string;
    
    if (t === "user-profiles-card") {
      return <UserProfilesCard {...(output.ui.props ?? {})} />;
    }
    
    // ... other components
  }
}
```

**Key Points:**
- Type string must match exactly: `"user-profiles-card"` in both places
- Spread props: `{...(output.ui.props ?? {})}`
- Handle missing props with defaults in component

### Step 4: Update System Prompt (Optional)

In `/src/app/api/chat/route.ts`, add guidance for when to use the tool:

```typescript
system: '...\n- Use the "user_profiles_card" tool to present user profile statistics when the user asks about user statistics, employee counts, or department distribution.\n...'
```

## Testing Your Component

1. **Test the tool directly:**
   ```typescript
   const result = await tools.user_profiles_card.execute({
     organizationName: 'Test Org',
     topKUsers: 5
   });
   console.log(result);
   ```

2. **Test in chat:**
   - Ask: "Show me user statistics"
   - Ask: "How many active users do we have?"
   - Ask: "What's the department breakdown?"

3. **Test loading states:**
   - Check progressive rendering
   - Verify loading placeholders appear

4. **Test error cases:**
   - Disconnect API
   - Return invalid data
   - Ensure graceful error handling

## Common Patterns

### Pattern 1: Simple Data Display

```typescript
// Tool returns simple card
return {
  ui: {
    type: 'card',
    props: {
      title: 'Title',
      body: 'Content'
    }
  }
};
```

### Pattern 2: Custom Component

```typescript
// Tool returns custom component
return {
  ui: {
    type: 'your-component-type',
    props: {
      // All component props
    }
  }
};
```

### Pattern 3: Table Display

```typescript
// Tool returns table
return {
  ui: {
    type: 'table',
    props: {
      columns: ['Col1', 'Col2'],
      rows: [{ Col1: 'val1', Col2: 'val2' }]
    }
  }
};
```

## Available Data Sources

You can create tools using data from:

1. **`/lib/data/licenses.ts`** - License utilization data
2. **`/lib/data/user-profiles.ts`** - User profile data and stats
3. **`/lib/data/discovered-apps.ts`** - Discovered apps data
4. **External APIs** - Via environment variables
5. **Internal API routes** - `/api/*` endpoints

## Next Steps

1. Review existing components: `UnderutilizedLicensesCard.tsx`
2. Check available data: `/lib/data/*.ts`
3. Create your component following the pattern
4. Add tool to `tools.ts`
5. Register in `ChatConversation.tsx`
6. Test thoroughly

## Example Queries That Trigger Tools

- "Show underutilized licenses" → `underutilized_licenses_card`
- "What are our user statistics?" → `user_profiles_card`
- "How many active users?" → `user_profiles_card`
- "Show department breakdown" → `user_profiles_card`
- "What docs explain SSO?" → `retrieve`

