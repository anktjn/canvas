# Discovered Apps - Complete Query Coverage

## ✅ Fully Supported Query Types

### **List & Search Queries** → `discovered_apps_list` tool

**Component:** `DiscoveredAppsList`

**Example Questions:**
- "Show me all discovered apps"
- "List apps with high risk"
- "Find apps in the Productivity category"
- "Show Trackable Apps"
- "List apps with more than 10 accounts"
- "Find apps discovered from GitHub"
- "Show apps with Medium risk level"
- "List Integrable Apps"
- "Search for apps containing 'Slack'"
- "Show apps with Unclassified status"
- "Find apps with less than 5 accounts"
- "List apps in Security category"

**Supports Filters:**
- ✅ App Type (`Trackable App` / `Integrable App`)
- ✅ Status (`Unclassified`, etc.)
- ✅ Risk Level (`Low` / `Medium` / `High`)
- ✅ Software Category (searches within comma-separated categories)
- ✅ Source (searches within comma-separated sources)
- ✅ Min Accounts (number)
- ✅ Max Accounts (number)
- ✅ Search (`name`, `category`, `source`, `risk`, `URL`)

**Returns:**
- List of apps matching filters
- Total count
- Applied filters displayed as badges
- App details: name, type, accounts, categories, sources, risk, status, last used, discovery URL

---

## Component Features

### **DiscoveredAppsList Component**

**Features:**
- ✅ **Search Input** - Real-time search by name, category, source, risk, or URL
- ✅ **Sort Dropdown** - 8 sorting options:
  - Name (A-Z, Z-A)
  - Accounts (Most to Least, Least to Most)
  - Risk (High to Low, Low to High)
  - Last Used (Recently Used, Oldest Used)
- ✅ **Filter Badges** - Visual display of active filters
- ✅ **Risk Indicators** - Color-coded risk badges (High=red, Medium=yellow, Low=green)
- ✅ **Clickable URLs** - Direct links to discovery source
- ✅ **Responsive Design** - Works on mobile and desktop

---

## Summary

✅ **100% Coverage** - All API capabilities are supported with the `DiscoveredAppsList` component.

The AI will automatically use the `discovered_apps_list` tool when users ask about discovered apps, and the component provides a rich, interactive experience with search, sorting, and filtering capabilities.

