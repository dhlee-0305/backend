import path from 'path';
import { createWriteStream, promises as fs } from 'fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { crc32 } from 'zlib';
import * as yauzl from 'yauzl';
import { BoardError } from './mkbrdError';

export const MAX_IMAGE_ARCHIVE_SIZE = 10 * 1024 * 1024;
export const MAX_EXTRACTED_IMAGE_SIZE = 100 * 1024 * 1024;
export const MAX_IMAGE_ENTRIES = 1000;
export const imageTypes: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.bmp': 'image/bmp', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
};

export function imagePathParts(name: string): string[] {
  const parts = name.split('/');
  if (!name || Buffer.byteLength(name) > 1024 || parts.some(part =>
    !part || part === '.' || part === '..' || part.endsWith('.') || part.trim() !== part ||
    /[<>:"\\|?*\x00-\x1f\x7f]/.test(part) || Buffer.byteLength(part) > 240 ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new BoardError(400, '이미지 ZIP에 허용되지 않는 경로 또는 파일명이 있습니다.');
  }
  return parts;
}

export async function extractImages(buffer: Buffer, target: string): Promise<void> {
  if (buffer.length > MAX_IMAGE_ARCHIVE_SIZE) throw new BoardError(413, '이미지 ZIP 크기는 10MB 이하여야 합니다.');
  let zip: yauzl.ZipFile;
  try {
    zip = await yauzl.fromBufferPromise(buffer, { lazyEntries: true, strictFileNames: true, validateEntrySizes: true });
    let count = 0;
    let total = 0;
    const seen = new Set<string>();
    for await (const entry of zip.eachEntry()) {
      if (++count > MAX_IMAGE_ENTRIES) throw new BoardError(400, '이미지 ZIP 항목은 1000개 이하여야 합니다.');
      const isDirectory = entry.fileName.endsWith('/');
      const parts = imagePathParts(isDirectory ? entry.fileName.slice(0, -1) : entry.fileName);
      const kind = (entry.externalFileAttributes >>> 16) & 0xf000;
      if ((kind && kind !== 0x8000 && kind !== 0x4000) || (kind === 0x4000 && !isDirectory) || entry.isEncrypted()) {
        throw new BoardError(400, '이미지 ZIP의 링크, 특수 파일 또는 암호화 항목은 허용하지 않습니다.');
      }
      const key = parts.join('/').normalize('NFC').toLowerCase();
      if (seen.has(key)) throw new BoardError(400, '이미지 ZIP에 중복된 경로가 있습니다.');
      seen.add(key);
      const dest = path.join(target, ...parts);
      if (isDirectory) {
        await fs.mkdir(dest, { recursive: true });
        continue;
      }
      if (!imageTypes[path.extname(entry.fileName).toLowerCase()]) throw new BoardError(400, '이미지 ZIP에는 이미지 파일만 포함할 수 있습니다.');
      if (entry.uncompressedSize > MAX_EXTRACTED_IMAGE_SIZE - total) throw new BoardError(400, '이미지 압축 해제 크기는 총 100MB 이하여야 합니다.');
      await fs.mkdir(path.dirname(dest), { recursive: true });
      const stream = await zip.openReadStreamPromise(entry);
      let checksum = 0;
      const limit = new Transform({ transform(chunk: Buffer, _encoding, callback) {
        total += chunk.length;
        if (total > MAX_EXTRACTED_IMAGE_SIZE) callback(new BoardError(400, '이미지 압축 해제 크기는 총 100MB 이하여야 합니다.'));
        else {
          checksum = crc32(chunk, checksum);
          callback(null, chunk);
        }
      } });
      await pipeline(stream, limit, createWriteStream(dest, { flags: 'wx' }));
      if (checksum !== entry.crc32) throw new BoardError(400, '이미지 ZIP의 파일 무결성 검증에 실패했습니다.');
    }
  } catch (error) {
    if (error instanceof BoardError || ['EACCES', 'EPERM', 'ENOSPC', 'EIO', 'EROFS'].includes(error.code)) throw error;
    throw new BoardError(400, '올바른 이미지 ZIP 파일이 아니거나 압축 해제에 실패했습니다.');
  } finally {
    zip?.close();
  }
}
