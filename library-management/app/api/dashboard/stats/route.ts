import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Get total books count
    const { count: totalBooks, error: booksError } = await supabase
      .from("books")
      .select("*", { count: "exact", head: true })

    if (booksError) {
      console.error("Error fetching books count:", booksError)
      return NextResponse.json({ error: "Failed to fetch books count" }, { status: 500 })
    }

    // Get borrowed books count
    const { count: borrowedBooks, error: borrowedError } = await supabase
      .from("assignments")
      .select("*", { count: "exact", head: true })
      .in("status", ["borrowed", "overdue"])

    if (borrowedError) {
      console.error("Error fetching borrowed books count:", borrowedError)
      return NextResponse.json({ error: "Failed to fetch borrowed books count" }, { status: 500 })
    }

    // Get overdue books count
    const { count: overdueBooks, error: overdueError } = await supabase
      .from("assignments")
      .select("*", { count: "exact", head: true })
      .eq("status", "overdue")

    if (overdueError) {
      console.error("Error fetching overdue books count:", overdueError)
      return NextResponse.json({ error: "Failed to fetch overdue books count" }, { status: 500 })
    }

    // Get active borrowers count
    const { data: activeBorrowers, error: borrowersError } = await supabase
      .from("assignments")
      .select("borrower_id")
      .in("status", ["borrowed", "overdue"])

    if (borrowersError) {
      console.error("Error fetching active borrowers:", borrowersError)
      return NextResponse.json({ error: "Failed to fetch active borrowers" }, { status: 500 })
    }

    // Count unique borrowers
    const uniqueBorrowers = new Set(activeBorrowers.map((item) => item.borrower_id)).size

    // Get recent activities
    const { data: recentActivities, error: activitiesError } = await supabase
      .from("assignments")
      .select(`
        id,
        assigned_date,
        return_date,
        status,
        books:book_id (title),
        borrowers:borrower_id (name)
      `)
      .order("created_at", { ascending: false })
      .limit(5)

    if (activitiesError) {
      console.error("Error fetching recent activities:", activitiesError)
      return NextResponse.json({ error: "Failed to fetch recent activities" }, { status: 500 })
    }

    // Get overdue alerts
    const { data: overdueAlerts, error: alertsError } = await supabase
      .from("assignments")
      .select(`
        id,
        due_date,
        books:book_id (title),
        borrowers:borrower_id (name)
      `)
      .eq("status", "overdue")
      .order("due_date", { ascending: true })
      .limit(5)

    if (alertsError) {
      console.error("Error fetching overdue alerts:", alertsError)
      return NextResponse.json({ error: "Failed to fetch overdue alerts" }, { status: 500 })
    }

    // Format the activities data
    const formattedActivities = recentActivities.map((item) => ({
      id: item.id,
      action: item.return_date ? "Book Returned" : "Book Borrowed",
      book: item.books.title,
      borrower: item.borrowers.name,
      date: item.return_date || item.assigned_date,
      status: item.status,
    }))

    // Format the alerts data
    const formattedAlerts = overdueAlerts.map((item) => {
      const dueDate = new Date(item.due_date)
      const today = new Date()
      const diffTime = Math.abs(today.getTime() - dueDate.getTime())
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return {
        id: item.id,
        book: item.books.title,
        borrower: item.borrowers.name,
        dueDate: item.due_date,
        daysOverdue,
      }
    })

    return NextResponse.json({
      stats: {
        totalBooks,
        borrowedBooks,
        overdueBooks,
        activeBorrowers: uniqueBorrowers,
      },
      recentActivities: formattedActivities,
      overdueAlerts: formattedAlerts,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

