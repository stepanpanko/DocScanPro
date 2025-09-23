export type ScanPage = { imageURL: string; rotation: number; dpi?: number; quad?: number[]; width?: number; height?: number };
export type ScanResult = { pages: ScanPage[] };
export interface ScannerEngine { scan(max?: number): Promise<ScanResult>; }
