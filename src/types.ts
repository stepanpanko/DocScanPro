export type Rotation = 0 | 90 | 180 | 270;
export type Filter = 'color' | 'grayscale' | 'bw';
export type DocKind = 'generic' | 'id' | 'receipt';
export type OcrStatus = 'idle' | 'queued' | 'running' | 'done' | 'failed';

export type Page = {
  id?: string;
  uri: string;                 // existing field (keep)
  imageURL?: string;           // alias forward; same as uri for now
  rotation: number;            // keep
  filter: 'color' | 'grayscale' | 'bw';
  dpi?: number;
  quad?: number[];             // 8 numbers (x,y)*4
  ocrText?: string;
  width?: number;
  height?: number;
};

export type Doc = {
  id: string;
  title: string;
  createdAt: number;
  pages: Page[];
  ocr?: string[];              // keep for compat (we'll shift to page.ocrText later)
  pdfPath?: string;            // keep existing
  kind?: DocKind;
  folderId?: string | null;
  ocrStatus?: OcrStatus;
  ocrExcerpt?: string;
  passwordHint?: string | null;
  tags?: string[];
};

export const ROTATIONS: Rotation[] = [0, 90, 180, 270];

export function newDoc(title = 'Untitled'): Doc {
  return {
    id: String(Date.now()),
    title,
    createdAt: Date.now(),
    pages: [],
    ocr: [],
    pdfPath: undefined,
    kind: 'generic',
    folderId: null,
    ocrStatus: 'idle',
    ocrExcerpt: '',
    passwordHint: null,
    tags: [],
  };
}

export function newPage(uri: string, meta?: { width?: number; height?: number }): Page {
  return {
    id: undefined,
    uri,
    imageURL: uri,
    rotation: 0,
    filter: 'color',
    dpi: undefined,
    quad: undefined,
    ocrText: undefined,
    width: meta?.width,
    height: meta?.height,
  };
}
