export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      librarians: {
        Row: {
          id: string
          username: string
          password: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          username: string
          password: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          password?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      borrowers: {
        Row: {
          id: string
          name: string
          student_or_faculty_id: string
          email: string
          phone: string | null
          department: string
          type: "student" | "faculty"
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          student_or_faculty_id: string
          email: string
          phone?: string | null
          department: string
          type: "student" | "faculty"
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          student_or_faculty_id?: string
          email?: string
          phone?: string | null
          department?: string
          type?: "student" | "faculty"
          created_at?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          id: string
          title: string
          author: string
          isbn: string
          category: string
          description: string | null
          total_copies: number
          copies_available: number
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          author: string
          isbn: string
          category: string
          description?: string | null
          total_copies?: number
          copies_available?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          author?: string
          isbn?: string
          category?: string
          description?: string | null
          total_copies?: number
          copies_available?: number
          created_at?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          id: string
          book_id: string
          borrower_id: string
          assigned_date: string
          due_date: string
          return_date: string | null
          status: "borrowed" | "returned" | "overdue"
          created_at: string
        }
        Insert: {
          id?: string
          book_id: string
          borrower_id: string
          assigned_date?: string
          due_date: string
          return_date?: string | null
          status: "borrowed" | "returned" | "overdue"
          created_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          borrower_id?: string
          assigned_date?: string
          due_date?: string
          return_date?: string | null
          status?: "borrowed" | "returned" | "overdue"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_book_id_fkey"
            columns: ["book_id"]
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_borrower_id_fkey"
            columns: ["borrower_id"]
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

