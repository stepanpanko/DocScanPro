// src/ocr/provider.ts
import TextRecognition from 'react-native-text-recognition';
import { Image } from 'react-native';
import { toBestPath } from '../utils/paths';
import { log, warn } from '../utils/log';
import type { OcrPage, OcrWord } from '../types';
import VisionOCR from '../native/visionOCR';

// Timeout for OCR per page (30 seconds)
const OCR_TIMEOUT_MS = 30000;

/**
 * Get image dimensions for coordinate calculations
 */
function getImageSize(imagePath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      imagePath,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

/**
 * Create estimated bounding boxes for text lines.
 * Since react-native-text-recognition doesn't provide bounding boxes,
 * we estimate them based on line position and typical text dimensions.
 */
function createEstimatedBoundingBoxes(
  lines: string[],
  imageSize: { width: number; height: number }
): OcrWord[] {
  const words: OcrWord[] = [];
  const { width: imageW, height: imageH } = imageSize;
  
  // Estimate text metrics
  const avgCharWidth = imageW * 0.012; // ~1.2% of image width per character
  const lineHeight = Math.max(imageH * 0.04, 20); // ~4% of image height or min 20px
  const marginX = imageW * 0.05; // 5% margin from edges
  const marginY = imageH * 0.05; // 5% margin from top
  
  lines.forEach((line, lineIndex) => {
    if (!line.trim()) return; // Skip empty lines
    
    const textWidth = line.length * avgCharWidth;
    const x = marginX;
    const y = marginY + (lineIndex * lineHeight * 1.2); // 1.2x line spacing
    
    // Ensure we don't exceed image bounds
    const boundedY = Math.min(y, imageH - lineHeight);
    const boundedWidth = Math.min(textWidth, imageW - 2 * marginX);
    
    words.push({
      text: line,
      box: {
        x: x,
        y: boundedY,
        width: boundedWidth,
        height: lineHeight
      },
      conf: 0.8, // Estimated confidence since we don't have real values
      imgW: imageW,
      imgH: imageH
    });
  });
  
  return words;
}

/**
 * Timeout wrapper for promises
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`OCR timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Main OCR function that processes a single page image
 * Prefers VisionOCR (with accurate bounding boxes), falls back to TextRecognition
 */
export async function recognizePage(imagePath: string): Promise<OcrPage> {
  const startTime = Date.now();
  log('[OCR] Starting recognition for:', imagePath);
  
  try {
    const { withScheme, plain } = toBestPath(imagePath);
    
    // Try VisionOCR first (provides accurate word-level bounding boxes)
    if (VisionOCR) {
      try {
        log('[OCR] Using VisionOCR…');
        const visionPromise = VisionOCR.recognize(plain);
        const result = await withTimeout(visionPromise, OCR_TIMEOUT_MS);
        
        const { imgW, imgH, words: visionWords } = result;
        
        // Convert VisionOCR format to OcrWord format
        const words: OcrWord[] = visionWords.map(w => ({
          text: w.text,
          box: { x: w.x, y: w.y, width: w.width, height: w.height },
          conf: w.conf,
          imgW,
          imgH
        }));
        
        const fullText = words.map(w => w.text).join(' ');
        
        const duration = Date.now() - startTime;
        log(`[OCR] VisionOCR completed in ${duration}ms, found ${words.length} words, ${fullText.length} chars`);
        if (words.length > 0) {
          log('[OCR] Sample box:', words[0]);
        }
        
        return { fullText, words, imgW, imgH };
      } catch (visionError) {
        console.warn('[OCR] VisionOCR failed → fallback:', visionError);
        warn('[OCR] VisionOCR failed, falling back to TextRecognition:', visionError);
        // Fall through to TextRecognition fallback
      }
    }
    
    // Fallback to TextRecognition (no accurate bounding boxes)
    log('[OCR] Using TextRecognition fallback (no accurate bounding boxes)');
    const imageSize = await getImageSize(withScheme);
    
    const recognizePromise = async (): Promise<string[]> => {
      try {
        let lines = await TextRecognition.recognize(withScheme);
        if (!Array.isArray(lines) || lines.length === 0) {
          lines = await TextRecognition.recognize(plain);
        }
        return Array.isArray(lines) ? lines : [];
      } catch (error) {
        warn('[OCR] Failed with withScheme, trying plain path:', error);
        const lines = await TextRecognition.recognize(plain);
        return Array.isArray(lines) ? lines : [];
      }
    };
    
    const lines = await withTimeout(recognizePromise(), OCR_TIMEOUT_MS);
    const fullText = lines.join('\n');
    
    const duration = Date.now() - startTime;
    log(`[OCR] TextRecognition completed in ${duration}ms, found ${lines.length} lines, ${fullText.length} chars`);
    
    // Return with NO bounding boxes (empty array signals to skip PDF overlay)
    return {
      fullText,
      words: [], // Empty - no accurate boxes available
      imgW: imageSize.width,
      imgH: imageSize.height
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    warn(`[OCR] Failed after ${duration}ms:`, error);
    
    return {
      fullText: '',
      words: [],
      imgW: 0,
      imgH: 0
    };
  }
}
