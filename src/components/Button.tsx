import React from 'react';
import { Pressable, Text } from 'react-native';

export default function Button({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="bg-blue-600 rounded-2xl px-4 py-3 active:opacity-80">
      <Text className="text-white text-base font-semibold text-center">{title}</Text>
    </Pressable>
  );
}