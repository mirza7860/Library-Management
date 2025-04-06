import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const bookTitle = searchParams.get("bookTitle")
    const borrowerName = searchParams.get("borrowerName")
    const status = searchParams.get("status")

    let query = supabase.from("assignments").select(`
        *,
        books:book_id (
          id,
          title,
          author
        ),
        borrowers:borrower_id (
          id,
          name,
          type
        )
      `)

    if (bookTitle) {
      query = query.textSearch("books.title", bookTitle)
    }

    if (borrowerName) {
      query = query.textSearch("borrowers.name", borrowerName)
    }

    if (status && status !== "All") {
      query = query.eq("status", status.toLowerCase())
    }

    const { data, error } = await query.order("assigned_date", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the data to a more usable format
    const formattedData = data.map((item) => ({
      id: item.id,
      bookId: item.book_id,
      bookTitle: item.books.title,
      borrowerId: item.borrower_id,
      borrowerName: item.borrowers.name,
      borrowerType: item.borrowers.type,
      assignedDate: item.assigned_date,
      dueDate: item.due_date,
      returnDate: item.return_date,
      status: item.status,
    }))

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { book_id, borrower_id, due_date } = body
    if (!book_id || !borrower_id || !due_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if book is available
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("copies_available")
      .eq("id", book_id)
      .single()

    if (bookError) {
      return NextResponse.json({ error: bookError.message }, { status: 500 })
    }

    if (!book || book.copies_available <= 0) {
      return NextResponse.json({ error: "Book is not available" }, { status: 400 })
    }

    // Create the assignment
    const { data, error } = await supabase
      .from("assignments")
      .insert([
        {
          ...body,
          status: "borrowed",
          assigned_date: new Date().toISOString().split("T")[0],
        },
      ])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating assignment:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

