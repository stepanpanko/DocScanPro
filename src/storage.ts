import RNFS from 'react-native-fs';
import { MMKV } from 'react-native-mmkv';
import type { Doc } from './types';
import { toFsPath } from './utils/paths';

const kv = new MMKV({ id: 'DocScanPro' });
const ROOT = `${RNFS.DocumentDirectoryPath}/DocScanPro`;

async function ensureRoot() {
  const exists = await RNFS.exists(ROOT);
  if (!exists) await RNFS.mkdir(ROOT);
}

export function getDocsIndex(): Doc[] {
  const raw = kv.getString('docs-index');
  return raw ? (JSON.parse(raw) as Doc[]) : [];
}

export function saveDocsIndex(docs: Doc[]) {
  kv.set('docs-index', JSON.stringify(docs));
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
