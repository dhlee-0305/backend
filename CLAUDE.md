
## 프로젝트 구조
```
bookbackend/
├── config/
│   └── prisma.ts        # Prisma 클라이언트
├── controllers/
│   ├── authController.ts       # 회원가입 / 로그인 / 로그아웃 / 현재 사용자 조회
│   ├── bookController.ts       # 도서 CRUD
│   ├── readingLogController.ts # 독서 기록
│   ├── memoController.ts       # 메모 & 하이라이트
│   └── statsController.ts      # 통계
├── middleware/
│   └── errorHandler.ts  # 에러 핸들러
├── migrations/          # Prisma 마이그레이션 파일
├── routes/
│   └── index.ts         # API 라우터
├── test/
│   └── rest-auth.http   # 인증 API 수동 테스트 예시
├── types/
│   └── session.d.ts     # express-session 타입 확장
├── index.ts             # 서버 진입점
├── schema.prisma        # DB 스키마 (User, LoginHistory, Book, ReadingLog, Memo)
├── package.json
└── tsconfig.json
```

---

## API 명세서
@docs/spec.md

---

## 사용 기술
언어 : typescript
프레임워크 : Express
인증 / 세션 : express-session, bcrypt
DB 스키마 정의 : Prisma
데이터베이스 : MySQL

---



