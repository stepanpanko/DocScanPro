import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
} from 'react-native';
import ZoomableImage from './ZoomableImage';
import type { Page } from '../types';

type Props = {
  pages: Page[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
};

const { width: screenWidth } = Dimensions.get('window');

export default function PageCarousel({ pages, initialIndex = 0, onIndexChange }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  const handleIndexChange = useCallback((index: number) => {
    setCurrentIndex(index);
    onIndexChange?.(index);
  }, [onIndexChange]);

  const scrollToIndex = useCallback((index: number) => {
    if (flatListRef.current && index >= 0 && index < pages.length) {
      flatListRef.current.scrollToIndex({ index, animated: true });
    }
  }, [pages.length]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: screenWidth,
    offset: screenWidth * index,
    index,
  }), []);

  const renderItem = useCallback(({ item }: { item: Page }) => (
    <ZoomableImage page={item} />
  ), []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== currentIndex) {
        handleIndexChange(index);
      }
    }
  }, [currentIndex, handleIndexChange]);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  if (pages.length === 0) {
    return <View style={styles.emptyContainer} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={pages}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.uri}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews={true}
        windowSize={3}
        maxToRenderPerBatch={1}
        updateCellsBatchingPeriod={100}
        initialNumToRender={1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
});
