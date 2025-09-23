// __tests__/pdf.test.ts
import { buildPdfFromImages } from '../src/pdf';

// Mock dependencies
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('mock-base64-data'),
}));

jest.mock('react-native-image-resizer', () => ({
  createResizedImage: jest.fn().mockResolvedValue({
    path: '/mock/resized/image.jpg',
  }),
}));

jest.mock('react-native-share', () => ({
  open: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/utils/paths', () => ({
  stripFileScheme: jest.fn((path) => path),
}));

// Mock PDF-lib
jest.mock('pdf-lib', () => {
  const mockEmbedJpg = jest.fn().mockResolvedValue({
    width: 100,
    height: 100,
  });

  const mockAddPage = jest.fn().mockReturnValue({
    drawImage: jest.fn(),
    drawText: jest.fn(),
  });

  const mockCreate = jest.fn().mockResolvedValue({
    embedJpg: mockEmbedJpg,
    embedPng: jest.fn().mockRejectedValue(new Error('PNG failed')),
    addPage: mockAddPage,
    saveAsBase64: jest.fn().mockResolvedValue('mock-pdf-base64'),
  });

  return {
    PDFDocument: {
      create: mockCreate,
    },
  };
});

describe('PDF Export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create PDF without text layer', async () => {
    const { PDFDocument } = require('pdf-lib');
    const mockPdf = await PDFDocument.create();
    const mockPage = mockPdf.addPage();

    const result = await buildPdfFromImages('test-doc-123', ['/path/to/image1.jpg']);

    expect(result).toMatch(/^file:\/\/.*\/export\.pdf$/);
    expect(mockPage.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ width: 100, height: 100 }),
      { x: 0, y: 0, width: 100, height: 100 }
    );
    expect(mockPage.drawText).not.toHaveBeenCalled();
  });

  it('should create PDF with text layer when includeText is true', async () => {
    const { PDFDocument } = require('pdf-lib');
    const mockPdf = await PDFDocument.create();
    const mockPage = mockPdf.addPage();

    const pagesWithOcr = [
      { ocrText: 'This is OCR text for page 1' },
      { ocrText: 'This is OCR text for page 2' },
    ];

    const result = await buildPdfFromImages(
      'test-doc-456',
      ['/path/to/image1.jpg', '/path/to/image2.jpg'],
      {
        includeText: true,
        pages: pagesWithOcr,
      }
    );

    expect(result).toMatch(/^file:\/\/.*\/export\.pdf$/);
    expect(mockPage.drawText).toHaveBeenCalledWith('This is OCR text for page 1', {
      x: 12,
      y: 76, // 100 - 24
      size: 1,
      opacity: 0,
    });
  });

  it('should not add text layer when ocrText is empty', async () => {
    const { PDFDocument } = require('pdf-lib');
    const mockPdf = await PDFDocument.create();
    const mockPage = mockPdf.addPage();

    const pagesWithEmptyOcr = [
      { ocrText: '' },
      { ocrText: undefined },
      { ocrText: undefined },
    ];

    await buildPdfFromImages(
      'test-doc-789',
      ['/path/to/image1.jpg', '/path/to/image2.jpg', '/path/to/image3.jpg'],
      {
        includeText: true,
        pages: pagesWithEmptyOcr,
      }
    );

    expect(mockPage.drawText).not.toHaveBeenCalled();
  });

  it('should handle text overlay errors gracefully', async () => {
    const { PDFDocument } = require('pdf-lib');
    const mockPdf = await PDFDocument.create();
    const mockPage = mockPdf.addPage();

    // Mock drawText to throw an error
    mockPage.drawText = jest.fn().mockImplementation(() => {
      throw new Error('Text drawing failed');
    });

    const pagesWithOcr = [
      { ocrText: 'This text will fail to draw' },
    ];

    const result = await buildPdfFromImages(
      'test-doc-999',
      ['/path/to/image1.jpg'],
      {
        includeText: true,
        pages: pagesWithOcr,
      }
    );

    // Should still succeed even if text drawing fails
    expect(result).toMatch(/^file:\/\/.*\/export\.pdf$/);
    expect(mockPage.drawImage).toHaveBeenCalled(); // Image should still be drawn
  });
});
