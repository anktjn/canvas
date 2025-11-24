"use client"

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Trash2, 
  Upload, 
  Globe, 
  Pencil, 
  FileText, 
  Link as LinkIcon,
  Plus,
  Search,
  Loader2,
  FileIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns'; // You might not have date-fns, I'll stick to native Intl

type FileRecord = {
  id: string | number;
  name: string;
  source_type: 'url' | 'upload';
  url?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
  status: string;
  created_at: string;
};

export default function KnowledgePage() {
  const [files, setFiles] = React.useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [url, setUrl] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState("files");
  const [dragActive, setDragActive] = React.useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/files');
      const json = await res.json();
      setFiles(json.files || []);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/files', { method: 'POST', body: form });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error || 'upload failed');
      }
      await load();
      setActiveTab("files");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const uploadFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (file) await handleFileUpload(file);
    e.target.value = '';
  };

  const addUrl = async () => {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error || 'failed');
      }
      setUrl('');
      await load();
      setActiveTab("files");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this source?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/files?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error || 'delete failed');
      }
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const rename = async (id: string | number, name: string) => {
    if (!name.trim()) return;
    // Optimistic update
    setFiles(files.map(f => f.id === id ? { ...f, name } : f));
    
    try {
      const res = await fetch('/api/files', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name }) });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error || 'rename failed');
        await load(); // Revert on error
      }
    } catch (err) {
      console.error(err);
      await load(); // Revert on error
    }
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.url?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
            <h1 className="font-semibold text-sm">Knowledge Base</h1>
          </div>
        </header>

        <div className="flex flex-col gap-8 p-4 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in-50 duration-500 slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Knowledge Sources</h2>
              <p className="text-muted-foreground mt-1">
                Manage documents and URLs to power your AI assistant's context.
              </p>
            </div>
            <Button onClick={() => setActiveTab("add")} className="gap-2" disabled={activeTab === "add"}>
              <Plus className="h-4 w-4" />
              Add Source
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="files">My Sources</TabsTrigger>
                <TabsTrigger value="add">Add New</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="files" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium">All Sources</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search sources..." 
                        className="pl-8" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin mb-4" />
                      <p>Loading your knowledge base...</p>
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="bg-muted/50 rounded-full p-4 mb-4">
                        <DatabaseIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold">No sources found</h3>
                      <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                        {searchQuery 
                          ? "Try adjusting your search terms." 
                          : "Start by adding documents or URLs to your knowledge base."}
                      </p>
                      {!searchQuery && (
                        <Button onClick={() => setActiveTab("add")}>
                          Add your first source
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[400px]">Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date Added</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFiles.map((f) => (
                            <TableRow key={String(f.id)}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3 group">
                                  <div className={cn(
                                    "p-2 rounded-lg",
                                    f.source_type === 'url' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                                  )}>
                                    {f.source_type === 'url' ? <LinkIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <input
                                      defaultValue={f.name}
                                      className="w-full bg-transparent outline-none text-sm font-medium truncate focus:underline decoration-dashed underline-offset-4"
                                      onBlur={(e) => {
                                        if (e.target.value !== f.name) rename(f.id, e.target.value);
                                      }}
                                    />
                                  </div>
                                  <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                  {f.source_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {new Date(f.created_at).toLocaleDateString(undefined, { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => remove(f.id)}
                                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  disabled={busy}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="add" className="grid gap-6 md:grid-cols-2">
              <Card className={cn("transition-all duration-200", dragActive && "border-primary ring-2 ring-primary/20")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-orange-500" />
                    Upload Files
                  </CardTitle>
                  <CardDescription>
                    Upload PDF or Word documents. Maximum 50MB.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors min-h-[200px]",
                      dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/50"
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="bg-muted rounded-full p-4 mb-4">
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">Drag & Drop files here</h3>
                    <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                    <Input 
                      type="file" 
                      accept=".pdf,.docx" 
                      className="hidden" 
                      id="file-upload"
                      onChange={uploadFile}
                      disabled={busy}
                    />
                    <Button asChild variant="secondary" disabled={busy}>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Select File
                      </label>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    Add URL
                  </CardTitle>
                  <CardDescription>
                    Ingest content directly from a website.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <label htmlFor="url" className="text-sm font-medium">Website URL</label>
                    <div className="flex gap-2">
                      <Input 
                        id="url"
                        placeholder="https://example.com/article" 
                        value={url} 
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The content will be scraped and added to your knowledge base.
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={addUrl} 
                    disabled={busy || !url.trim()}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Add to Knowledge Base
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}
