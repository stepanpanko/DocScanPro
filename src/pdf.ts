// src/pdf.ts
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import ImageResizer from 'react-native-image-resizer';
import { PDFDocument } from 'pdf-lib';
import { stripFileScheme } from './utils/paths';
import { log, warn } from './utils/log';

const dataUri = (b64: string, kind: 'jpg' | 'png') =>
  `data:image/${kind === 'jpg' ? 'jpeg' : 'png'};base64,${b64}`;

async function readBase64(pathOrUri: string) {
  return RNFS.readFile(stripFileScheme(pathOrUri), 'base64');
}

export async function buildPdfFromImages(
  docId: string,
  processedUris: string[],
) {
  const dir = `${RNFS.DocumentDirectoryPath}/DocScanPro/${docId}`;
  await RNFS.mkdir(dir);
  const pdfPath = `${dir}/export.pdf`;

  log('[pdf] start, pages:', processedUris.length);

  const pdf = await PDFDocument.create();

  for (let i = 0; i < processedUris.length; i++) {
    const src = processedUris[i];
    log(`[pdf] page ${i + 1}:`, src);

    // 1) Read the file we have
    let b64 = await readBase64(src);

    // 2) Try to embed as JPG, then PNG. If both fail, re-encode to JPG and try again.
    let img: Awaited<ReturnType<typeof pdf.embedJpg>>;

    try {
      img = await pdf.embedJpg(dataUri(b64, 'jpg'));
      log('[pdf] embedded as JPG');
    } catch {
      try {
        img = await pdf.embedPng(dataUri(b64, 'png'));
        log('[pdf] embedded as PNG');
      } catch {
        warn('[pdf] embed failed; re-encoding to JPEG…');
        const r = await ImageResizer.createResizedImage(
          src,
          3000,
          3000,
          'JPEG',
          92,
          0,
          undefined,
          false,
        );
        const outPath =
          (r as { path?: string; uri?: string }).path ||
          (r as { path?: string; uri?: string }).uri;
        if (!outPath) throw new Error('ImageResizer failed to return valid path');
        b64 = await readBase64(outPath);
        img = await pdf.embedJpg(dataUri(b64, 'jpg'));
        log('[pdf] embedded after JPEG re-encode');
      }
    }

    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }

  // 3) Save the PDF
  const pdfB64 = await pdf.saveAsBase64({ dataUri: false });
  await RNFS.writeFile(pdfPath, pdfB64, 'base64');
  const finalUri = `file://${pdfPath}`;
  log('[pdf] wrote:', finalUri);

  return finalUri;
}

export async function shareFile(fileUri: string) {
  log('[share] opening:', fileUri);
  await Share.open({
    url: fileUri,
    type: 'application/pdf',
    filename: 'DocScanPro.pdf',
    failOnCancel: false,
  });
}
