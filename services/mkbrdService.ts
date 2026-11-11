import path from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import prisma from '../config/prisma';

export const categories = ['AI', '관리', '설계', '기타'];
export const storageRoot = path.resolve(process.cwd(), 'mkbrd');
export class BoardError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// 조회도 같은 큐에 넣어 파일 교체 중인 상태가 노출되지 않게 한다.
let queue: Promise<unknown> = Promise.resolve();
export function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work);
  queue = result.catch(() => undefined);
  return result;
}

async function directory(category: string) {
  await fs.mkdir(storageRoot, { recursive: true });
  const rootStat = await fs.lstat(storageRoot);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error('문서 저장 경로가 올바르지 않습니다.');
  const target = path.join(storageRoot, category);
  await fs.mkdir(target, { recursive: true });
  for (const dir of [storageRoot, target]) {
    const stat = await fs.lstat(dir);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('문서 저장 경로가 올바르지 않습니다.');
  }
  return target;
}

async function filePath(category: string, title: string) {
  const target = path.join(await directory(category), title);
  try {
    const stat = await fs.lstat(target);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('문서 파일이 올바르지 않습니다.');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  return target;
}

export async function readDocument(id: number) {
  const row = await prisma.mkbrd.findUnique({ where: { id } });
  if (!row) throw new BoardError(404, '문서를 찾을 수 없습니다.');
  return { ...row, content: await fs.readFile(await filePath(row.category, row.title), 'utf8') };
}

type Input = { category?: string; title?: string; content?: string };
export async function mutateDocument(action: '등록' | '수정' | '삭제', userId: number, id: number | undefined, input: Input) {
  const undo: Array<() => Promise<unknown>> = [];
  const garbage: string[] = [];
  let result;
  try {
    result = await prisma.$transaction(async tx => {
      const old = id === undefined ? null : await tx.mkbrd.findUnique({ where: { id } });
      if (id !== undefined && !old) throw new BoardError(404, '문서를 찾을 수 없습니다.');
      let row = old;
      if (action !== '삭제') {
        const category = input.category ?? old!.category;
        const title = input.title ?? old!.title;
        const content = input.content ?? await fs.readFile(await filePath(old!.category, old!.title), 'utf8');
        const data = { category, title, size: Buffer.byteLength(content, 'utf8') };
        row = action === '등록'
          ? await tx.mkbrd.create({ data })
          : await tx.mkbrd.update({ where: { id }, data });

        const dest = await filePath(category, title);
        const source = old ? await filePath(old.category, old.title) : null;
        // DB 외부에서 만들어진 파일도 덮어쓰지 않는다.
        if (dest !== source) {
          try {
            await fs.lstat(dest);
            throw new BoardError(409, '같은 카테고리에 동일한 파일명이 존재합니다.');
          } catch (err) { if (err.code !== 'ENOENT') throw err; }
        }
        const temp = path.join(await directory(category), `.mkbrd-${randomUUID()}.tmp`);
        garbage.push(temp);
        await fs.writeFile(temp, content, { encoding: 'utf8', flag: 'wx' });
        if (source) {
          const backup = `${source}.${randomUUID()}.bak`;
          await fs.rename(source, backup);
          undo.push(() => fs.rename(backup, source));
          garbage.push(backup);
        }
        await fs.rename(temp, dest);
        undo.push(() => fs.unlink(dest));
      } else {
        const source = await filePath(old!.category, old!.title);
        const backup = `${source}.${randomUUID()}.bak`;
        await fs.rename(source, backup);
        undo.push(() => fs.rename(backup, source));
        garbage.push(backup);
        await tx.mkbrd.delete({ where: { id } });
      }
      await tx.mkbrdHist.create({ data: { documentId: row!.id, userId, action } });
      return row;
    });
  } catch (err) {
    // 복구 실패 시 백업은 남겨 수동 복구할 수 있게 한다.
    for (const restore of undo.reverse()) {
      try { await restore(); } catch (restoreError) {
        console.error('문서 파일 복구 실패', restoreError);
        throw new Error('문서 저장 실패: 파일 복구가 필요합니다.');
      }
    }
    for (const name of garbage) await fs.unlink(name).catch(() => undefined);
    throw err;
  }
  for (const name of garbage) await fs.unlink(name).catch(err => {
    if (err.code !== 'ENOENT') console.error('문서 임시 파일 정리 실패', err);
  });
  return result;
}
