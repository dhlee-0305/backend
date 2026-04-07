import { Request, Response, NextFunction } from 'express';

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `경로를 찾을 수 없습니다: ${req.originalUrl}` });
};

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || '서버 오류가 발생했습니다.' });
};
