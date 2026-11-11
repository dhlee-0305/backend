import { Request, Response } from 'express';
import { TextDecoder } from 'util';
import prisma from '../config/prisma';
import { BoardError, categories, mutateDocument, readDocument, readImage, serialize } from '../services/mkbrdService';

function integer(value: unknown, name: string, max = 2147483647): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) {
    throw new BoardError(400, `${name}은(는) 1~${max} 범위의 정수여야 합니다.`);
  }
  return Number(value);
}
function category(value: unknown) {
  if (typeof value !== 'string' || !categories.includes(value)) throw new BoardError(400, '카테고리는 AI, 관리, 설계, 기타 중 하나여야 합니다.');
}
function validate(req: Request, creating: boolean) {
  const body = req.body ?? {};
  const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
  const document = files?.file?.[0];
  const images = files?.images?.[0];
  if (Object.keys(body).some(key => key !== 'category')) {
    throw new BoardError(400, 'category, file, images 필드만 전송할 수 있습니다. 제목은 업로드 파일명을 사용합니다.');
  }
  if (creating || body.category !== undefined) category(body.category);
  if (creating && !document) throw new BoardError(400, 'Markdown 파일(file)을 업로드해 주세요.');
  if (!creating && !document && !images && body.category === undefined) throw new BoardError(400, '카테고리, 새 문서 파일 또는 이미지 ZIP을 전송해 주세요.');
  let title: string | undefined;
  if (document) {
    title = document.originalname;
    if (!title.endsWith('.md') || title.trim() !== title ||
      Buffer.byteLength(title, 'utf8') > 240 || /[<>:"/\\|?*\x00-\x1f\x7f]/.test(title) ||
      title.startsWith('.') || title.slice(0, -3).trim() !== title.slice(0, -3) || title.slice(0, -3).endsWith('.') || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])\./i.test(title)) {
      throw new BoardError(400, '파일명은 경로 문자가 없는 240바이트 이하의 .md 파일명이어야 합니다.');
    }
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(document.buffer);
      if (document.buffer.includes(0)) throw new Error('binary file');
    } catch {
      throw new BoardError(400, 'UTF-8 형식의 Markdown 파일만 업로드할 수 있습니다.');
    }
  }
  if (images && !images.originalname.toLowerCase().endsWith('.zip')) throw new BoardError(400, '이미지는 ZIP 파일(images)로 업로드해 주세요.');
  return { category: body.category, title, file: document?.buffer, images: images?.buffer };
}
function fail(res: Response, error: any) {
  if (error instanceof BoardError) return res.status(error.status).json({ success: false, message: error.message });
  if (error.code === 'P2002') return res.status(409).json({ success: false, message: '같은 카테고리에 동일한 파일명이 존재합니다.' });
  if (error.code === 'P2025') return res.status(404).json({ success: false, message: '문서를 찾을 수 없습니다.' });
  console.error('문서 API 오류', error);
  return res.status(500).json({ success: false, message: '문서 처리 실패' });
}
export const getDocuments = async (req: Request, res: Response) => {
  try {
    const page = integer(req.query.page ?? '1', 'page');
    const limit = integer(req.query.limit ?? '10', 'limit', 100);
    const skip = (page - 1) * limit;
    if (skip > 2147483647) throw new BoardError(400, '페이지 범위가 너무 큽니다.');
    if (req.query.category !== undefined) category(req.query.category);
    const where = req.query.category === undefined ? {} : { category: req.query.category as string };
    const [data, total] = await serialize(() => prisma.$transaction([
      prisma.mkbrd.findMany({ where, skip, take: limit, orderBy: { id: 'desc' } }),
      prisma.mkbrd.count({ where }),
    ]));
    return res.json({ success: true, data, total, page, limit });
  } catch (err) { return fail(res, err); }
};
export const getDocument = async (req: Request, res: Response) => {
  try {
    const id = integer(req.params.id, 'id');
    return res.json({ success: true, data: await serialize(() => readDocument(id)) });
  } catch (err) { return fail(res, err); }
};
export const getDocumentImage = async (req: Request, res: Response) => {
  try {
    const id = integer(req.params.id, 'id');
    const image = await serialize(() => readImage(id, req.params[0]));
    res.set({
      'Content-Type': image.contentType,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'",
      'Cache-Control': 'no-cache',
    });
    return res.send(image.data);
  } catch (err) { return fail(res, err); }
};
function mutation(action: '등록' | '수정' | '삭제') {
  return async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    try {
      const id = action === '등록' ? undefined : integer(req.params.id, 'id');
      const input = action === '삭제' ? {} : validate(req, action === '등록');
      const data = await serialize(() => mutateDocument(action, req.session.userId, id, input));
      return action === '삭제'
        ? res.json({ success: true, message: '문서가 삭제되었습니다.' })
        : res.status(action === '등록' ? 201 : 200).json({ success: true, data });
    } catch (err) { return fail(res, err); }
  };
}
export const createDocument = mutation('등록');
export const updateDocument = mutation('수정');
export const deleteDocument = mutation('삭제');
