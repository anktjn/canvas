declare module 'mammoth' {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer | Uint8Array | Buffer }): Promise<{ value: string }>;
}


