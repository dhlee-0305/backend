import path from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import prisma from '../config/prisma';
import { BoardError } from './mkbrdError';
import { extractImages, imagePathParts, imageTypes } from './mkbrdImages';
export { BoardError } from './mkbrdError';

export const categories = ['AI', '관리', '설계', '기타'];
export const storageRoot = path.resolve(process.cwd(), 'mkbrd');

// 조회도 같은 큐에 넣어 폴더 교체 중인 상태가 노출되지 않게 한다.
let queue: Promise<unknown> = Promise.resolve();
export function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work);
  queue = result.catch(() => undefined);
  return result;
}

async function existing(target: string) {
  try { return await fs.lstat(target); } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}
async function safeDirectory(target: string) {
  const stat = await fs.lstat(target);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('문서 저장 경로가 올바르지 않습니다.');
}
async function directory(category: string) {
  await fs.mkdir(storageRoot, { recursive: true });
  await safeDirectory(storageRoot);
  const target = path.join(storageRoot, category);
  await fs.mkdir(target, { recursive: true });
  await safeDirectory(target);
  return target;
}
function folderName(title: string) { return title.slice(0, -3); }
async function sourceDocument(category: string, title: string) {
  const parent = await directory(category);
  const folder = path.join(parent, folderName(title));
  const stat = await existing(folder);
  if (stat) {
    await safeDirectory(folder);
    const file = path.join(folder, title);
    const fileStat = await fs.lstat(file);
    if (fileStat.isSymbolicLink() || !fileStat.isFile()) throw new Error('문서 파일이 올바르지 않습니다.');
    return { location: folder, file, legacy: false };
  }
  // 이전 버전의 평면 경로를 읽고, 수정 시 문서별 폴더로 전환한다.
  const file = path.join(parent, title);
  const fileStat = await fs.lstat(file);
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) throw new Error('문서 파일이 올바르지 않습니다.');
  return { location: file, file, legacy: true };
}
async function copyImages(source: string, dest: string) {
  const stat = await existing(source);
  if (!stat) return;
  await safeDirectory(source);
  for (const name of await fs.readdir(source)) {
    const from = path.join(source, name);
    const to = path.join(dest, name);
    const entry = await fs.lstat(from);
    if (entry.isSymbolicLink()) throw new Error('이미지 링크는 허용하지 않습니다.');
    if (entry.isDirectory()) {
      await fs.mkdir(to);
      await copyImages(from, to);
    } else if (entry.isFile()) await fs.copyFile(from, to);
    else throw new Error('이미지 파일이 올바르지 않습니다.');
  }
}

export async function readDocument(id: number) {
  const row = await prisma.mkbrd.findUnique({ where: { id } });
  if (!row) throw new BoardError(404, '문서를 찾을 수 없습니다.');
  const source = await sourceDocument(row.category, row.title);
  return { ...row, content: await fs.readFile(source.file, 'utf8'), imageBaseUrl: `/api/mkbrd/${id}/image/` };
}
export async function readImage(id: number, name: string) {
  const parts = imagePathParts(name);
  const contentType = imageTypes[path.extname(name).toLowerCase()];
  if (!contentType) throw new BoardError(404, '이미지를 찾을 수 없습니다.');
  const row = await prisma.mkbrd.findUnique({ where: { id } });
  if (!row) throw new BoardError(404, '문서를 찾을 수 없습니다.');
  const source = await sourceDocument(row.category, row.title);
  if (source.legacy) throw new BoardError(404, '이미지를 찾을 수 없습니다.');
  try {
    let target = path.join(source.location, 'image');
    await safeDirectory(target);
    for (const [index, part] of parts.entries()) {
      target = path.join(target, part);
      const stat = await fs.lstat(target);
      if (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw new BoardError(404, '이미지를 찾을 수 없습니다.');
    }
    return { data: await fs.readFile(target), contentType };
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') throw new BoardError(404, '이미지를 찾을 수 없습니다.');
    throw err;
  }
}

type Input = { category?: string; title?: string; file?: Buffer; images?: Buffer };
export async function mutateDocument(action: '등록' | '수정' | '삭제', userId: number, id: number | undefined, input: Input) {
  const undo: Array<() => Promise<unknown>> = [];
  const garbage: string[] = [];
  let staged: string | undefined;
  let result;
  try {
    // 압축 해제와 이미지 복사는 DB 트랜잭션 전에 수행한다.
    const old = id === undefined ? null : await prisma.mkbrd.findUnique({ where: { id } });
    if (id !== undefined && !old) throw new BoardError(404, '문서를 찾을 수 없습니다.');
    const source = old ? await sourceDocument(old.category, old.title) : null;
    const category = input.category ?? old!.category;
    const title = input.title ?? old!.title;
    const parent = await directory(category);
    const dest = path.join(parent, folderName(title));
    let size: number;
    if (action !== '삭제') {
      if (dest !== source?.location && await existing(dest)) throw new BoardError(409, '같은 카테고리에 동일한 파일명이 존재합니다.');
      const bytes = input.file ?? await fs.readFile(source!.file);
      size = bytes.length;
      staged = path.join(parent, `.mkbrd-${randomUUID()}.tmp`);
      garbage.push(staged);
      await fs.mkdir(staged);
      await fs.writeFile(path.join(staged, title), bytes, { flag: 'wx' });
      const imageDir = path.join(staged, 'image');
      await fs.mkdir(imageDir);
      if (input.images !== undefined) await extractImages(input.images, imageDir);
      else if (source && !source.legacy) await copyImages(path.join(source.location, 'image'), imageDir);
    }
    result = await prisma.$transaction(async tx => {
      const row = action === '등록'
        ? await tx.mkbrd.create({ data: { category, title, size } })
        : action === '수정'
          ? await tx.mkbrd.update({ where: { id }, data: { category, title, size } })
          : await tx.mkbrd.delete({ where: { id } });
      if (source) {
        const backup = path.join(path.dirname(source.location), `.mkbrd-${randomUUID()}.bak`);
        await fs.rename(source.location, backup);
        undo.push(() => fs.rename(backup, source.location));
        garbage.push(backup);
      }
      if (staged) {
        await fs.rename(staged, dest);
        undo.push(() => fs.rm(dest, { recursive: true }));
      }
      await tx.mkbrdHist.create({ data: { documentId: row.id, userId, action } });
      return row;
    });
  } catch (err) {
    // 복구 실패 시 백업을 남겨 수동 복구할 수 있게 한다.
    for (const restore of undo.reverse()) {
      try { await restore(); } catch (restoreError) {
        console.error('문서 폴더 복구 실패', restoreError);
        throw new Error('문서 저장 실패: 폴더 복구가 필요합니다.');
      }
    }
    for (const name of garbage) await fs.rm(name, { recursive: true, force: true }).catch(() => undefined);
    throw err;
  }
  for (const name of garbage) await fs.rm(name, { recursive: true, force: true }).catch(err => console.error('문서 임시 폴더 정리 실패', err));
  return result;
}
