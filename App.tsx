// App.tsx
import 'react-native-gesture-handler';
import * as React from 'react';
import {Alert, AppState} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

import {FilterProcessorProvider} from './src/FilterProcessor';
import LibraryScreen from './src/screens/LibraryScreen';
import EditDocumentScreen from './src/screens/EditDocumentScreen';
import {Doc, Page} from './src/types';
import {getDocsIndex, saveDocsIndex, putPageFile, removeDocFiles} from './src/storage';
import {ocrQueue} from './src/ocr/queue';
import {log} from './src/utils/log';
import { NativeModules } from 'react-native';

export default function App() {
  // Check if native modules are available
  console.log('[APP] Native modules check:');
  console.log('[APP] VisionOCR available:', !!NativeModules.VisionOCR);
  console.log('[APP] PDFRasterizer available:', !!NativeModules.PDFRasterizer);
  const [screen, setScreen] = React.useState<'library' | 'editor'>('library');
  const [docs, setDocs] = React.useState<Doc[]>(getDocsIndex());
  const [current, setCurrent] = React.useState<Doc | null>(null);

  // Listen to app state changes to resume OCR queue
  React.useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('[OCR][auto] app active — resuming queue');
        log('[OCR] App became active, OCR queue will continue automatically');
        // The queue will automatically continue processing if there are pending documents
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);


  function openDoc(doc: Doc) {
    setCurrent(doc);
    setScreen('editor');
  }

  function updateDoc(updated: Doc) {
    setDocs(prev => {
      const next = prev.map(d => (d.id === updated.id ? updated : d));
      saveDocsIndex(next);
      return next;
    });
    setCurrent(updated);
  }

  async function deleteDoc(id: string) {
    setDocs(prev => {
      const next = prev.filter(d => d.id !== id);
      saveDocsIndex(next);
      return next;
    });
    await removeDocFiles(id);
    setCurrent(null);
    setScreen('library');
  }

  async function createFromScan(imageUris: string[]) {
    try {
      if (!imageUris?.length) return;
      const doc: Doc = {
        id: String(Date.now()),
        title: `Scan ${new Date().toLocaleString()}`,
        createdAt: Date.now(),
        pages: [],
        ocr: [],
      };
      const pages: Page[] = [];
      for (let i = 0; i < imageUris.length; i++) {
        const stored = await putPageFile(doc.id, imageUris[i], i);
        pages.push({uri: stored, rotation: 0, filter: 'color'});
      }
      const created: Doc = {...doc, pages};
      setDocs(prev => {
        const next = [created, ...prev];
        saveDocsIndex(next);
        return next;
      });
      
      // Auto-enqueue the new document for OCR processing
      console.log('[OCR][auto] new document created', { docId: created.id });
      log('[OCR] New document created, auto-enqueueing for OCR:', created.id);
      requestAnimationFrame(() => ocrQueue.enqueueDoc(created.id));
      
      openDoc(created);
    } catch (e: any) {
      Alert.alert('Create failed', String(e?.message || e));
    }
  }

  async function startScan() {
    try {
      const DocumentScanner =
        require('react-native-document-scanner-plugin').default;
      const result = await DocumentScanner.scanDocument({
        maxNumDocuments: 12,
        cropping: false,
      });
      if (result?.scannedImages?.length) {
        await createFromScan(result.scannedImages);
      }
    } catch (e: any) {
      Alert.alert('Scanner error', String(e?.message || e));
    }
  }

  function handleImport(doc: Doc) {
    setDocs(prev => {
      const next = [doc, ...prev];
      saveDocsIndex(next);
      return next;
    });
    // Enqueue after state/storage are updated
    requestAnimationFrame(() => ocrQueue.enqueueDoc(doc.id));
  }

  return (
    <SafeAreaProvider>
      <FilterProcessorProvider>
        <SafeAreaView style={{flex: 1, backgroundColor: '#F8FAFC'}} edges={['top', 'bottom']}>
          {screen === 'library' ? (
            <LibraryScreen
              onOpen={openDoc}
              onCreate={startScan}
              docs={docs}
              refresh={() => setDocs(getDocsIndex())}
              onDelete={deleteDoc}
              onImport={handleImport}
            />
          ) : (
            <EditDocumentScreen
              doc={current!}
              onBack={() => setScreen('library')}
              onSaveMeta={updateDoc}
              onDelete={() => current && deleteDoc(current.id)}
            />
          )}
        </SafeAreaView>
      </FilterProcessorProvider>
    </SafeAreaProvider>
  );
}