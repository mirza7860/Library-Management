-- Insert librarians
INSERT INTO librarians (username, password, email, role)
VALUES
  ('librarian', 'password123', 'librarian@library.edu', 'librarian'),
  ('admin', 'admin_password', 'admin@library.edu', 'admin');

-- Insert borrowers
INSERT INTO borrowers (name, student_or_faculty_id, email, password, phone, department, type)
VALUES
  ('Alice Johnson', 'S12345', 'alice@university.edu', 'student_pass', '123-456-7890', 'Computer Science', 'student'),
  ('Bob Smith', 'S23456', 'bob@university.edu', 'student_pass', '234-567-8901', 'Mathematics', 'student'),
  ('Charlie Brown', 'S34567', 'charlie@university.edu', 'student_pass', '345-678-9012', 'Physics', 'student'),
  ('Dr. Diana Prince', 'F12345', 'diana@university.edu', 'faculty_pass', '456-789-0123', 'Literature', 'faculty'),
  ('Prof. Ethan Hunt', 'F23456', 'ethan@university.edu', 'faculty_pass', '567-890-1234', 'History', 'faculty');

-- Insert books
INSERT INTO books (title, author, isbn, category, description, total_copies, copies_available)
VALUES
  ('Introduction to Algorithms', 'Thomas H. Cormen', '9780262033848', 'Computer Science', 'A comprehensive introduction to the modern study of computer algorithms.', 5, 3),
  ('Design Patterns', 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides', '9780201633610', 'Computer Science', 'Elements of Reusable Object-Oriented Software.', 3, 1),
  ('Clean Code', 'Robert C. Martin', '9780132350884', 'Computer Science', 'A Handbook of Agile Software Craftsmanship.', 4, 0),
  ('The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', 'Fiction', 'A novel about the mysterious millionaire Jay Gatsby.', 10, 7),
  ('To Kill a Mockingbird', 'Harper Lee', '9780061120084', 'Fiction', 'A novel about racial inequality and moral growth.', 8, 5),
  ('The Catcher in the Rye', 'J.D. Salinger', '9780316769488', 'Fiction', 'A novel about teenage angst and alienation.', 6, 4),
  ('1984', 'George Orwell', '9780451524935', 'Fiction', 'A dystopian novel about totalitarianism.', 7, 3),
  ('Pride and Prejudice', 'Jane Austen', '9780141439518', 'Fiction', 'A romantic novel of manners.', 5, 2),
  ('The Hobbit', 'J.R.R. Tolkien', '9780547928227', 'Fantasy', 'A fantasy novel about the journey of Bilbo Baggins.', 4, 1),
  ('Harry Potter and the Philosopher''s Stone', 'J.K. Rowling', '9780747532743', 'Fantasy', 'The first novel in the Harry Potter series.', 10, 5);

-- Insert assignments
INSERT INTO assignments (book_id, borrower_id, assigned_date, due_date, return_date, status)
VALUES
  -- Alice's assignments
  ((SELECT id FROM books WHERE title = 'Introduction to Algorithms'), 
   (SELECT id FROM borrowers WHERE name = 'Alice Johnson'),
   '2023-03-01', '2023-04-01', '2023-03-28', 'returned'),
  
  ((SELECT id FROM books WHERE title = 'Design Patterns'), 
   (SELECT id FROM borrowers WHERE name = 'Alice Johnson'),
   '2023-03-15', '2023-04-15', NULL, 'borrowed'),
  
  -- Bob's assignments
  ((SELECT id FROM books WHERE title = 'Clean Code'), 
   (SELECT id FROM borrowers WHERE name = 'Bob Smith'),
   '2023-02-15', '2023-03-15', NULL, 'overdue'),
  
  -- Charlie's assignments
  ((SELECT id FROM books WHERE title = 'The Great Gatsby'), 
   (SELECT id FROM borrowers WHERE name = 'Charlie Brown'),
   '2023-03-20', '2023-04-20', NULL, 'borrowed'),
  
  -- Diana's assignments
  ((SELECT id FROM books WHERE title = 'To Kill a Mockingbird'), 
   (SELECT id FROM borrowers WHERE name = 'Dr. Diana Prince'),
   '2023-02-01', '2023-03-01', '2023-02-28', 'returned'),
  
  ((SELECT id FROM books WHERE title = 'The Catcher in the Rye'), 
   (SELECT id FROM borrowers WHERE name = 'Dr. Diana Prince'),
   '2023-03-10', '2023-04-10', NULL, 'borrowed'),
  
  ((SELECT id FROM books WHERE title = '1984'), 
   (SELECT id FROM borrowers WHERE name = 'Dr. Diana Prince'),
   '2023-03-15', '2023-04-15', NULL, 'borrowed'),
  
  -- Ethan's assignments
  ((SELECT id FROM books WHERE title = 'Pride and Prejudice'), 
   (SELECT id FROM borrowers WHERE name = 'Prof. Ethan Hunt'),
   '2023-03-05', '2023-04-05', NULL, 'borrowed'),
  
  ((SELECT id FROM books WHERE title = 'The Hobbit'), 
   (SELECT id FROM borrowers WHERE name = 'Prof. Ethan Hunt'),
   '2023-03-10', '2023-04-10', NULL, 'borrowed'),
  
  ((SELECT id FROM books WHERE title = 'Harry Potter and the Philosopher''s Stone'), 
   (SELECT id FROM borrowers WHERE name = 'Prof. Ethan Hunt'),
   '2023-02-20', '2023-03-20', NULL, 'overdue');

