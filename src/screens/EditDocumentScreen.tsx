import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useFilterProcessor } from '../FilterProcessor';
import { runOcrForDoc } from '../ocr/OCRService';
import { buildPdfFromImages, shareFile } from '../pdf';
import Button from '../components/Button';
import { Doc, Filter } from '../types';
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

  async function exportPdf(includeText = false) {
    try {
      setBusy(true);
      const processed: string[] = [];
      for (const p of doc.pages) {
        const out = await process({
          uri: p.uri,
          filter: p.filter,
          rotation: p.rotation,
        });
        processed.push(out);
      }

      log('[exportPdf] processed uris:', processed);

      if (includeText && !doc.pages?.some(p => p.ocrText)) {
        Alert.alert(
          'No OCR text found',
          'Run OCR first to make the PDF searchable.',
          [{ text: 'OK' }]
        );
        return;
      }

      const pdf = await buildPdfFromImages(doc.id, processed, {
        includeText,
        pages: doc.pages
      });
      log('[exportPdf] pdf:', pdf);

      onSaveMeta({ ...doc, pdfPath: pdf });
      await shareFile(pdf);
    } catch (e: any) {
      log('[exportPdf] ERROR:', e?.message || e);
      Alert.alert('Export failed', String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function runOCR() {
    try {
      setBusy(true);
      const updated = await runOcrForDoc(doc);
      onSaveMeta(updated);
      Alert.alert('OCR finished', 'Document is now searchable.');
    } catch (e: any) {
      log('[runOCR] ERROR:', e?.message || e);
      Alert.alert('OCR failed', String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function setFilter(f: Filter) {
    const pages = doc.pages.map(p => ({ ...p, filter: f }));
    onSaveMeta({ ...doc, pages });
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {doc.title}
        </Text>
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

      <ScrollView contentContainerStyle={styles.content}>
        {/* Page count indicator */}
        <Text style={styles.pageCount}>Pages: {doc.pages?.length ?? 0}</Text>

        {/* All pages */}
        {doc.pages?.map((page, index) => (
          <View key={page.id ?? page.uri} style={styles.pageContainer}>
            <Text style={styles.pageNumber}>Page {index + 1}</Text>
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: page.uri }}
                style={styles.previewImage}
              />
            </View>
          </View>
        ))}

        {/* Filter chips - apply to all pages */}
        <View style={styles.filterContainer}>
          {(['color', 'grayscale', 'bw'] as const).map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                doc.pages?.every(p => p.filter === f) && styles.filterChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  doc.pages?.every(p => p.filter === f) && styles.filterChipTextSelected,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            label="Export PDF & Share"
            onPress={() => exportPdf(false)}
            disabled={busy}
            variant="primary"
          />
        </View>

        {doc.ocrStatus === 'done' && (
          <View style={styles.buttonContainer}>
            <Button
              label="Export Searchable PDF & Share"
              onPress={() => exportPdf(true)}
              disabled={busy}
              variant="primary"
            />
          </View>
        )}

        {/* OCR Status Badge */}
        {doc.ocrStatus && doc.ocrStatus !== 'idle' && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusBadge}>
              {doc.ocrStatus === 'running' && '🔄 OCRing...'}
              {doc.ocrStatus === 'done' && '✅ Searchable ready'}
              {doc.ocrStatus === 'failed' && '❌ OCR failed'}
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            label={
              doc.ocrStatus === 'done'
                ? 'Re-run OCR'
                : 'Run OCR'
            }
            onPress={runOCR}
            disabled={busy}
            variant="secondary"
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            label={`View OCR text (${doc.pages?.filter(p => p.ocrText).length || 0}/${doc.pages?.length || 0} pages)`}
            onPress={() => {
              const text = doc.pages
                ?.map((p, i) => `Page ${i + 1}:\n${p.ocrText || '(no text)'}`)
                .join('\n\n---\n\n')
                .slice(0, 2000) || '(empty)';
              Alert.alert('OCR Text (truncated)', text);
            }}
            variant="secondary"
          />
        </View>
        {busy && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  backText: {
    fontWeight: '600',
    color: '#0F172A',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  deleteText: {
    fontSize: 18,
  },
  content: {
    padding: 16,
  },
  pageCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  pageContainer: {
    marginBottom: 24,
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewImage: {
    width: 200,
    height: 280,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'center',
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  filterChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    color: '#64748B',
    fontWeight: '500',
    fontSize: 14,
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    marginBottom: 12,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    backgroundColor: '#2563EB',
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 16,
  },
});
