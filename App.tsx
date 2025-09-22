// App.tsx
import 'react-native-gesture-handler';
import * as React from 'react';
import {Alert} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

import {FilterProcessorProvider} from './src/FilterProcessor';
import LibraryScreen from './src/screens/LibraryScreen';
import EditDocumentScreen from './src/screens/EditDocumentScreen';
import {Doc, Page} from './src/types';
import {getDocsIndex, saveDocsIndex, putPageFile, removeDocFiles} from './src/storage';

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
      const next = [created, ...docs];
      persist(next);
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