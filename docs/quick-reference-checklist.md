# Quick Reference: Creating Custom Components

## Checklist for New Custom Component

### ✅ Step 1: Create Component File
- [ ] Create `/src/components/custom-components/YourComponent.tsx`
- [ ] Define TypeScript props interface
- [ ] Support `isLoading` and `progressive` props
- [ ] Use shadcn/ui components and Tailwind CSS
- [ ] Make it responsive and accessible

### ✅ Step 2: Define Tool
- [ ] Add tool to `/src/lib/ai/tools.ts`
- [ ] Write clear `description` for AI
- [ ] Define `inputSchema` with Zod
- [ ] Implement `execute` function:
  - [ ] Fetch data (API, data files, etc.)
  - [ ] Handle errors gracefully
  - [ ] Transform data to component props
  - [ ] Return `{ ui: { type: string, props: object } }`

### ✅ Step 3: Register Component
- [ ] Import component in `ChatConversation.tsx`
- [ ] Add to `renderToolOutput()` function:
  ```typescript
  if (t === "your-component-type") {
    return <YourComponent {...(output.ui.props ?? {})} />;
  }
  ```
- [ ] Add loading state (optional):
  ```typescript
  {toolName === 'your_tool_name' && (
    <YourComponent isLoading={true} progressive={true} />
  )}
  ```

### ✅ Step 4: Update System Prompt (Optional)
- [ ] Add tool description to `/src/app/api/chat/route.ts` system prompt

### ✅ Step 5: Test
- [ ] Test tool execute function directly
- [ ] Test in chat interface
- [ ] Test loading states
- [ ] Test error cases

## File Locations

| Item | Location |
|------|----------|
| Custom Components | `/src/components/custom-components/` |
| Tools Definition | `/src/lib/ai/tools.ts` |
| Component Registration | `/src/components/ai/ChatConversation.tsx` |
| System Prompt | `/src/app/api/chat/route.ts` |
| Data Sources | `/src/lib/data/*.ts` |

## Type Matching

**Critical:** The `type` string must match exactly in three places:

1. **Tool return:** `type: 'your-component-type'`
2. **renderToolOutput:** `if (t === "your-component-type")`
3. **Loading state:** `toolName === 'your_tool_name'` (snake_case)

## Example Template

### Component (`YourComponent.tsx`)
```typescript
export type YourComponentProps = {
  title?: string;
  data: string[];
  isLoading?: boolean;
  progressive?: boolean;
};

export const YourComponent: React.FC<YourComponentProps> = ({
  title = 'Default',
  data = [],
  isLoading = false,
  progressive = false,
}) => {
  return <Card>{/* Your UI */}</Card>;
};
```

### Tool (`tools.ts`)
```typescript
your_tool: {
  description: 'When to use this tool...',
  inputSchema: z.object({
    param: z.string(),
  }),
  execute: async ({ param }) => {
    const data = await fetchData(param);
    return {
      ui: {
        type: 'your-component-type',
        props: { title: 'Title', data }
      }
    };
  },
} satisfies Tool,
```

### Registration (`ChatConversation.tsx`)
```typescript
if (t === "your-component-type") {
  return <YourComponent {...(output.ui.props ?? {})} />;
}
```

## Common Errors

1. **Type mismatch:** `type` string doesn't match between tool and renderer
2. **Missing props:** Component expects props that tool doesn't provide
3. **Import error:** Component not imported in ChatConversation
4. **Async error:** Tool execute function throws unhandled error

## Resources

- Full guide: `docs/custom-components-guide.md`
- Flow diagram: `docs/tool-to-component-flow.md`
- Example: `UnderutilizedLicensesCard.tsx` and `user_profiles_card` tool

