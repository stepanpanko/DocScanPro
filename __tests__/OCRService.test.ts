// __tests__/OCRService.test.ts
import { runOcrForDoc } from '../src/ocr/OCRService';
import { Doc, newDoc, newPage } from '../src/types';

// Mock react-native-text-recognition
jest.mock('react-native-text-recognition', () => ({
  recognize: jest.fn(),
}));

const TextRecognition = require('react-native-text-recognition');

describe('OCRService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully process OCR for a document with pages', async () => {
    // Mock successful OCR recognition
    (TextRecognition.recognize as jest.Mock)
      .mockResolvedValueOnce(['Line 1', 'Line 2', 'Line 3']) // Page 1
      .mockResolvedValueOnce(['Another line']) // Page 2
      .mockResolvedValueOnce(['Final page']); // Page 3

    const doc: Doc = {
      ...newDoc('Test Document'),
      pages: [
        newPage('/path/to/page1.jpg'),
        newPage('/path/to/page2.jpg'),
        newPage('/path/to/page3.jpg'),
      ],
    };

    const result = await runOcrForDoc(doc);

    expect(result.ocrStatus).toBe('done');
    expect(result.ocrExcerpt).toBe('Line 1\nLine 2\nLine 3');
    expect(result.pages).toHaveLength(3);
    expect(result.pages[0].ocrText).toBe('Line 1\nLine 2\nLine 3');
    expect(result.pages[1].ocrText).toBe('Another line');
    expect(result.pages[2].ocrText).toBe('Final page');

    // Should handle empty recognition results
    expect(TextRecognition.recognize).toHaveBeenCalledTimes(3);
  });

  it('should handle OCR failures gracefully', async () => {
    // Mock one success and one failure
    (TextRecognition.recognize as jest.Mock)
      .mockResolvedValueOnce(['Success text'])
      .mockRejectedValueOnce(new Error('Recognition failed'));

    const doc: Doc = {
      ...newDoc('Test Document'),
      pages: [
        newPage('/path/to/page1.jpg'),
        newPage('/path/to/page2.jpg'),
      ],
    };

    const result = await runOcrForDoc(doc);

    expect(result.ocrStatus).toBe('done');
    expect(result.pages[0].ocrText).toBe('Success text');
    expect(result.pages[1].ocrText).toBe('');
    expect(result.ocrExcerpt).toBe('Success text');
  });

  it('should throw error for document with no pages', async () => {
    const doc: Doc = {
      ...newDoc('Empty Document'),
      pages: [],
    };

    await expect(runOcrForDoc(doc)).rejects.toThrow('No pages to process');
  });

  it('should handle non-array text recognition results', async () => {
    // Mock string result instead of array
    (TextRecognition.recognize as jest.Mock)
      .mockResolvedValueOnce('String result')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(undefined);

    const doc: Doc = {
      ...newDoc('Test Document'),
      pages: [
        newPage('/path/to/page1.jpg'),
        newPage('/path/to/page2.jpg'),
        newPage('/path/to/page3.jpg'),
      ],
    };

    const result = await runOcrForDoc(doc);

    expect(result.ocrStatus).toBe('done');
    expect(result.pages[0].ocrText).toBe('String result');
    expect(result.pages[1].ocrText).toBe('null');
    expect(result.pages[2].ocrText).toBe('');
  });
});
