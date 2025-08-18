declare module 'pdf-parse' {
  interface PDFInfo {
    version?: string;
    numpages?: number;
    text?: string;
  }
  function pdfParse(dataBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<{ text: string } & PDFInfo>;
  export default pdfParse;
}


