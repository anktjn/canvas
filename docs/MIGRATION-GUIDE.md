# Migration Guide: Persist Full Chat Messages with UI Components

## Problem Fixed
Previously, only text content of messages was saved to the database. Tool outputs containing UI components (charts, cards, lists) were lost when reloading conversations. This migration adds support for persisting the complete message structure.

## What Changed

### 1. Database Schema
Added a `parts` JSONB column to the `chat_messages` table to store the full message structure including tool outputs with UI components.

### 2. Code Updates
- **memory.ts**: Updated types and functions to handle full message parts
- **API route**: Now serializes/deserializes complete message structure
- **ChatConversation**: Passes and restores full parts when saving/loading

## Migration Steps

### Step 1: Update Your Database Schema

Run the following SQL in your Supabase SQL Editor:

```sql
-- Add the parts column to store full message structure
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS parts jsonb;
```

Alternatively, you can run the complete schema from `supabase-schema.sql` which includes:
- The new `parts` column
- All required tables (if they don't exist)
- Proper indexes for performance

### Step 2: No Code Changes Needed!
All code changes have been applied. The system will now:
1. **Save**: Store both text summaries AND full message parts (including tool outputs)
2. **Load**: Restore messages with their complete structure
3. **Fallback**: If `parts` is missing/null, fall back to text-only display

### Step 3: Test the Fix

1. **Start a new conversation**:
   ```bash
   npm run dev
   ```

2. **Ask for a chart or card**:
   - "Show me a chart of user distribution by department"
   - "Show underutilized licenses"
   - "List all users in Engineering department"

3. **Refresh the page** - The UI components should still be there!

4. **Verify in database**:
   ```sql
   SELECT id, role, 
          length(content) as text_length,
          jsonb_typeof(parts) as parts_type,
          jsonb_array_length(parts) as parts_count
   FROM chat_messages 
   WHERE conversation_id = 'your-conversation-id'
   ORDER BY created_at DESC;
   ```

   You should see:
   - `parts_type` = `array`
   - `parts_count` > 0 for messages with tool outputs

## What Gets Persisted Now

### Before (Text Only)
```json
{
  "id": "msg-123",
  "role": "assistant",
  "content": "Chart displayed: Users by Department"
}
```
❌ Chart component is lost on refresh

### After (Full Structure)
```json
{
  "id": "msg-123",
  "role": "assistant",
  "content": "Chart displayed: Users by Department",
  "parts": [
    {
      "type": "tool-show_chart",
      "state": "output-available",
      "output": {
        "ui": {
          "type": "chart",
          "props": {
            "title": "Users by Department",
            "type": "bar",
            "data": [...],
            "xAxisKey": "name",
            "seriesKeys": ["count"]
          }
        }
      }
    }
  ]
}
```
✅ Chart component is fully restored on refresh

## Backwards Compatibility

✅ **Old messages still work**: Messages without `parts` will display using the text-only fallback.

✅ **No data loss**: Existing conversations continue to work normally.

✅ **Gradual migration**: New messages get full structure; old messages stay as-is.

## Performance Considerations

- **JSONB column**: Efficient storage and indexing in PostgreSQL
- **Selective serialization**: Only tool outputs with UI components are stored in `parts`
- **Text fallback**: `content` column still stores text for fast search/display

## Troubleshooting

### Issue: Charts/cards still not showing after refresh

**Check 1**: Verify the `parts` column exists
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND column_name = 'parts';
```

**Check 2**: Verify data is being saved
```sql
SELECT id, role, parts IS NOT NULL as has_parts
FROM chat_messages 
ORDER BY created_at DESC 
LIMIT 5;
```

**Check 3**: Check browser console for errors
- Open DevTools → Console
- Look for JSON parsing errors or API errors

### Issue: Database error "column parts does not exist"

Run the migration SQL:
```sql
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS parts jsonb;
```

### Issue: Old conversations don't show UI components

This is expected! Only **new messages** created after the migration will have full UI components. Old messages will display as text-only.

To "upgrade" an old conversation:
1. Ask the same question again
2. The new response will have full UI components that persist

## Rollback (if needed)

If you need to rollback:

```sql
-- Remove the parts column (optional - it's safe to keep)
ALTER TABLE public.chat_messages 
DROP COLUMN IF EXISTS parts;
```

The app will continue working with text-only messages.

## Architecture Notes

### Message Flow

**1. User sends message** → **2. AI generates response with tool calls** → **3. Tool returns UI component**

**4. Message saved to DB**:
```typescript
{
  id: "msg-123",
  role: "assistant",
  text: "Chart displayed: Users by Department", // For search/display
  parts: [{ type: "tool-show_chart", output: { ui: {...} } }] // Full structure
}
```

**5. User refreshes page** → **6. Load messages from DB** → **7. Restore with full parts**

**8. ChatConversation renders**:
```typescript
// Checks if parts exist
if (Array.isArray(m.parts) && m.parts.length > 0) {
  // Render using full parts (includes UI components)
} else {
  // Fallback to text-only
}
```

### Why Both `content` and `parts`?

- **`content`** (text): Human-readable summary for display, search, and debugging
- **`parts`** (JSONB): Complete structure for full UI restoration

This dual approach provides:
- Fast text search without parsing JSON
- Complete UI restoration when needed
- Backwards compatibility with text-only messages

## Future Enhancements

Potential improvements:
- [ ] Compress large tool outputs before storing
- [ ] Add TTL for old message parts (keep text, drop parts after 90 days)
- [ ] Add migration script to backfill `parts` for recent messages
- [ ] Add analytics on parts storage size

## Questions?

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify database migration was applied
3. Check browser console for errors
4. Verify Supabase environment variables are set correctly

