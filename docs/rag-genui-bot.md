# RAG-GenUI-Bot: Canvas AI Chat Application

## Overview

**Canvas** is a sophisticated AI-powered chat application that combines **Retrieval-Augmented Generation (RAG)** with **Generative UI** capabilities. Built on Next.js 15 and React 19, it provides an intelligent conversational interface that can access knowledge bases, execute tools, and render dynamic UI components in real-time.

## 🚀 Core Capabilities

### 1. **Intelligent AI Chat**
- **Model**: OpenAI GPT-4o-mini integration via AI SDK
- **Streaming**: Real-time message streaming with typing indicators
- **Memory**: Persistent conversation history and context
- **Tool Execution**: Dynamic tool calling and response rendering

### 2. **Retrieval-Augmented Generation (RAG)**
- **Knowledge Base**: Vector-based document storage and retrieval
- **Content Ingestion**: Web scraping, URL extraction, and bulk crawling
- **Semantic Search**: OpenAI embeddings with similarity scoring
- **Context-Aware Responses**: AI responses grounded in retrieved knowledge

### 3. **Generative UI Components**
- **Dynamic Rendering**: Tool-driven UI component generation
- **Interactive Elements**: Tables, cards, charts, and custom components
- **Real-time Updates**: Live UI updates during tool execution
- **Responsive Design**: Mobile-first, accessible interface

### 4. **Business Intelligence Tools**
- **License Management**: Underutilized license tracking and reporting
- **Data Visualization**: Dynamic table generation and data presentation
- **Custom Components**: Specialized business intelligence cards

## 🏗️ Architecture

### **Frontend Layer**
```
src/app/
├── page.tsx          # Main chat interface
├── layout.tsx        # App layout with theme provider
└── api/              # API endpoints
    ├── chat/         # Main chat API
    ├── ingest/       # Single URL ingestion
    ├── crawl-ingest/ # Bulk web crawling
    └── memory/       # Conversation persistence
```

### **AI Layer**
```
src/lib/ai/
├── model.ts          # LLM configuration and factory
├── tools.ts          # Tool definitions and execution
├── memory.ts         # Conversation persistence
└── ui-stream.ts      # UI streaming utilities
```

### **RAG Layer**
```
src/lib/rag/
├── knowledge-store.ts # Abstract storage interface
├── vector/           # Vector database implementation
│   └── supabase.ts   # Supabase + pgvector integration
├── chunk.ts          # Text chunking algorithms
├── embed.ts          # Embedding generation
├── retrieve.ts       # Knowledge retrieval
└── ingest/           # Content ingestion
    └── url.ts        # URL content extraction
```

### **UI Components**
```
src/components/
├── chat/             # Chat interface components
├── ui/               # shadcn/ui component library
└── custom-components/ # Business-specific components
```

## 🛠️ Tool System

### **Core Tools**

#### 1. **Retrieve Tool**
```typescript
{
  description: "Retrieve top-k context snippets from knowledge base",
  inputSchema: {
    query: string,
    k: number (1-10, default: 3)
  }
}
```
- **Purpose**: Semantic search across ingested documents
- **Output**: Relevant content snippets with source URLs
- **Use Case**: Answering questions about Josys products, setup, integrations

#### 2. **Show Table Tool**
```typescript
{
  description: "Render structured data as a table",
  inputSchema: {
    columns: string[],
    rows: Record<string, unknown>[]
  }
}
```
- **Purpose**: Present structured data in readable format
- **Output**: Interactive table component
- **Use Case**: Data comparison, results presentation

#### 3. **Underutilized Licenses Card Tool**
```typescript
{
  description: "Show license utilization analytics",
  inputSchema: {
    organizationName?: string,
    utilizationThresholdPercent: number (0-100),
    measurementPeriodDays: number,
    topKApps: number (1-10)
  }
}
```
- **Purpose**: Business intelligence and license optimization
- **Output**: Interactive card with utilization metrics
- **Use Case**: License management, cost optimization

## 🔍 RAG Implementation

### **Content Ingestion Pipeline**

1. **URL Extraction**
   - Uses `@extractus/article-extractor` for clean content
   - Handles various content types and formats
   - Extracts title and main content

2. **Text Chunking**
   - Paragraph-based splitting (max 1200 characters)
   - Preserves semantic coherence
   - Optimized for embedding generation

3. **Embedding Generation**
   - OpenAI `text-embedding-3-small` model
   - 1536-dimensional vectors
   - Batch processing for efficiency

4. **Vector Storage**
   - Supabase with pgvector extension
   - PostgreSQL database for reliability
   - Efficient similarity search

### **Retrieval Process**

1. **Query Processing**
   - User question converted to embedding
   - Same embedding model for consistency

2. **Similarity Search**
   - Vector similarity calculation
   - Top-k retrieval with scoring
   - Configurable result count

3. **Context Assembly**
   - Retrieved snippets combined
   - Content length optimization
   - Source attribution

## 🌐 Web Crawling & Ingestion

### **Single URL Ingestion**
- **Endpoint**: `POST /api/ingest`
- **Input**: URL to extract and process
- **Output**: Chunk count and processing status

### **Bulk Crawling**
- **Endpoint**: `POST /api/crawl-ingest`
- **Features**:
  - Configurable depth and page limits
  - Path prefix restrictions
  - Same-origin filtering
  - Error handling and reporting

### **Crawling Parameters**
```typescript
{
  baseUrl: string,           // Starting URL
  pathPrefix?: string,       // Restrict to specific paths
  sameOrigin?: boolean,      // Same hostname only (default: true)
  maxPages?: number,         // Maximum pages (default: 200)
  maxDepth?: number          // Crawl depth (default: 3)
}
```

## 💬 Chat Interface

### **Features**
- **Real-time Streaming**: Live message generation
- **Tool Integration**: Seamless tool execution
- **UI Rendering**: Dynamic component generation
- **Conversation Management**: Persistent chat history
- **Error Handling**: Graceful degradation

### **Message Flow**
1. User sends message
2. AI processes with available tools
3. Tools execute and return results
4. UI components render dynamically
5. Response streams to user
6. Conversation saved to memory

### **UI Message Types**
- **Text Responses**: Standard chat messages
- **Tool Outputs**: Structured data and summaries
- **Custom Components**: Business intelligence cards
- **Interactive Elements**: Tables, forms, charts

## 🔧 Configuration & Environment

### **Required Environment Variables**
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: License Management
LICENSES_API_URL=your_licenses_api_url
```

### **Model Configuration**
- **Chat Model**: GPT-4o-mini (configurable in `src/lib/ai/model.ts`)
- **Embedding Model**: text-embedding-3-small
- **Tool Models**: Configurable per tool

## 📱 User Experience

### **Interface Features**
- **Responsive Design**: Mobile-first approach
- **Theme Support**: Light/dark mode with system preference
- **Accessibility**: ARIA labels, keyboard navigation
- **Real-time Updates**: Live typing indicators and streaming

### **Chat Experience**
- **Conversation Persistence**: Automatic saving and restoration
- **Context Awareness**: Previous conversation memory
- **Tool Transparency**: Clear indication of tool usage
- **Error Recovery**: Graceful handling of failures

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ 
- Supabase account with pgvector extension
- OpenAI API key

### **Installation**
```bash
npm install
npm run dev
```

### **Setup Steps**
1. Configure environment variables
2. Set up Supabase database with pgvector
3. Create required database tables
4. Start development server

### **Database Schema**
```sql
-- Documents table for vector storage
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536)
);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 3
) RETURNS TABLE (
  id bigint,
  url text,
  content text,
  score float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.url,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS score
  FROM documents
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## 🔮 Future Enhancements

### **Planned Features**
- **Multi-modal Support**: Image and document uploads
- **Advanced Analytics**: Usage metrics and insights
- **Custom Tool Creation**: User-defined tool development
- **Integration APIs**: Third-party service connections
- **Advanced RAG**: Hybrid search, re-ranking

### **Scalability Improvements**
- **Vector Clustering**: Efficient similarity search
- **Content Caching**: Reduced embedding generation
- **Distributed Storage**: Multi-region deployment
- **Performance Monitoring**: Real-time metrics

## 📚 API Reference

### **Chat API**
- **Endpoint**: `POST /api/chat`
- **Input**: Messages array, conversation ID
- **Output**: Streaming UI message response

### **Ingestion APIs**
- **Single URL**: `POST /api/ingest`
- **Bulk Crawl**: `POST /api/crawl-ingest`
- **Memory**: `GET/POST /api/memory`

### **Tool Schemas**
Detailed tool schemas available in `src/lib/ai/tools.ts`

## 🐛 Troubleshooting

### **Common Issues**
1. **Missing Environment Variables**: Check all required env vars
2. **Supabase Connection**: Verify database and pgvector setup
3. **OpenAI API**: Check API key and rate limits
4. **Vector Search**: Ensure database functions are created

### **Debug Mode**
Enable debug mode with environment variable:
```bash
NEXT_PUBLIC_DEBUG_CHAT=1
```

## 🤝 Contributing

### **Development Guidelines**
- Follow TypeScript best practices
- Use shadcn/ui components for consistency
- Implement proper error handling
- Add comprehensive tests for new features

### **Architecture Principles**
- **Separation of Concerns**: Clear layer boundaries
- **Extensibility**: Easy tool and component addition
- **Performance**: Efficient vector operations and caching
- **Reliability**: Graceful degradation and error recovery

---

**Canvas** represents a modern approach to AI-powered applications, combining the power of large language models with structured knowledge retrieval and dynamic user interface generation. It's designed to be both powerful for end users and extensible for developers.
