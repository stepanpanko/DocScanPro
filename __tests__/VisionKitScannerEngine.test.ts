import { VisionKitScannerEngine } from '../src/scanner/VisionKitScannerEngine';
import { Image } from 'react-native';

jest.mock('react-native-document-scanner-plugin', () => ({
  default: {
    scanDocument: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Image: {
    getSize: jest.fn(),
  },
}));

describe('VisionKitScannerEngine', () => {
  let scanner: VisionKitScannerEngine;
  let mockScanDocument: jest.MockedFunction<any>;

  beforeEach(() => {
    scanner = new VisionKitScannerEngine();
    mockScanDocument = require('react-native-document-scanner-plugin').default.scanDocument;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns scanned pages when plugin resolves successfully', async () => {
    const mockResult = {
      scannedImages: ['file://image1.jpg', 'file://image2.jpg', 'file://image3.jpg'],
    };

    mockScanDocument.mockResolvedValue(mockResult);

    // Mock Image.getSize for each image
    const mockGetSize = Image.getSize as jest.MockedFunction<any>;
    mockGetSize
      .mockImplementationOnce((uri: string, success: (width: number, height: number) => void) => success(100, 200))
      .mockImplementationOnce((uri: string, success: (width: number, height: number) => void) => success(300, 400))
      .mockImplementationOnce((uri: string, success: (width: number, height: number) => void) => success(500, 600));

    const result = await scanner.scan(5);

    expect(mockScanDocument).toHaveBeenCalledWith({
      maxNumDocuments: 5,
      cropping: true,
      allowMultiple: true,
    });

    expect(result).toEqual({
      pages: [
        { imageURL: 'file://image1.jpg', rotation: 0, width: 100, height: 200 },
        { imageURL: 'file://image2.jpg', rotation: 0, width: 300, height: 400 },
        { imageURL: 'file://image3.jpg', rotation: 0, width: 500, height: 600 },
      ],
    });
  });

  it('returns empty pages array when no scanned images', async () => {
    const mockResult = { scannedImages: [] };
    mockScanDocument.mockResolvedValue(mockResult);

    const result = await scanner.scan(3);

    expect(result).toEqual({ pages: [] });
  });

  it('handles Image.getSize errors gracefully', async () => {
    const mockResult = {
      scannedImages: ['file://image1.jpg'],
    };

    mockScanDocument.mockResolvedValue(mockResult);

    // Mock Image.getSize to throw an error
    const mockGetSize = Image.getSize as jest.MockedFunction<any>;
    mockGetSize.mockImplementation((uri: string, success: (width: number, height: number) => void, error: (err: any) => void) => error(new Error('Image not found')));

    await expect(scanner.scan(3)).rejects.toThrow('Image not found');
  });

  it('uses default max of 12 when not specified', async () => {
    const mockResult = { scannedImages: ['file://image1.jpg'] };
    mockScanDocument.mockResolvedValue(mockResult);

    // Mock Image.getSize
    const mockGetSize = Image.getSize as jest.MockedFunction<any>;
    mockGetSize.mockImplementation((uri: string, success: (width: number, height: number) => void) => success(100, 200));

    await scanner.scan();

    expect(mockScanDocument).toHaveBeenCalledWith({
      maxNumDocuments: 12,
      cropping: true,
      allowMultiple: true,
    });
  });

  it('handles plugin errors gracefully', async () => {
    const error = new Error('Scanner not available');
    mockScanDocument.mockRejectedValue(error);

    await expect(scanner.scan(3)).rejects.toThrow('Scanner not available');
  });
});
