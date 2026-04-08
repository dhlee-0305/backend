-- Temporary test data for books, reading_logs, memos
-- MySQL / Prisma schema

START TRANSACTION;

-- Remove previously inserted test data first
DELETE m
FROM memos m
JOIN books b ON b.id = m.bookId
WHERE b.isbn IN ('TEST-ISBN-0001', 'TEST-ISBN-0002', 'TEST-ISBN-0003', 'TEST-ISBN-0004');

DELETE rl
FROM reading_logs rl
JOIN books b ON b.id = rl.bookId
WHERE b.isbn IN ('TEST-ISBN-0001', 'TEST-ISBN-0002', 'TEST-ISBN-0003', 'TEST-ISBN-0004');

DELETE FROM books
WHERE isbn IN ('TEST-ISBN-0001', 'TEST-ISBN-0002', 'TEST-ISBN-0003', 'TEST-ISBN-0004');

INSERT INTO books (
  title,
  author,
  publisher,
  isbn,
  genre,
  coverUrl,
  purchaseDate,
  status,
  updatedAt
) VALUES
  (
    '[TEST] Clean Code',
    'Robert C. Martin',
    'Insight',
    'TEST-ISBN-0001',
    'Development',
    'https://example.com/test-clean-code.jpg',
    '2026-03-01 10:00:00',
    'OWNED',
    NOW(3)
  ),
  (
    '[TEST] Atomic Habits',
    'James Clear',
    'Business Books',
    'TEST-ISBN-0002',
    'Self Help',
    'https://example.com/test-atomic-habits.jpg',
    '2026-03-15 09:30:00',
    'OWNED',
    NOW(3)
  ),
  (
    '[TEST] Demian',
    'Hermann Hesse',
    'Minumsa',
    'TEST-ISBN-0003',
    'Novel',
    'https://example.com/test-demian.jpg',
    '2026-02-10 14:20:00',
    'OWNED',
    NOW(3)
  ),
  (
    '[TEST] Sapiens',
    'Yuval Noah Harari',
    'Gimmyoung',
    'TEST-ISBN-0004',
    'History',
    'https://example.com/test-sapiens.jpg',
    '2025-12-20 16:45:00',
    'SOLD',
    NOW(3)
  );

INSERT INTO reading_logs (
  bookId,
  userName,
  startDate,
  endDate,
  rating,
  review,
  updatedAt
) VALUES
  (
    (SELECT id FROM books WHERE isbn = 'TEST-ISBN-0001'),
    'tester_kim',
    '2026-03-02 08:00:00',
    '2026-03-10 22:00:00',
    4.5,
    'Useful examples for reviewing practical refactoring points.',
    NOW(3)
  ),
  (
    (SELECT id FROM books WHERE isbn = 'TEST-ISBN-0002'),
    'tester_kim',
    '2026-03-16 07:30:00',
    NULL,
    4.0,
    'Still reading, but the habit design section is especially useful.',
    NOW(3)
  ),
  (
    (SELECT id FROM books WHERE isbn = 'TEST-ISBN-0003'),
    'reader_lee',
    '2026-04-01 21:00:00',
    NULL,
    NULL,
    'Previewing this for next months reading club selection.',
    NOW(3)
  ),
  (
    (SELECT id FROM books WHERE isbn = 'TEST-ISBN-0004'),
    'review_park',
    '2026-01-03 11:00:00',
    '2026-01-15 18:00:00',
    5.0,
    'Added a five star review to help test stats screens.',
    NOW(3)
  );

INSERT INTO memos (
  bookId,
  page,
  content,
  type,
  updatedAt
) VALUES
  (
    (SELECT id FROM books WHERE isbn = 'TEST-ISBN-0001'),
    45,
    'The single responsibility example for functions stood out.',
    'MEMO',
    NOW(3)
  ),
  (
    (SELECT id FROM books WHERE isbn = 'TEST-ISBN-0001'),
    102,
    'Naming that reveals intent reduces maintenance cost.',
    'HIGHLIGHT',
    NOW(3)
  ),
  (
    (SELECT id FROM books WHERE isbn = 'TEST-ISBN-0002'),
    23,
    'Small action units can also apply to API development habits.',
    'MEMO',
    NOW(3)
  ),
  (
    (SELECT id FROM books WHERE isbn = 'TEST-ISBN-0002'),
    77,
    'Good habits should make the reward visible right away.',
    'HIGHLIGHT',
    NOW(3)
  ),
  (
    (SELECT id FROM books WHERE isbn = 'TEST-ISBN-0003'),
    12,
    'The opening mood makes this useful for memo list testing.',
    'MEMO',
    NOW(3)
  ),
  (
    (SELECT id FROM books WHERE isbn = 'TEST-ISBN-0003'),
    88,
    'The search for identity is expressed symbolically.',
    'HIGHLIGHT',
    NOW(3)
  ),
  (
    (SELECT id FROM books WHERE isbn = 'TEST-ISBN-0004'),
    201,
    'Added another memo while revisiting the cognitive revolution section.',
    'MEMO',
    NOW(3)
  ),
  (
    (SELECT id FROM books WHERE isbn = 'TEST-ISBN-0004'),
    315,
    'A sentence that explains a large narrative clearly stood out.',
    'HIGHLIGHT',
    NOW(3)
  );

COMMIT;
