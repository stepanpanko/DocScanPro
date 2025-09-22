import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Button from '../components/Button';

function Item({ item, onOpen, onDelete }) {
  return (
    <TouchableOpacity
      onPress={() => onOpen(item)}
      onLongPress={() =>
        Alert.alert('Delete', `Delete "${item.title}"?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => onDelete(item.id),
          },
        ])
      }
      style={styles.item}
    >
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemSubtitle}>
        {new Date(item.createdAt).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );
}

export default function LibraryScreen({ onOpen, onCreate, docs, refresh, onDelete }) {
  const handleDelete = (docId) => {
    onDelete(docId);
    refresh();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DocScan Pro</Text>
        <Button label="New Scan" onPress={onCreate} variant="primary" />
      </View>

      <FlashList
        data={docs}
        renderItem={({ item }) => (
          <Item
            item={item}
            onOpen={onOpen}
            onDelete={handleDelete}
          />
        )}
        keyExtractor={d => d.id}
        estimatedItemSize={80}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No documents yet. Tap "New Scan".
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
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
  itemTitle: {
    fontWeight: '600',
    color: '#0F172A',
    fontSize: 16,
  },
  itemSubtitle: {
    color: '#64748B',
    marginTop: 4,
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 48,
    fontSize: 16,
  },
});
