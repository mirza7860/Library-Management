-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create librarians table
CREATE TABLE librarians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- This will store hashed passwords
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'librarian',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create borrowers table
CREATE TABLE borrowers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    student_or_faculty_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Added password field
    phone TEXT,
    department TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('student', 'faculty')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create books table
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    total_copies INTEGER NOT NULL DEFAULT 1,
    copies_available INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT copies_available_check CHECK (copies_available <= total_copies),
    CONSTRAINT positive_copies CHECK (total_copies >= 0 AND copies_available >= 0)
);

-- Create assignments table
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status TEXT NOT NULL CHECK (status IN ('borrowed', 'returned', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (due_date >= assigned_date),
    CONSTRAINT valid_return_date CHECK (return_date IS NULL OR return_date >= assigned_date)
);

-- Create indexes for frequently queried fields
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_borrowers_name ON borrowers(name);
CREATE INDEX idx_borrowers_student_id ON borrowers(student_or_faculty_id);
CREATE INDEX idx_borrowers_email ON borrowers(email);
CREATE INDEX idx_borrowers_department ON borrowers(department);
CREATE INDEX idx_borrowers_type ON borrowers(type);
CREATE INDEX idx_assignments_book_id ON assignments(book_id);
CREATE INDEX idx_assignments_borrower_id ON assignments(borrower_id);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);

-- Function to update book availability
CREATE OR REPLACE FUNCTION update_book_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'borrowed') THEN
        UPDATE books SET copies_available = copies_available - 1 WHERE id = NEW.book_id AND copies_available > 0;
        IF NOT FOUND THEN RAISE EXCEPTION 'No available copies of this book'; END IF;
    ELSIF (TG_OP = 'UPDATE' AND OLD.status != 'returned' AND NEW.status = 'returned') THEN
        UPDATE books SET copies_available = copies_available + 1 WHERE id = NEW.book_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.status != 'returned') THEN
        UPDATE books SET copies_available = copies_available + 1 WHERE id = OLD.book_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for book availability
CREATE TRIGGER assignment_insert_trigger AFTER INSERT ON assignments FOR EACH ROW EXECUTE FUNCTION update_book_availability();
CREATE TRIGGER assignment_update_trigger AFTER UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_book_availability();
CREATE TRIGGER assignment_delete_trigger AFTER DELETE ON assignments FOR EACH ROW EXECUTE FUNCTION update_book_availability();

-- Function to update overdue status
CREATE OR REPLACE FUNCTION update_overdue_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE assignments SET status = 'overdue' WHERE status = 'borrowed' AND due_date < CURRENT_DATE;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to create overdue check job
CREATE OR REPLACE FUNCTION create_overdue_check_job()
RETURNS void AS $$
BEGIN
    PERFORM cron.schedule('daily-overdue-check', '0 0 * * *', 'SELECT update_overdue_status()');
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE librarians ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "public_auth_librarians" ON "librarians" FOR SELECT USING (true);
CREATE POLICY "public_auth_borrowers" ON "borrowers" FOR SELECT USING (true);

CREATE POLICY "librarian_read_all" ON "librarians" FOR SELECT USING (true);
CREATE POLICY "librarian_insert" ON "librarians" FOR INSERT WITH CHECK (true);
CREATE POLICY "librarian_update" ON "librarians" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "librarian_delete" ON "librarians" FOR DELETE USING (true);

CREATE POLICY "librarian_read_borrowers" ON "borrowers" FOR SELECT USING (true);
CREATE POLICY "librarian_insert_borrowers" ON "borrowers" FOR INSERT WITH CHECK (true);
CREATE POLICY "librarian_update_borrowers" ON "borrowers" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "librarian_delete_borrowers" ON "borrowers" FOR DELETE USING (true);
CREATE POLICY "borrower_read_own_data" ON "borrowers" FOR SELECT USING (true);

CREATE POLICY "librarian_read_books" ON "books" FOR SELECT USING (true);
CREATE POLICY "librarian_insert_books" ON "books" FOR INSERT WITH CHECK (true);
CREATE POLICY "librarian_update_books" ON "books" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "librarian_delete_books" ON "books" FOR DELETE USING (true);
CREATE POLICY "public_read_books" ON "books" FOR SELECT USING (true);

CREATE POLICY "librarian_read_assignments" ON "assignments" FOR SELECT USING (true);
CREATE POLICY "librarian_insert_assignments" ON "assignments" FOR INSERT WITH CHECK (true);
CREATE POLICY "librarian_update_assignments" ON "assignments" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "librarian_delete_assignments" ON "assignments" FOR DELETE USING (true);
CREATE POLICY "borrower_read_own_assignments" ON "assignments" FOR SELECT USING (true);
