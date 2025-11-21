# Chat Persistence Architecture

## Overview
This document explains how chat messages with UI components are persisted and restored.

---

## ❌ BEFORE: Text-Only Persistence (Broken)

### Flow Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User asks: "Show me a chart of users by department"         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. AI calls tool: show_chart                                    │
│    - Fetches user data from Supabase                            │
│    - Generates chart configuration                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Tool returns UI output:                                      │
│    {                                                             │
│      ui: {                                                       │
│        type: "chart",                                            │
│        props: {                                                  │
│          title: "Users by Department",                           │
│          data: [...50 users...],                                 │
│          type: "bar"                                             │
│        }                                                         │
│      }                                                           │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. ChatConversation renders:                                    │
│    - Beautiful interactive bar chart ✅                         │
│    - User sees data visualization                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Message saved to database:                                   │
│    ❌ ONLY TEXT EXTRACTED:                                      │
│    {                                                             │
│      content: "Chart displayed: Users by Department"            │
│      parts: null  ← UI structure lost!                          │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. User refreshes page                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Load message from database:                                  │
│    {                                                             │
│      content: "Chart displayed: Users by Department"            │
│      parts: null                                                 │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. ChatConversation renders:                                    │
│    ❌ Only text: "Chart displayed: Users by Department"         │
│    ❌ No chart component                                        │
│    ❌ User loses the visualization                              │
└─────────────────────────────────────────────────────────────────┘
```

### Problem
The tool output with UI configuration was **converted to text** during save, and the **original structure was lost**.

---

## ✅ AFTER: Full Structure Persistence (Fixed)

### Flow Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User asks: "Show me a chart of users by department"         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. AI calls tool: show_chart                                    │
│    - Fetches user data from Supabase                            │
│    - Generates chart configuration                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Tool returns UI output:                                      │
│    {                                                             │
│      ui: {                                                       │
│        type: "chart",                                            │
│        props: {                                                  │
│          title: "Users by Department",                           │
│          data: [...50 users...],                                 │
│          type: "bar"                                             │
│        }                                                         │
│      }                                                           │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. ChatConversation renders:                                    │
│    - Beautiful interactive bar chart ✅                         │
│    - User sees data visualization                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Message saved to database:                                   │
│    ✅ FULL STRUCTURE SAVED:                                     │
│    {                                                             │
│      content: "Chart displayed: Users by Department",           │
│      parts: [                                                    │
│        {                                                         │
│          type: "tool-show_chart",                               │
│          state: "output-available",                             │
│          output: {                                               │
│            ui: {                                                 │
│              type: "chart",                                      │
│              props: {                                            │
│                title: "Users by Department",                     │
│                data: [...50 users...],                           │
│                type: "bar"                                       │
│              }                                                   │
│            }                                                     │
│          }                                                       │
│        }                                                         │
│      ]  ← Complete structure preserved!                         │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. User refreshes page                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Load message from database:                                  │
│    {                                                             │
│      content: "Chart displayed: Users by Department",           │
│      parts: [                                                    │
│        {                                                         │
│          type: "tool-show_chart",                               │
│          output: { ui: { type: "chart", props: {...} } }        │
│        }                                                         │
│      ]                                                           │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. ChatConversation renders:                                    │
│    ✅ Full message with original structure                      │
│    ✅ Renders ChartCard component                               │
│    ✅ User sees the same chart as before!                       │
│    ✅ Fully interactive                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Solution
The **complete tool output structure** is saved in the `parts` JSONB column, allowing full UI restoration on reload.

---

## Data Structure Comparison

### Database Row Structure

#### Before (Text Only)
```sql
chat_messages
├── id: 123
├── conversation_id: "uuid"
├── external_id: "msg-456"
├── role: "assistant"
├── content: "Chart displayed: Users by Department"  ← Only this
└── created_at: "2025-11-21..."
```

#### After (Full Structure)
```sql
chat_messages
├── id: 123
├── conversation_id: "uuid"
├── external_id: "msg-456"
├── role: "assistant"
├── content: "Chart displayed: Users by Department"  ← Text for search
├── parts: {                                          ← NEW: Full structure
│     "type": "tool-show_chart",
│     "state": "output-available",
│     "output": {
│       "ui": {
│         "type": "chart",
│         "props": {
│           "title": "Users by Department",
│           "type": "bar",
│           "data": [...],
│           "xAxisKey": "name",
│           "seriesKeys": ["count"]
│         }
│       }
│     }
│   }
└── created_at: "2025-11-21..."
```

---

## Code Flow

### Save Flow

```typescript
// 1. In ChatConversation.tsx - Extract message data
const assistantText = messageToText(last);  // "Chart displayed..."
const assistantParts = last.parts;          // [{ type: "tool-...", output: {...} }]

// 2. Prepare to persist
const toPersist = {
  id: last.id,
  role: 'assistant',
  text: assistantText,           // Human-readable summary
  parts: assistantParts,         // ✅ Full structure with UI
};

// 3. Send to API
fetch('/api/memory', {
  method: 'POST',
  body: JSON.stringify({ id: conversationId, messages: [toPersist] })
});

// 4. In memory.ts - Save to database
const rows = messages.map(m => ({
  conversation_id: conversationId,
  external_id: m.id,
  role: m.role,
  content: m.text,
  parts: m.parts ? JSON.stringify(m.parts) : null,  // ✅ Serialize to JSON
}));

supabase.from('chat_messages').upsert(rows);
```

### Load Flow

```typescript
// 1. In memory.ts - Load from database
const { data } = await supabase
  .from('chat_messages')
  .select('external_id, role, content, parts, created_at')  // ✅ Include parts
  .eq('conversation_id', conversationId);

// 2. Deserialize parts
return data.map(row => {
  let parts;
  if (row.parts) {
    const parsed = JSON.parse(row.parts);  // ✅ Parse JSON
    parts = Array.isArray(parsed) ? parsed : undefined;
  }
  
  return {
    id: row.external_id,
    role: row.role,
    text: row.content,
    parts,  // ✅ Include restored parts
  };
});

// 3. In ChatConversation.tsx - Restore messages
const restored = data.messages.map(m => ({
  id: m.id,
  role: m.role,
  // ✅ Use parts if available, fallback to text
  parts: Array.isArray(m.parts) && m.parts.length > 0
    ? m.parts
    : [{ type: 'text', text: m.text }]
}));

setMessages(restored);

// 4. Render - Component tree checks for tool outputs
{Array.isArray(parts) && parts.map(part => {
  if (part.type === "tool-show_chart" && part.output?.ui) {
    // ✅ Render full chart component
    return <ChartCard {...part.output.ui.props} />;
  }
})}
```

---

## Component Rendering Logic

### Before (Text Only)
```typescript
// Message loaded from DB
const message = {
  id: "msg-123",
  role: "assistant",
  parts: [
    { type: "text", text: "Chart displayed: Users by Department" }
  ]
};

// Rendering
return (
  <Message>
    <Response>
      {message.parts[0].text}  // ❌ Just text
    </Response>
  </Message>
);
```

Result: Plain text "Chart displayed: Users by Department"

### After (Full Structure)
```typescript
// Message loaded from DB
const message = {
  id: "msg-123",
  role: "assistant",
  parts: [
    {
      type: "tool-show_chart",
      state: "output-available",
      output: {
        ui: {
          type: "chart",
          props: {
            title: "Users by Department",
            type: "bar",
            data: [...]
          }
        }
      }
    }
  ]
};

// Rendering
return (
  <Message>
    {parts.map(part => {
      if (part.type.startsWith("tool-") && part.output?.ui) {
        // ✅ Render UI component
        return renderToolOutput(part.output);
      }
    })}
  </Message>
);

// renderToolOutput function
function renderToolOutput(output) {
  if (output.ui?.type === "chart") {
    return <ChartCard {...output.ui.props} />;  // ✅ Full chart
  }
}
```

Result: Interactive bar chart with data!

---

## Supported UI Components

All these now persist correctly:

### 1. Charts
```json
{
  "ui": {
    "type": "chart",
    "props": {
      "title": "Users by Department",
      "type": "bar|line|area|pie",
      "data": [...],
      "xAxisKey": "name",
      "seriesKeys": ["count"]
    }
  }
}
```

### 2. Cards
```json
{
  "ui": {
    "type": "card",
    "props": {
      "title": "Summary",
      "body": "Description..."
    }
  }
}
```

### 3. License Cards
```json
{
  "ui": {
    "type": "underutilized-licenses-card",
    "props": {
      "totalLicenses": 100,
      "underutilizedCount": 20,
      "apps": [...]
    }
  }
}
```

### 4. User Profile Cards
```json
{
  "ui": {
    "type": "user-profiles-card",
    "props": {
      "totalUsers": 150,
      "activeUsers": 120,
      "topUsers": [...]
    }
  }
}
```

### 5. Lists
```json
{
  "ui": {
    "type": "user-profiles-list",
    "props": {
      "users": [...],
      "totalCount": 50
    }
  }
}
```

### 6. Tables
```json
{
  "ui": {
    "type": "table",
    "props": {
      "columns": ["Name", "Value"],
      "rows": [...]
    }
  }
}
```

---

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Chart Persistence** | ❌ Lost on refresh | ✅ Fully restored |
| **Card Persistence** | ❌ Lost on refresh | ✅ Fully restored |
| **List Persistence** | ❌ Lost on refresh | ✅ Fully restored |
| **Data Structure** | Text only | Complete structure |
| **User Experience** | Poor (must ask again) | Great (same view) |
| **Backwards Compat** | N/A | ✅ Old messages work |
| **Search** | ✅ Text indexed | ✅ Text still indexed |
| **Performance** | Fast | Fast (JSONB) |

---

## Implementation Checklist

- [x] Add `parts` JSONB column to database
- [x] Update `PersistedMessage` type to include parts
- [x] Update `saveMessages` to serialize parts
- [x] Update `loadMessages` to deserialize parts
- [x] Update ChatConversation to save full parts
- [x] Update ChatConversation to restore full parts
- [x] Test chart persistence
- [x] Test card persistence
- [x] Test list persistence
- [x] Verify backwards compatibility
- [x] Document architecture

---

## Questions?

See:
- [MIGRATION-GUIDE.md](../MIGRATION-GUIDE.md) for detailed migration steps
- [CHAT-PERSISTENCE-FIX-SUMMARY.md](../CHAT-PERSISTENCE-FIX-SUMMARY.md) for a quick overview
- [supabase-schema.sql](../supabase-schema.sql) for the database schema

