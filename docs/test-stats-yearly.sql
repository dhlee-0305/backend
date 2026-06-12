-- Yearly stats test data for GET /api/stats
-- MySQL / Prisma schema
--
-- Login users:
--   tester@example.com : Test1234!
--   reader@example.com : Test5678!
--
-- Current stats logic:
--   yearlyReading / yearlyDoneCount count reading_logs where
--     readStatus = 'READ'
--     userName = logged-in user's email
--     year is based on reading_logs.createdAt

START TRANSACTION;

-- Remove previously inserted yearly stats test data first.
DELETE rl
FROM reading_logs rl
JOIN books b ON b.id = rl.bookId
WHERE b.isbn IN (
  'STAT-YEAR-0001',
  'STAT-YEAR-0002',
  'STAT-YEAR-0003',
  'STAT-YEAR-0004',
  'STAT-YEAR-0005',
  'STAT-YEAR-0006',
  'STAT-YEAR-0007',
  'STAT-YEAR-0008',
  'STAT-YEAR-0009',
  'STAT-YEAR-0010',
  'STAT-YEAR-0011',
  'STAT-YEAR-0012'
);

DELETE FROM books
WHERE isbn IN (
  'STAT-YEAR-0001',
  'STAT-YEAR-0002',
  'STAT-YEAR-0003',
  'STAT-YEAR-0004',
  'STAT-YEAR-0005',
  'STAT-YEAR-0006',
  'STAT-YEAR-0007',
  'STAT-YEAR-0008',
  'STAT-YEAR-0009',
  'STAT-YEAR-0010',
  'STAT-YEAR-0011',
  'STAT-YEAR-0012'
);

DELETE FROM login_history
WHERE email IN ('tester@example.com', 'reader@example.com');

DELETE FROM users
WHERE email IN ('tester@example.com', 'reader@example.com');

-- Insert login users.
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

-- Insert books used by reading_logs.
INSERT INTO books (
  title,
  author,
  publisher,
  isbn,
  genre,
  coverUrl,
  purchaseDate,
  status,
  createdAt,
  updatedAt
) VALUES
  ('[STATS] 2024 tester book 1', 'Stats Author', 'Stats Pub', 'STAT-YEAR-0001', 'Stats', NULL, '2024-01-10 00:00:00.000', 'OWNED', '2024-01-10 00:00:00.000', NOW(3)),
  ('[STATS] 2024 tester book 2', 'Stats Author', 'Stats Pub', 'STAT-YEAR-0002', 'Stats', NULL, '2024-02-10 00:00:00.000', 'OWNED', '2024-02-10 00:00:00.000', NOW(3)),
  ('[STATS] 2025 tester book 1', 'Stats Author', 'Stats Pub', 'STAT-YEAR-0003', 'Stats', NULL, '2025-03-10 00:00:00.000', 'OWNED', '2025-03-10 00:00:00.000', NOW(3)),
  ('[STATS] 2026 tester book 1', 'Stats Author', 'Stats Pub', 'STAT-YEAR-0004', 'Stats', NULL, '2026-04-10 00:00:00.000', 'OWNED', '2026-04-10 00:00:00.000', NOW(3)),
  ('[STATS] 2026 tester book 2', 'Stats Author', 'Stats Pub', 'STAT-YEAR-0005', 'Stats', NULL, '2026-05-10 00:00:00.000', 'OWNED', '2026-05-10 00:00:00.000', NOW(3)),
  ('[STATS] 2026 tester book 3', 'Stats Author', 'Stats Pub', 'STAT-YEAR-0006', 'Stats', NULL, '2026-06-10 00:00:00.000', 'OWNED', '2026-06-10 00:00:00.000', NOW(3)),
  ('[STATS] excluded tester book', 'Stats Author', 'Stats Pub', 'STAT-YEAR-0007', 'Stats', NULL, '2026-07-10 00:00:00.000', 'OWNED', '2026-07-10 00:00:00.000', NOW(3)),
  ('[STATS] reader 2023 book', 'Stats Author', 'Stats Pub', 'STAT-YEAR-0008', 'Stats', NULL, '2023-08-10 00:00:00.000', 'OWNED', '2023-08-10 00:00:00.000', NOW(3)),
  ('[STATS] reader 2026 book 1', 'Stats Author', 'Stats Pub', 'STAT-YEAR-0009', 'Stats', NULL, '2026-09-10 00:00:00.000', 'OWNED', '2026-09-10 00:00:00.000', NOW(3)),
  ('[STATS] reader 2026 book 2', 'Stats Author', 'Stats Pub', 'STAT-YEAR-0010', 'Stats', NULL, '2026-10-10 00:00:00.000', 'OWNED', '2026-10-10 00:00:00.000', NOW(3)),
  ('[STATS] null user book', 'Stats Author', 'Stats Pub', 'STAT-YEAR-0011', 'Stats', NULL, '2026-11-10 00:00:00.000', 'OWNED', '2026-11-10 00:00:00.000', NOW(3)),
  ('[STATS] unfinished tester book', 'Stats Author', 'Stats Pub', 'STAT-YEAR-0012', 'Stats', NULL, '2026-12-10 00:00:00.000', 'OWNED', '2026-12-10 00:00:00.000', NOW(3));

-- Insert reading logs. The stats API uses createdAt.
INSERT INTO reading_logs (
  bookId,
  userName,
  readStatus,
  rating,
  review,
  createdAt,
  updatedAt
) VALUES
  ((SELECT id FROM books WHERE isbn = 'STAT-YEAR-0001'), 'tester@example.com', 'READ', 4.0, 'Tester yearly stats 2024 #1', '2024-01-10 09:00:00.000', NOW(3)),
  ((SELECT id FROM books WHERE isbn = 'STAT-YEAR-0002'), 'tester@example.com', 'READ', 4.5, 'Tester yearly stats 2024 #2', '2024-11-20 09:00:00.000', NOW(3)),
  ((SELECT id FROM books WHERE isbn = 'STAT-YEAR-0003'), 'tester@example.com', 'READ', 5.0, 'Tester yearly stats 2025 #1', '2025-03-15 09:00:00.000', NOW(3)),
  ((SELECT id FROM books WHERE isbn = 'STAT-YEAR-0004'), 'tester@example.com', 'READ', 3.5, 'Tester yearly stats 2026 #1', '2026-04-15 09:00:00.000', NOW(3)),
  ((SELECT id FROM books WHERE isbn = 'STAT-YEAR-0005'), 'tester@example.com', 'READ', 4.0, 'Tester yearly stats 2026 #2', '2026-05-15 09:00:00.000', NOW(3)),
  ((SELECT id FROM books WHERE isbn = 'STAT-YEAR-0006'), 'tester@example.com', 'READ', 4.5, 'Tester yearly stats 2026 #3', '2026-06-15 09:00:00.000', NOW(3)),
  ((SELECT id FROM books WHERE isbn = 'STAT-YEAR-0007'), 'tester@example.com', 'EXCLUDED', NULL, 'Should not count because readStatus is EXCLUDED', '2026-07-15 09:00:00.000', NOW(3)),
  ((SELECT id FROM books WHERE isbn = 'STAT-YEAR-0008'), 'reader@example.com', 'READ', 4.0, 'Reader yearly stats 2023 #1', '2023-08-15 09:00:00.000', NOW(3)),
  ((SELECT id FROM books WHERE isbn = 'STAT-YEAR-0009'), 'reader@example.com', 'READ', 4.5, 'Reader yearly stats 2026 #1', '2026-09-15 09:00:00.000', NOW(3)),
  ((SELECT id FROM books WHERE isbn = 'STAT-YEAR-0010'), 'reader@example.com', 'READ', 5.0, 'Reader yearly stats 2026 #2', '2026-10-15 09:00:00.000', NOW(3)),
  ((SELECT id FROM books WHERE isbn = 'STAT-YEAR-0011'), NULL, 'READ', 3.0, 'Should not count because userName is NULL', '2026-11-15 09:00:00.000', NOW(3)),
  ((SELECT id FROM books WHERE isbn = 'STAT-YEAR-0012'), 'tester@example.com', NULL, NULL, 'Should not count because readStatus is NULL', '2026-12-15 09:00:00.000', NOW(3));

COMMIT;

-- Verification queries for SQL clients.
-- Expected tester@example.com yearly rows:
--   2024 = 2, 2025 = 1, 2026 = 3
SELECT
  userName,
  YEAR(createdAt) AS year,
  COUNT(*) AS count
FROM reading_logs
WHERE userName = 'tester@example.com'
  AND readStatus = 'READ'
GROUP BY userName, YEAR(createdAt)
ORDER BY year;

-- Expected reader@example.com yearly rows:
--   2023 = 1, 2026 = 2
SELECT
  userName,
  YEAR(createdAt) AS year,
  COUNT(*) AS count
FROM reading_logs
WHERE userName = 'reader@example.com'
  AND readStatus = 'READ'
GROUP BY userName, YEAR(createdAt)
ORDER BY year;

-- Expected tester@example.com current-year count in 2026:
--   yearlyDoneCount = 3
SELECT
  COUNT(*) AS yearlyDoneCount
FROM reading_logs
WHERE userName = 'tester@example.com'
  AND readStatus = 'READ'
  AND YEAR(createdAt) = YEAR(CURRENT_DATE());
