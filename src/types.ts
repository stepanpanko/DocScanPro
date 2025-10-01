export type Rotation = 0 | 90 | 180 | 270;
export type Filter = 'color' | 'grayscale' | 'bw';

export type OcrWord = {
  text: string;
  box: { x: number; y: number; width: number; height: number }; // in image pixels
  conf?: number;
  imgW: number;
  imgH: number;
};

export type OcrPage = {
  fullText: string;        // page text joined by spaces/newlines
  words: OcrWord[];        // bounding boxes per word (or line if that's what the lib returns)
  imgW: number;
  imgH: number;
};

export type OcrStatus = 'idle' | 'running' | 'done' | 'error';

export interface OcrProgress { 
  processed: number; 
  total: number; 
}

export type Page = { 
  uri: string; 
  rotation: Rotation; 
  filter: Filter;
  ocrText?: string;        // page.fullText from OCR
  ocrBoxes?: OcrWord[];    // page.words from OCR
};

export interface Doc {
  id: string;
  title: string;
  createdAt: number;
  pages: Page[];
  ocr: string[];           // kept for backward compatibility
  ocrStatus?: OcrStatus;
  ocrProgress?: OcrProgress;
  ocrExcerpt?: string;     // first ~200 chars across pages
  ocrPages?: OcrPage[];
  pdfPath?: string;
}

export const ROTATIONS: Rotation[] = [0, 90, 180, 270];

export function newDoc(title = 'Untitled'): Doc {
  return {
    id: String(Date.now()),
    title,
    createdAt: Date.now(),
    pages: [],
    ocr: [],
    pdfPath: undefined,
  };
}

export function newPage(uri: string): Page {
  return { uri, rotation: 0, filter: 'color' };
}
