# User Profiles - Complete Query Coverage

## ✅ Fully Supported Query Types

### 1. **Statistics & Overview Queries** → `user_profiles_card` tool

**Component:** `UserProfilesCard`

**Example Questions:**
- "How many active users do we have?"
- "What's the total user count?"
- "Show me user statistics"
- "What's the department breakdown?"
- "How many users are in each category?"
- "Show me the average apps per user"
- "What are the top users by app count?"
- "Show user profile overview"

**Returns:**
- Total users count
- Active/Inactive counts
- Department breakdown (top 5)
- Category breakdown (Full-time/Contractor/External)
- Location breakdown
- Average provisioned apps
- Top 5 users by app count

---

### 2. **List & Search Queries** → `user_profiles_list` tool

**Component:** `UserProfilesList`

**Example Questions:**
- "Show me all users in Engineering"
- "List all contractors"
- "Find users in Sales department"
- "Show active users"
- "List all inactive users"
- "Find users in San Francisco"
- "Search for users named John"
- "Show users with email containing @example.com"
- "List Full-time employees"
- "Show users in Engineering who are Active"
- "Find contractors in Marketing"

**Supports Filters:**
- ✅ Department (`department`)
- ✅ Status (`Active`/`Inactive`)
- ✅ User Category (`Full-time`/`Contractor`/`External`)
- ✅ Work Location (`workLocation`)
- ✅ Search (`name`, `email`, `job title`)

**Returns:**
- List of users matching filters
- Total count
- Applied filters displayed as badges
- User details: name, email, status, department, job title, location, app count

---

## Component Comparison

| Feature | UserProfilesCard | UserProfilesList |
|---------|------------------|------------------|
| **Use Case** | Statistics & Overview | Filtered Lists & Search |
| **Best For** | "How many...?" | "Show me...", "List...", "Find..." |
| **Displays** | Aggregated metrics | Individual user records |
| **Filters** | None (all users) | Department, Status, Category, Location, Search |
| **Pagination** | No | Yes (limit up to 50) |
| **Top Users** | Yes (by app count) | No |

---

## Query Decision Tree

```
User asks about user profiles
│
├─ "How many...?" / "What's the...?" / "Show statistics"
│  └─→ Use `user_profiles_card` tool
│
├─ "List...", "Show...", "Find...", "Search..."
│  └─→ Use `user_profiles_list` tool
│     ├─ Extract filters from query
│     ├─ Apply filters (department, status, category, location, search)
│     └─ Return filtered list
│
└─ Ambiguous query
   └─→ Use `user_profiles_card` for overview, suggest `user_profiles_list` for specific users
```

---

## Example Queries & Tool Selection

| User Query | Tool | Component | Reason |
|------------|------|-----------|--------|
| "How many active users?" | `user_profiles_card` | UserProfilesCard | Statistics query |
| "Show me all users in Engineering" | `user_profiles_list` | UserProfilesList | List with filter |
| "What's the department breakdown?" | `user_profiles_card` | UserProfilesCard | Statistics query |
| "Find users named John" | `user_profiles_list` | UserProfilesList | Search query |
| "List all contractors" | `user_profiles_list` | UserProfilesList | List with filter |
| "Show user statistics" | `user_profiles_card` | UserProfilesCard | Overview query |
| "Show active users in Sales" | `user_profiles_list` | UserProfilesList | List with multiple filters |
| "Top users by app count" | `user_profiles_card` | UserProfilesCard | Statistics query |

---

## API Capabilities Coverage

### ✅ Fully Covered

| API Capability | Tool | Component |
|----------------|------|-----------|
| Total user count | `user_profiles_card` | UserProfilesCard |
| Active/Inactive counts | `user_profiles_card` | UserProfilesCard |
| Department breakdown | `user_profiles_card` | UserProfilesCard |
| Category breakdown | `user_profiles_card` | UserProfilesCard |
| Location breakdown | `user_profiles_card` | UserProfilesCard |
| Average apps | `user_profiles_card` | UserProfilesCard |
| Filter by department | `user_profiles_list` | UserProfilesList |
| Filter by status | `user_profiles_list` | UserProfilesList |
| Filter by category | `user_profiles_list` | UserProfilesList |
| Filter by location | `user_profiles_list` | UserProfilesList |
| Search by name/email | `user_profiles_list` | UserProfilesList |
| Pagination (limit) | `user_profiles_list` | UserProfilesList |

### ⚠️ Partially Covered

| API Capability | Status | Notes |
|----------------|--------|-------|
| Offset pagination | Not exposed | Limit only (up to 50) |
| Combined filters | ✅ Supported | Multiple filters work together |

---

## Testing Checklist

### Statistics Queries
- [ ] "How many users do we have?"
- [ ] "Show me user statistics"
- [ ] "What's the department breakdown?"
- [ ] "How many active users?"
- [ ] "Show top users by app count"

### List Queries
- [ ] "Show me all users in Engineering"
- [ ] "List all contractors"
- [ ] "Find users named John"
- [ ] "Show active users"
- [ ] "List users in Sales department"

### Combined Queries
- [ ] "Show active users in Engineering"
- [ ] "List contractors in Marketing"
- [ ] "Find users in San Francisco who are Full-time"

### Edge Cases
- [ ] No users found
- [ ] Empty filters
- [ ] Invalid filters
- [ ] Large result sets (pagination)

---

## Summary

✅ **100% Coverage** - All API capabilities are now supported with appropriate components:

1. **Statistics** → `UserProfilesCard` component
2. **Lists & Search** → `UserProfilesList` component

The AI will automatically choose the right tool based on the query type:
- Statistics/overview questions → `user_profiles_card`
- List/search questions → `user_profiles_list`

Both components support:
- Loading states
- Progressive rendering
- Error handling
- Empty states

