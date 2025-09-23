import { Image } from 'react-native';
import {ScannerEngine, ScanResult} from './ScannerEngine';
import { log } from '../utils/log';

export class VisionKitScannerEngine implements ScannerEngine {
  async scan(max = 12): Promise<ScanResult> {
    const DocumentScanner = require('react-native-document-scanner-plugin').default;
    const result = await DocumentScanner.scanDocument({
      maxNumDocuments: max,
      cropping: true,
      allowMultiple: true
    });
    log('[scan] images:', result?.scannedImages?.length ?? 0, result?.scannedImages);
    const pages = await Promise.all(
      (result?.scannedImages ?? []).map(async (imageURL: string) => {
        const dimensions = await new Promise<{width: number, height: number}>((resolve, reject) => {
          Image.getSize(imageURL, (width, height) => resolve({width, height}), reject);
        });
        return {
          imageURL,
          rotation: 0,
          width: dimensions.width,
          height: dimensions.height,
        };
      })
    );
    return { pages };
  }
}
