// src/FilterProcessor.tsx
import React, { createContext, useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import ImageResizer from 'react-native-image-resizer';

type Job = {
  key: string;
  uri: string;
  filter: 'color' | 'grayscale' | 'bw';
  rotation: 0 | 90 | 180 | 270;
};
type CtxValue = {
  process: (p: {
    uri: string;
    filter?: Job['filter'];
    rotation?: Job['rotation'];
  }) => Promise<string>;
};

const Ctx = createContext<CtxValue | null>(null);

// ---- SAFELY load IFK at runtime
let IFK: any = null;
try {
  IFK = require('react-native-image-filter-kit');
} catch {
  /* leave null */
}

const IFKImage = IFK?.Image;
const Grayscale = IFK?.Grayscale;
const Saturation = IFK?.Saturation;
const Contrast = IFK?.Contrast;

export function FilterProcessorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // If IFK isn't available, just render children and do no-op processing.
  const [job, setJob] = useState<Job | null>(null);
  const resolver = useRef<{
    resolve: (s: string) => void;
    reject: (e: any) => void;
  } | null>(null);

  function process({
    uri,
    filter = 'color',
    rotation = 0,
  }: {
    uri: string;
    filter?: Job['filter'];
    rotation?: Job['rotation'];
  }) {
    // If IFK is missing, just return the (optionally rotated) uri.
    if (!IFKImage || !Grayscale || !Saturation || !Contrast) {
      return Promise.resolve(uri);
    }

    return new Promise<string>(async (resolve, reject) => {
      try {
        let base = uri;
        if (rotation) {
          const rotated = await ImageResizer.createResizedImage(
            base,
            3000,
            3000,
            'JPEG',
            100,
            rotation,
          );
          base =
            (rotated as { path?: string; uri?: string }).uri ||
            (rotated as { path?: string; uri?: string }).path ||
            String(rotated);
        }
        setJob({ key: String(Date.now()), uri: base, filter, rotation });
        resolver.current = { resolve, reject };
      } catch (e) {
        reject(e);
      }
    });
  }

  const onExtractDone = (e: { nativeEvent?: { uri?: string } }) => {
    const file = e?.nativeEvent?.uri;
    const uri = file?.startsWith('file://') ? file : `file://${file}`;
    resolver.current?.resolve(uri || '');
    resolver.current = null;
    setJob(null);
  };

  // hidden renderer only when IFK exists + we have a job
  return (
    <Ctx.Provider value={{ process }}>
      {children}
      {job && IFKImage && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
        >
          {job.filter === 'grayscale' ? (
            <Grayscale
              image={<IFKImage source={{ uri: job.uri }} />}
              extractImageEnabled
              onExtractImage={onExtractDone}
            />
          ) : job.filter === 'bw' ? (
            <Saturation
              amount={0}
              image={
                <Contrast
                  amount={1.35}
                  image={<IFKImage source={{ uri: job.uri }} />}
                />
              }
              extractImageEnabled
              onExtractImage={onExtractDone}
            />
          ) : (
            <IFKImage
              source={{ uri: job.uri }}
              extractImageEnabled
              onExtractImage={onExtractDone}
            />
          )}
        </View>
      )}
    </Ctx.Provider>
  );
}

export function useFilterProcessor() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('FilterProcessorProvider is not mounted');
  return ctx;
}
