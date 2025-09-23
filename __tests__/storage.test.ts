import { normalizeDoc } from '../src/storage';
import type { Doc } from '../src/types';

describe('normalizeDoc', () => {
  it('fills defaults for missing fields', () => {
    const input = {
      id: '123',
      title: 'Test Doc',
      createdAt: 1234567890,
      pages: [],
      ocr: ['test'],
    };

    const result = normalizeDoc(input);

    expect(result).toEqual({
      id: '123',
      title: 'Test Doc',
      createdAt: 1234567890,
      pages: [],
      ocr: ['test'],
      kind: 'generic',
      folderId: null,
      ocrStatus: 'idle',
      ocrExcerpt: '',
      passwordHint: null,
      tags: [],
    });
  });

  it('preserves existing fields', () => {
    const input = {
      id: '123',
      title: 'Test Doc',
      createdAt: 1234567890,
      pages: [
        {
          uri: 'file://test.jpg',
          rotation: 90,
          filter: 'grayscale' as const,
        }
      ],
      ocr: ['test'],
      kind: 'id' as const,
      folderId: 'folder1',
      ocrStatus: 'done' as const,
      ocrExcerpt: 'Some text',
      passwordHint: 'hint',
      tags: ['tag1', 'tag2'],
    };

    const result = normalizeDoc(input);

    expect(result).toEqual({
      id: '123',
      title: 'Test Doc',
      createdAt: 1234567890,
      pages: [
        {
          id: '1',
          uri: 'file://test.jpg',
          imageURL: 'file://test.jpg',
          rotation: 90,
          filter: 'grayscale',
          dpi: undefined,
          quad: undefined,
          ocrText: undefined,
          width: undefined,
          height: undefined,
        }
      ],
      ocr: ['test'],
      kind: 'id',
      folderId: 'folder1',
      ocrStatus: 'done',
      ocrExcerpt: 'Some text',
      passwordHint: 'hint',
      tags: ['tag1', 'tag2'],
    });
  });

  it('normalizes pages with missing fields', () => {
    const input = {
      id: '123',
      title: 'Test Doc',
      createdAt: 1234567890,
      pages: [
        { uri: 'file://test1.jpg' },
        { uri: 'file://test2.jpg', rotation: 180 },
        { uri: 'file://test3.jpg', rotation: 0, filter: 'bw' },
      ],
      ocr: [],
    };

    const result = normalizeDoc(input);

    expect(result.pages).toEqual([
      {
        id: '1',
        uri: 'file://test1.jpg',
        imageURL: 'file://test1.jpg',
        rotation: 0,
        filter: 'color',
        dpi: undefined,
        quad: undefined,
        ocrText: undefined,
        width: undefined,
        height: undefined,
      },
      {
        id: '2',
        uri: 'file://test2.jpg',
        imageURL: 'file://test2.jpg',
        rotation: 180,
        filter: 'color',
        dpi: undefined,
        quad: undefined,
        ocrText: undefined,
        width: undefined,
        height: undefined,
      },
      {
        id: '3',
        uri: 'file://test3.jpg',
        imageURL: 'file://test3.jpg',
        rotation: 0,
        filter: 'bw',
        dpi: undefined,
        quad: undefined,
        ocrText: undefined,
        width: undefined,
        height: undefined,
      },
    ]);
  });

  it('normalize-on-save: saves normalized docs and reloads correctly', () => {
    const partialDoc = {
      id: '123',
      title: 'Test Doc',
      createdAt: 1234567890,
      pages: [
        { uri: 'file://test1.jpg' },
        { uri: 'file://test2.jpg', rotation: 90, filter: 'grayscale' },
      ],
      ocr: ['test'],
      // Missing: kind, folderId, ocrStatus, ocrExcerpt, passwordHint, tags
    };

    // Mock the storage
    const mockKv = {
      set: jest.fn(),
      getString: jest.fn().mockReturnValueOnce(JSON.stringify([partialDoc])),
    };

    // Replace the kv instance temporarily
    const originalKv = require('../src/storage').kv;
    require('../src/storage').kv = mockKv;

    // Save the partial doc
    const { saveDocsIndex } = require('../src/storage');
    saveDocsIndex([partialDoc]);

    // Verify it was normalized before saving
    const savedData = JSON.parse(mockKv.set.mock.calls[0][1]);
    expect(savedData[0]).toEqual({
      id: '123',
      title: 'Test Doc',
      createdAt: 1234567890,
      pages: [
        {
          id: expect.stringMatching(/^\d+-[a-z0-9]+$/), // Generated stable ID
          uri: 'file://test1.jpg',
          imageURL: 'file://test1.jpg',
          rotation: 0,
          filter: 'color',
          dpi: undefined,
          quad: undefined,
          ocrText: undefined,
          width: undefined,
          height: undefined,
        },
        {
          id: expect.stringMatching(/^\d+-[a-z0-9]+$/), // Generated stable ID
          uri: 'file://test2.jpg',
          imageURL: 'file://test2.jpg',
          rotation: 90,
          filter: 'grayscale',
          dpi: undefined,
          quad: undefined,
          ocrText: undefined,
          width: undefined,
          height: undefined,
        },
      ],
      ocr: ['test'],
      kind: 'generic',
      folderId: null,
      ocrStatus: 'idle',
      ocrExcerpt: '',
      passwordHint: null,
      tags: [],
    });

    // Restore original kv
    require('../src/storage').kv = originalKv;
  });
});
