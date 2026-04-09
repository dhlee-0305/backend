-- Test user data for users table
-- MySQL / Prisma schema
--
-- 암호화 전 패스워드
--   tester@example.com : Test1234!
--   reader@example.com : Test5678!

START TRANSACTION;

-- Remove previously inserted test users
DELETE FROM users
WHERE email IN ('tester@example.com', 'reader@example.com');

INSERT INTO users (email, password, createdAt) VALUES
  (
    'tester@example.com',
    '$2b$10$ySxpcXaP48Auk/U4qRSrguXR/ZIxiwayu48wFHwvF9Os/jt0h3Sxu',
    NOW(3)
  ),
  (
    'reader@example.com',
    '$2b$10$eQtA3uRyUk4oCHekDFO6AeNCdMkHhG..y80OPdE2iHbDBlQpqfIgS',
    NOW(3)
  );

COMMIT;
