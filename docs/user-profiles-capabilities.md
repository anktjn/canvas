# User Profiles API Capabilities & Component Coverage

## Supported Query Types

Based on `user-profiles.ts`, the API supports:

### 1. **Statistics Queries** ✅ Covered by `UserProfilesCard`
- Total user count
- Active/Inactive counts
- Department breakdown
- Category breakdown (Full-time/Contractor/External)
- Location breakdown
- Average provisioned apps
- Top users by app count

**Example Questions:**
- "How many active users do we have?"
- "What's the department breakdown?"
- "Show me user statistics"
- "How many users are in each category?"

### 2. **Filtered List Queries** ❌ NOT FULLY COVERED
- Filter by department
- Filter by status (Active/Inactive)
- Filter by user category
- Filter by work location
- Search by name/email/job title
- Pagination (limit/offset)

**Example Questions:**
- "Show me all users in Engineering"
- "List all contractors"
- "Find users in San Francisco"
- "Search for users named John"
- "Show active users in Sales department"

### 3. **Combined Queries** ⚠️ PARTIALLY COVERED
- Statistics for filtered subset
- Top users in a department
- Users with most apps in a category

**Example Questions:**
- "How many users are in Engineering?"
- "Show top users in Sales department"
- "List contractors with most apps"

## Current Component Coverage

### ✅ `UserProfilesCard` - Statistics Overview
**Handles:**
- Overall statistics
- Breakdowns (department, category, location)
- Top users by app count
- Average metrics

**Missing:**
- Filtered statistics (e.g., "Engineering department stats")
- User list display

### ❌ Missing: `UserProfilesList` Component
**Needed for:**
- Displaying filtered user lists
- Search results
- Department/category/location-specific lists
- Paginated results

## Recommendations

1. **Create `UserProfilesList` component** for filtered lists
2. **Enhance tool** to detect query type (stats vs list)
3. **Add filtering support** to stats card for department/category-specific stats
4. **Create unified component** that can switch between stats and list views

