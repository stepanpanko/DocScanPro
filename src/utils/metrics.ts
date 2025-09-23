// src/utils/metrics.ts
// Simple metrics tracking that persists in MMKV
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'metrics' });

const METRICS_KEYS = {
  ocr_page_ok: 'ocr_page_ok',
  ocr_page_fail: 'ocr_page_fail',
} as const;

type MetricKey = keyof typeof METRICS_KEYS;

export function incrementMetric(key: MetricKey): number {
  const current = getMetric(key);
  const newValue = current + 1;
  storage.set(String(key), newValue);
  return newValue;
}

export function getMetric(key: MetricKey): number {
  const value = storage.getNumber(String(key));
  return value ?? 0;
}

export function resetMetrics(): void {
  Object.values(METRICS_KEYS).forEach(key => {
    storage.delete(String(key));
  });
}

export function getAllMetrics(): Record<string, number> {
  const result: Record<string, number> = {};
  Object.values(METRICS_KEYS).forEach(key => {
    const value = getMetric(key as MetricKey);
    if (value > 0) {
      result[key] = value;
    }
  });
  return result;
}
