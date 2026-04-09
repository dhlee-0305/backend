
## 프로젝트 구조
```
bookbackend/
├── config/
│   └── prisma.ts        # Prisma 클라이언트
├── controllers/
│   ├── bookController.ts       # 도서 CRUD
│   ├── readingLogController.ts # 독서 기록
│   ├── memoController.ts       # 메모 & 하이라이트
│   └── statsController.ts      # 통계
├── middleware/
│   └── errorHandler.ts  # 에러 핸들러
├── migrations/          # Prisma 마이그레이션 파일
├── routes/
│   └── index.ts         # API 라우터
├── index.ts             # 서버 진입점
├── schema.prisma        # DB 스키마 (Book, ReadingLog, Memo)
├── package.json
└── tsconfig.json
```

## API 명세서
@docs/spec.md

## 사용 기술
언어 : typescrpit
프레임워크 : Express
DB 스키마 정의 : prisma.js
데이터베이스 : MySQL