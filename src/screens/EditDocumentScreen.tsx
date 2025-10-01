import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useFilterProcessor } from '../FilterProcessor';
import { buildPdfFromImages, shareFile } from '../pdf';
import Button from '../components/Button';
import PageCarousel from '../components/PageCarousel';
import ThumbnailStrip from '../components/ThumbnailStrip';
import SearchableStatus from './DocumentDetails/SearchableStatus';
import { ocrQueue } from '../ocr/queue';
import { Doc } from '../types';
import { log } from '../utils/log';

type Props = {
  doc: Doc;
  onBack: () => void;
  onSaveMeta: (d: Doc) => void;
  onDelete: () => void;
};

export default function EditDocumentScreen({
  doc,
  onBack,
  onSaveMeta,
  onDelete,
}: Props) {
  const { process } = useFilterProcessor();
  const [busy, setBusy] = React.useState(false);
  const [currentDoc, setCurrentDoc] = React.useState<Doc>(doc);
  const [currentPageIndex, setCurrentPageIndex] = React.useState(0);

  // Guard against empty pages while layout settles
  const pages = currentDoc.pages ?? [];
  if (pages.length === 0) {
    return <View style={{flex:1, backgroundColor:'#111'}} />;
  }

  // Update local doc state when prop changes
  React.useEffect(() => {
    setCurrentDoc(doc);
  }, [doc]);

  // Auto-trigger OCR when document is opened
  React.useEffect(() => {
    console.log('[OCR][auto] document opened', { docId: doc.id, status: doc.ocrStatus });
    log('[OCR] Document opened, checking OCR status:', doc.id, doc.ocrStatus);
    
    // Auto-enqueue if status is undefined, idle, or error
    if (doc.ocrStatus === undefined || doc.ocrStatus === 'idle' || doc.ocrStatus === 'error') {
      console.log('[OCR][auto] auto-enqueue triggered', { docId: doc.id });
      log('[OCR] Auto-enqueueing document for OCR:', doc.id);
      ocrQueue.enqueueDoc(doc.id);
    }
  }, [doc.id, doc.ocrStatus]);


  async function exportPdf() {
    try {
      setBusy(true);
      const processed: string[] = [];
      for (const p of currentDoc.pages) {
        const out = await process({
          uri: p.uri,
          filter: p.filter,
          rotation: p.rotation,
        });
        processed.push(out);
      }

      log('[exportPdf] processed uris:', processed);
      const pdf = await buildPdfFromImages(currentDoc.id, processed);
      log('[exportPdf] pdf:', pdf);

      const updatedDoc = { ...currentDoc, pdfPath: pdf };
      setCurrentDoc(updatedDoc);
      onSaveMeta(updatedDoc);
      await shareFile(pdf);
    } catch (e: any) {
      log('[exportPdf] ERROR:', e?.message || e);
      Alert.alert('Export failed', String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }



  return (
    <View key={doc.id} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {currentDoc.title}
          </Text>
          <Text style={styles.pageIndicator}>
            {currentPageIndex + 1}/{currentDoc.pages.length}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Delete document',
              'This will remove the document and its files.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: onDelete },
              ],
            );
          }}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Searchable Status Banner */}
      <SearchableStatus doc={currentDoc} />

      {/* Page Carousel */}
      <View style={styles.carouselContainer}>
        <PageCarousel
          pages={currentDoc.pages}
          initialIndex={currentPageIndex}
          onIndexChange={setCurrentPageIndex}
        />
      </View>

      {/* Thumbnail Strip */}
      {currentDoc.pages.length > 1 && (
        <ThumbnailStrip
          pages={currentDoc.pages}
          currentIndex={currentPageIndex}
          onPageSelect={setCurrentPageIndex}
        />
      )}

      {/* Export Button */}
      <View style={styles.buttonContainer}>
        <Button
          label="Export PDF & Share"
          onPress={exportPdf}
          disabled={busy}
          variant="primary"
        />
      </View>

      {busy && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backText: {
    fontWeight: '600',
    color: '#FFFFFF',
    fontSize: 16,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  pageIndicator: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteText: {
    fontSize: 18,
  },
  carouselContainer: {
    flex: 1,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 16,
  },
});
