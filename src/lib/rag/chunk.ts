export function splitByParagraphs(text: string, maxCharsPerChunk = 1200): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = '';
  for (const p of paragraphs) {
    if ((buffer + '\n\n' + p).length > maxCharsPerChunk) {
      if (buffer) chunks.push(buffer.trim());
      buffer = p;
    } else {
      buffer = buffer ? buffer + '\n\n' + p : p;
    }
  }
  if (buffer) chunks.push(buffer.trim());
  return chunks;
}


