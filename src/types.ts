export type Rotation = 0 | 90 | 180 | 270;
export type Filter = 'color' | 'grayscale' | 'bw';

export type Page = { uri: string; rotation: Rotation; filter: Filter };

export type Doc = {
  id: string;
  title: string;
  createdAt: number;
  pages: Page[];
  ocr: string[];
  pdfPath?: string;
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
  };
}

export function newPage(uri: string): Page {
  return { uri, rotation: 0, filter: 'color' };
}
