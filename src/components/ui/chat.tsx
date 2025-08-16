"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ChatFormProps {
  children: React.ReactNode | ((props: { files: File[] | null; setFiles: React.Dispatch<React.SetStateAction<File[] | null>> }) => React.ReactNode);
  className?: string;
  isPending?: boolean;
  handleSubmit: (e?: { preventDefault?: () => void }, options?: { experimental_attachments?: FileList }) => void;
}

export function ChatForm({ 
  children, 
  className, 
  isPending = false, 
  handleSubmit, 
  ...props 
}: ChatFormProps & React.HTMLAttributes<HTMLFormElement>) {
  const [files, setFiles] = React.useState<File[] | null>(null);

  const onSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Convert File[] to FileList for the API
    let fileList: FileList | undefined;
    if (files && files.length > 0) {
      const dataTransfer = new DataTransfer();
      files.forEach(file => dataTransfer.items.add(file));
      fileList = dataTransfer.files;
    }
    handleSubmit(e, { experimental_attachments: fileList });
    setFiles(null);
  }, [handleSubmit, files]);

  return (
    <form 
      onSubmit={onSubmit}
      className={cn("flex flex-col gap-4", className)}
      {...props}
    >
      {typeof children === "function" ? children({ files, setFiles }) : children}
    </form>
  );
}
