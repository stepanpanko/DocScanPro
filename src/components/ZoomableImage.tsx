import React, { useRef, useEffect } from 'react';
import {
  View,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import type { Page } from '../types';

type Props = {
  page: Page;
  onZoomChange?: (isZoomed: boolean) => void;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ZoomableImage({ page, onZoomChange }: Props) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Reset zoom when page changes
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
    }
  }, [page.uri]);

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isZoomed = contentSize.width > layoutMeasurement.width || 
                    contentSize.height > layoutMeasurement.height;
    onZoomChange?.(isZoomed);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        minimumZoomScale={1}
        maximumZoomScale={3}
        bouncesZoom={Platform.OS === 'ios'}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        centerContent={true}
      >
        <Image
          source={{ uri: page.uri }}
          style={styles.image}
          resizeMode="contain"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: screenHeight,
  },
  image: {
    width: screenWidth,
    height: screenHeight * 0.8, // Leave some space for UI
    maxWidth: screenWidth,
    maxHeight: screenHeight * 0.8,
  },
});
