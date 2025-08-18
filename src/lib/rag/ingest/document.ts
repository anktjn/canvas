import { extract } from '@extractus/article-extractor';
import { Buffer } from 'node:buffer';

/**
 * Best-effort text extraction from small uploaded files.
 * Start with text/markdown/html; can be extended to PDF/DOCX later.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return extractTextFromBuffer({ arrayBuffer, fileName: file.name, contentType: file.type });
}

export async function extractTextFromBuffer(params: { arrayBuffer: ArrayBuffer; fileName: string; contentType?: string }): Promise<string> {
  const { arrayBuffer, fileName, contentType } = params;
  const utf8 = new TextDecoder().decode(arrayBuffer);
  const lowerName = fileName.toLowerCase();
  const mime = contentType || '';

  // Plain text and markdown
  if (mime === 'text/plain' || lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
    return utf8;
  }

  // HTML to article extraction
  if (mime === 'text/html' || lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
    try {
      const article = await extract(utf8);
      const content = (article?.content || '').trim();
      return content || utf8;
    } catch {
      return utf8;
    }
  }

  // PDF
  if (mime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    try {
      const { default: pdfParse } = await import('pdf-parse');
      const buffer = Buffer.from(arrayBuffer);
      const result = await pdfParse(buffer);
      return (result.text || '').trim();
    } catch {
      // fall through
    }
  }

  // DOCX
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer });
      return (result.value || '').trim();
    } catch {
      // fall through
    }
  }

  // Fallback: decoded text
  return utf8;
}


