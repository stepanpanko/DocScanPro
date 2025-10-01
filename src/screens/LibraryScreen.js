import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActionSheetIOS,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Button from '../components/Button';
import { importFromFiles, importFromPhotos } from '../import/upload';
import { formatTimestamp } from '../utils/time';

// Enable layout animations (Android guard; harmless on iOS)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Item = React.memo(function Item({ item, onOpen, onDelete }) {
  return (
    <TouchableOpacity
      onPress={() => onOpen(item)}
      onLongPress={() =>
        Alert.alert('Delete', `Delete "${item.title}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
        ])
      }
      style={styles.item}
    >
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemSubtitle}>{formatTimestamp(item.createdAt)}</Text>
    </TouchableOpacity>
  );
});

export default function LibraryScreen({ onOpen, onCreate, docs, onDelete, onImport }) {
  const listRef = React.useRef(null);
  const [version, setVersion] = React.useState(0); // bump to force full list pass

  // When docs change, ensure the list re-renders and shows newest at top
  React.useEffect(() => {
    // animate insertions & force a measurement pass
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // scroll to top so the newly inserted item is visible immediately
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    // bump a version key so FlashList invalidates caches even if identity tricks it
    setVersion(v => v + 1);
  }, [docs.length]); // only on additions/removals

  const handleDelete = React.useCallback((docId) => onDelete(docId), [onDelete]);

  const handleUpload = React.useCallback(() => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Import from Files (Images/PDF)', 'Import from Photos (Images)', 'Cancel'],
        cancelButtonIndex: 2,
        title: 'Import Documents',
      },
      async (idx) => {
        try {
          if (idx === 0) {
            const doc = await importFromFiles();
            if (doc) {
              onImport(doc);
              // let React paint the list, then show the alert (so UI looks instant)
              requestAnimationFrame(() =>
                Alert.alert('Import Complete', `Imported ${doc.pages.length} pages into "${doc.title}"`)
              );
            }
          } else if (idx === 1) {
            const doc = await importFromPhotos();
            if (doc) {
              onImport(doc);
              requestAnimationFrame(() =>
                Alert.alert('Import Complete', `Imported ${doc.pages.length} pages into "${doc.title}"`)
              );
            }
          }
        } catch {
          // user cancel or picker error is already handled upstream; stay silent here
        }
      }
    );
  }, [onImport]);

  const renderItem = React.useCallback(
    ({ item }) => <Item item={item} onOpen={onOpen} onDelete={handleDelete} />,
    [onOpen, handleDelete]
  );

  const keyExtractor = React.useCallback((d) => String(d.id), []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DocScan Pro</Text>
        <View style={styles.headerButtons}>
          <Button label="+ Upload" onPress={handleUpload} variant="secondary" />
          <Button label="New Scan" onPress={onCreate} variant="primary" />
        </View>
      </View>

      <FlashList
        ref={listRef}
        data={docs}
        // Force re-render paths FlashList sometimes misses
        extraData={{ count: docs.length, version }}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={84}
        initialNumToRender={8}
        windowSize={10}
        removeClippedSubviews
        contentContainerStyle={{ paddingBottom: 16 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No documents yet. Tap "New Scan".</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  headerButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemTitle: { fontWeight: '600', color: '#0F172A', fontSize: 16 },
  itemSubtitle: { color: '#64748B', marginTop: 4, fontSize: 14 },
  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 48, fontSize: 16 },
});