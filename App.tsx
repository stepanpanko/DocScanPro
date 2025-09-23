// App.tsx
import 'react-native-gesture-handler';
import * as React from 'react';
import {Alert} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

import {FilterProcessorProvider} from './src/FilterProcessor';
import LibraryScreen from './src/screens/LibraryScreen';
import EditDocumentScreen from './src/screens/EditDocumentScreen';
import {Doc, Page, newPage} from './src/types';
import {getDocsIndex, saveDocsIndex, putPageFile, removeDocFiles} from './src/storage';
import { VisionKitScannerEngine } from './src/scanner/VisionKitScannerEngine';

const scanner = new VisionKitScannerEngine();

export default function App() {
  const [screen, setScreen] = React.useState<'library' | 'editor'>('library');
  const [docs, setDocs] = React.useState<Doc[]>(getDocsIndex());
  const [current, setCurrent] = React.useState<Doc | null>(null);

  function persist(next: Doc[]) {
    saveDocsIndex(next);
    setDocs(next);
  }

  function openDoc(doc: Doc) {
    setCurrent(doc);
    setScreen('editor');
  }

  function updateDoc(updated: Doc) {
    const next = docs.map(d => (d.id === updated.id ? updated : d));
    persist(next);
    setCurrent(updated);
  }

  async function deleteDoc(id: string) {
    const next = docs.filter(d => d.id !== id);
    persist(next);
    await removeDocFiles(id);
    setCurrent(null);
    setScreen('library');
  }

  async function createFromScan(imageData: { uri: string; width?: number; height?: number }[]) {
    try {
      console.log('[createFromScan] input:', imageData);
      if (!imageData?.length) return;
      const doc: Doc = {
        id: String(Date.now()),
        title: `Scan ${new Date().toLocaleString()}`,
        createdAt: Date.now(),
        pages: [],
        ocr: [],
      };
      const pages: Page[] = [];
      for (let i = 0; i < imageData.length; i++) {
        const { uri, width, height } = imageData[i];
        const stored = await putPageFile(doc.id, uri, i);
        pages.push(newPage(stored, { width, height }));
      }
      const created: Doc = {...doc, pages};
      const next = [created, ...docs];
      persist(next);
      openDoc(created);
    } catch (e: any) {
      Alert.alert('Create failed', String(e?.message || e));
    }
  }

  async function startScan() {
    try {
      const { pages } = await scanner.scan(12);
      if (pages.length) {
        await createFromScan(pages.map(p => ({ uri: p.imageURL, width: p.width, height: p.height })));
      }
    } catch (e: any) {
      Alert.alert('Scanner error', String(e?.message || e));
    }
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