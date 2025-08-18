"use client"

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, Upload, Globe, Pencil } from 'lucide-react';

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

  const uploadFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
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
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
      e.currentTarget.value = '';
    }
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
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string | number) => {
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
    setBusy(true);
    try {
      const res = await fetch('/api/files', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name }) });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error || 'rename failed');
      }
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Upload file (.pdf, .docx)</div>
              <div className="flex items-center gap-2">
                <Input type="file" accept=".pdf,.docx" onChange={uploadFile} disabled={busy} />
                <Button size="sm" disabled>
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Add URL</div>
              <div className="flex items-center gap-2">
                <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
                <Button onClick={addUrl} size="sm" disabled={busy || !url.trim()}>
                  <Globe className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="text-sm font-medium">Your sources</div>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : files.length === 0 ? (
              <div className="text-sm text-muted-foreground">No files yet</div>
            ) : (
              <div className="grid gap-3">
                {files.map((f) => (
                  <div key={String(f.id)} className="flex items-center justify-between rounded-lg border p-3 gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          defaultValue={f.name}
                          className="w-full bg-transparent outline-none text-sm font-medium truncate"
                          onBlur={(e) => {
                            if (e.target.value !== f.name) rename(f.id, e.target.value);
                          }}
                        />
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {f.source_type.toUpperCase()} · {new Date(f.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => remove(f.id)} disabled={busy}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


