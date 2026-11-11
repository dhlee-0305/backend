import { RequestHandler } from 'express';
import multer from 'multer';

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  preservePath: true,
  defParamCharset: 'utf8',
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
    files: 2,
    fields: 1,
    parts: 4,
    fieldNameSize: 100,
    fieldSize: 128,
  },
}).fields([{ name: 'file', maxCount: 1 }, { name: 'images', maxCount: 1 }]);

export const documentUpload: RequestHandler = (req, res, next) => {
  if (!req.session.userId) {
    res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    return;
  }
  if (!req.is('multipart/form-data')) {
    res.status(415).json({ success: false, message: 'multipart/form-data 형식으로 파일을 업로드해 주세요.' });
    return;
  }
  upload(req, res, error => {
    if (!error) return next();
    const tooLarge = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({
      success: false,
      message: tooLarge ? '파일 크기는 10MB 이하여야 합니다.' : 'category, Markdown 파일(file) 한 개와 선택 이미지 ZIP(images) 한 개를 전송해 주세요.',
    });
  });
};
