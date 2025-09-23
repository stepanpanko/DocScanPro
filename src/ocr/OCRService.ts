// src/ocr/OCRService.ts
import TextRecognition from 'react-native-text-recognition';
import type { Doc } from '../types';
import { log } from '../utils/log';
import { incrementMetric } from '../utils/metrics';
import { toBestPath } from '../utils/paths';

export async function runOcrForDoc(doc: Doc): Promise<Doc> {
  if (!doc.pages || doc.pages.length === 0) {
    throw new Error('No pages to process');
  }

  log(`[OCRService] Starting OCR for doc ${doc.id} with ${doc.pages.length} pages`);

  // Update status to running
  const updatedDoc: Doc = {
    ...doc,
    ocrStatus: 'running'
  };

  const updatedPages = [...doc.pages];
  let ocrExcerpt = '';

  // Process each page sequentially
  for (let i = 0; i < updatedPages.length; i++) {
    const page = updatedPages[i];
    try {
      const { withScheme, plain } = toBestPath(page.uri);
      let lines = await TextRecognition.recognize(withScheme);

      if (!Array.isArray(lines) || lines.length === 0) {
        // Fallback to plain path if needed
        lines = await TextRecognition.recognize(plain);
      }

      const text = Array.isArray(lines) ? lines.join('\n') : String(lines || '');
      updatedPages[i] = {
        ...page,
        ocrText: text
      };

      log(`[OCRService] Page ${i + 1} completed, text length: ${text.length}`);

      // Update excerpt from first page
      if (i === 0 && text.trim()) {
        ocrExcerpt = text.trim().substring(0, 200);
      }

      // Increment success metric
      incrementMetric('ocr_page_ok');

    } catch (error) {
      log(`[OCRService] Page ${i + 1} failed:`, error);
      updatedPages[i] = {
        ...page,
        ocrText: ''
      };

      // Increment failure metric
      incrementMetric('ocr_page_fail');
    }
  }

  // Update the doc with final status
  const finalDoc: Doc = {
    ...updatedDoc,
    pages: updatedPages,
    ocrStatus: 'done',
    ocrExcerpt
  };

  log(`[OCRService] Completed OCR for doc ${doc.id}, status: ${finalDoc.ocrStatus}, excerpt length: ${ocrExcerpt.length}`);

  return finalDoc;
}

export function cancelOcr(): void {
  // TODO: Implement cancellation for future async OCR queue
  log('[OCRService] Cancel called (no-op for now)');
}
