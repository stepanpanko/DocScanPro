import RNFS from 'react-native-fs';
import { MMKV } from 'react-native-mmkv';
import type { Doc } from './types';
import { toFsPath } from './utils/paths';
import { generateId } from './utils/ids';

const kv = new MMKV({ id: 'DocScanPro' });
const ROOT = `${RNFS.DocumentDirectoryPath}/DocScanPro`;

async function ensureRoot() {
  const exists = await RNFS.exists(ROOT);
  if (!exists) await RNFS.mkdir(ROOT);
}

export function getDocsIndex(): Doc[] {
  const raw = kv.getString('docs-index');
  const docs = raw ? (JSON.parse(raw) as Doc[]) : [];
  return docs.map(normalizeDoc);
}

export function normalizeDoc(d: any): Doc {
  return {
    ...d,
    kind: d?.kind ?? 'generic',
    folderId: d?.folderId ?? null,
    ocrStatus: d?.ocrStatus ?? 'idle',
    ocrExcerpt: d?.ocrExcerpt ?? '',
    passwordHint: d?.passwordHint ?? null,
    tags: d?.tags ?? [],
    pages: (d?.pages ?? []).map((p: any) => ({
      id: p?.id ?? generateId(),
      uri: p?.uri,
      imageURL: p?.imageURL ?? p?.uri,
      rotation: p?.rotation ?? 0,
      filter: p?.filter ?? 'color',
      dpi: p?.dpi,
      quad: p?.quad,
      ocrText: p?.ocrText,
      width: p?.width,
      height: p?.height,
    })),
  };
}

export function saveDocsIndex(docs: Doc[]) {
  const normalizedDocs = docs.map(normalizeDoc);
  kv.set('docs-index', JSON.stringify(normalizedDocs));
}

async function docDir(docId: string) {
  await ensureRoot();
  const dir = `${ROOT}/${docId}`;
  const ok = await RNFS.exists(dir);
  if (!ok) await RNFS.mkdir(dir);
  return dir;
}

export async function putPageFile(
  docId: string,
  localUri: string,
  idx: number,
) {
  const dir = await docDir(docId);
  const srcPath = toFsPath(localUri);
  const srcName = srcPath.split('/').pop() || `page-${idx + 1}.jpg`;
  const ext = (srcName.split('.').pop() || 'jpg').toLowerCase();
  const target = `${dir}/page-${String(idx + 1).padStart(3, '0')}.${ext}`;

  const exists = await RNFS.exists(srcPath);
  if (!exists) throw new Error(`Source not found: ${srcPath}`);

  await RNFS.copyFile(srcPath, target);
  return `file://${target}`;
}

export async function removeDocFiles(docId: string) {
  const dir = `${ROOT}/${docId}`;
  const ok = await RNFS.exists(dir);
  if (ok) await RNFS.unlink(dir);
}
