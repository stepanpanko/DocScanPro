import React from 'react';
import { View, FlatList, Image, Text } from 'react-native';
import Button from '../components/Button';
import ScanModule from '../native/scanModule';

export default function Home() {
  const [pages, setPages] = React.useState<string[]>([]);
  return (
    <View className="flex-1 p-4 gap-4">
      <Button
        title="Scan document"
        onPress={async () => {
          try {
            const res = await ScanModule.scan();
            setPages(res.pages ?? []);
          } catch (e) { console.warn(e); }
        }}
      />
      <FlatList
        data={pages}
        keyExtractor={(uri) => uri}
        renderItem={({ item }) => (
          <View className="mb-3 rounded-xl overflow-hidden">
            <Image source={{ uri: item }} style={{ width: '100%', height: 200 }} />
          </View>
        )}
        ListEmptyComponent={<Text className="text-neutral-500">No scans yet</Text>}
      />
    </View>
  );
}