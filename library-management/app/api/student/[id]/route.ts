import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Get student information
    const { data: student, error: studentError } = await supabase
      .from("borrowers")
      .select("*")
      .eq("student_or_faculty_id", id)
      .single()

    if (studentError) {
      console.error("Error fetching student:", studentError)
      return NextResponse.json({ error: "Failed to fetch student data" }, { status: 500 })
    }

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Get borrowing history
    const { data: history, error: historyError } = await supabase
      .from("assignments")
      .select(`
        id,
        assigned_date,
        due_date,
        return_date,
        status,
        books:book_id (
          id,
          title,
          author,
          category
        )
      `)
      .eq("borrower_id", student.id)
      .order("assigned_date", { ascending: false })

    if (historyError) {
      console.error("Error fetching borrowing history:", historyError)
      return NextResponse.json({ error: "Failed to fetch borrowing history" }, { status: 500 })
    }

    // Calculate statistics
    const totalBooks = history.length
    const currentlyBorrowed = history.filter((item) => item.status === "borrowed" || item.status === "overdue").length
    const overdue = history.filter((item) => item.status === "overdue").length

    // Format the history data
    const formattedHistory = history.map((item) => ({
      id: item.id,
      bookTitle: item.books.title,
      author: item.books.author,
      category: item.books.category,
      assignedDate: item.assigned_date,
      dueDate: item.due_date,
      returnDate: item.return_date,
      status: item.status,
    }))

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        studentId: student.student_or_faculty_id,
        email: student.email,
        phone: student.phone,
        department: student.department,
        type: student.type,
      },
      statistics: {
        totalBooks,
        currentlyBorrowed,
        overdue,
      },
      borrowingHistory: formattedHistory,
    })
  } catch (error) {
    console.error("Error fetching student data:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

