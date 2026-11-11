import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { BoardError, categories, mutateDocument, readDocument, serialize } from '../services/mkbrdService';

function integer(value: unknown, name: string, max = 2147483647): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) {
    throw new BoardError(400, `${name}은(는) 1~${max} 범위의 정수여야 합니다.`);
  }
  return Number(value);
}
function category(value: unknown) {
  if (typeof value !== 'string' || !categories.includes(value)) throw new BoardError(400, '카테고리는 AI, 관리, 설계, 기타 중 하나여야 합니다.');
}
function validate(body: any, creating: boolean) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BoardError(400, '요청 본문이 올바르지 않습니다.');
  if (!creating && !['category', 'title', 'content'].some(key => body[key] !== undefined)) throw new BoardError(400, '수정할 항목을 입력해 주세요.');
  if (creating || body.category !== undefined) category(body.category);
  if (creating || body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.endsWith('.md') || body.title.trim() !== body.title ||
      Buffer.byteLength(body.title, 'utf8') > 240 || /[<>:"/\\|?*\x00-\x1f\x7f]/.test(body.title) ||
      body.title.startsWith('.') || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])\./i.test(body.title)) {
      throw new BoardError(400, '제목은 경로 문자가 없는 240바이트 이하의 .md 파일명이어야 합니다.');
    }
  }
  if ((creating || body.content !== undefined) && typeof body.content !== 'string') throw new BoardError(400, 'content는 Markdown 문자열이어야 합니다.');
  return { category: body.category, title: body.title, content: body.content };
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
function mutation(action: '등록' | '수정' | '삭제') {
  return async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    try {
      const id = action === '등록' ? undefined : integer(req.params.id, 'id');
      const input = action === '삭제' ? {} : validate(req.body, action === '등록');
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
