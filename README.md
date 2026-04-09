# 도서관리 서비스 - Backend

## 기술 스택
- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **Database**: MySQL
- **ORM**: Prisma



## 시작하기

### 1. MySQL 데이터베이스 생성
```sql
CREATE DATABASE book_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 환경변수 설정
```env
DATABASE_URL="mysql://root:your_password@localhost:3306/book_manager"
PORT=4000
CLIENT_URL=http://localhost:4000
```

### 3. 패키지 설치
```bash
npm install
```

### 4. Prisma 마이그레이션 (DB 테이블 생성)
```bash
npm run prisma:migrate
```

### 5. 서버 실행
```bash
npm run dev
```

---

> 전체 API 명세 및 비즈니스 규칙은 [docs/spec.md](docs/spec.md)를 참고하세요.


