"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Clock, AlertTriangle, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export default function StudentDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [borrowedBooks, setBorrowedBooks] = useState([])
  const [studentInfo, setStudentInfo] = useState(null)

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user) return

      try {
        // Fetch the borrower details using the student ID
        const { data: borrower, error: borrowerError } = await supabase
          .from("borrowers")
          .select("*")
          .eq("student_or_faculty_id", user.username)
          .single()

        if (borrowerError) throw borrowerError

        setStudentInfo(borrower)

        // Get current borrowed books
        const { data, error } = await supabase
          .from("assignments")
          .select(`
            id,
            assigned_date,
            due_date,
            status,
            books:book_id (
              id,
              title,
              author,
              category
            )
          `)
          .eq("borrower_id", borrower.id)
          .in("status", ["borrowed", "overdue"])
          .order("due_date", { ascending: true })

        if (error) throw error

        // Format the data
        const formattedBooks = data.map((item) => ({
          id: item.id,
          bookTitle: item.books.title,
          author: item.books.author,
          category: item.books.category,
          assignedDate: item.assigned_date,
          dueDate: item.due_date,
          status: item.status,
          daysLeft: calculateDaysLeft(item.due_date),
        }))

        setBorrowedBooks(formattedBooks)
      } catch (err) {
        console.error("Error fetching student data:", err)
        toast({
          title: "Error",
          description: "Failed to load your books. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStudentData()
  }, [user, toast])

  // Calculate days left until due date
  const calculateDaysLeft = (dueDate) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="ml-2">Loading your books...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Books</h1>
          <p className="text-slate-500">View your currently borrowed books and due dates</p>
        </div>

        {/* Currently Borrowed Books */}
        <Card>
          <CardHeader>
            <CardTitle>Currently Borrowed Books</CardTitle>
            <CardDescription>Books you need to return to the library</CardDescription>
          </CardHeader>
          <CardContent>
            {borrowedBooks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">You don't have any borrowed books at the moment.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book Title</TableHead>
                      <TableHead className="hidden md:table-cell">Author</TableHead>
                      <TableHead className="hidden lg:table-cell">Category</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {borrowedBooks.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell className="font-medium">{book.bookTitle}</TableCell>
                        <TableCell className="hidden md:table-cell">{book.author}</TableCell>
                        <TableCell className="hidden lg:table-cell">{book.category}</TableCell>
                        <TableCell>{book.dueDate}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {book.status === "overdue" ? (
                              <>
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
                                  Overdue
                                </Badge>
                              </>
                            ) : book.daysLeft <= 3 ? (
                              <>
                                <Clock className="h-4 w-4 text-amber-600" />
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                                  Due soon ({book.daysLeft} days)
                                </Badge>
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 text-blue-600" />
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                                  {book.daysLeft} days left
                                </Badge>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Information */}
        <Card>
          <CardHeader>
            <CardTitle>Library Information</CardTitle>
            <CardDescription>Important information about your library account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {studentInfo && (
              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium mb-2">Your Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Name:</span> {studentInfo.name}
                  </div>
                  <div>
                    <span className="text-slate-500">ID:</span> {studentInfo.student_or_faculty_id}
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span> {studentInfo.email}
                  </div>
                  <div>
                    <span className="text-slate-500">Department:</span> {studentInfo.department}
                  </div>
                </div>
              </div>
            )}
            <div>
              <h3 className="font-medium">Library Hours</h3>
              <p className="text-sm text-slate-500">Monday - Friday: 8:00 AM - 8:00 PM</p>
              <p className="text-sm text-slate-500">Saturday: 10:00 AM - 6:00 PM</p>
              <p className="text-sm text-slate-500">Sunday: Closed</p>
            </div>
            <div>
              <h3 className="font-medium">Late Return Policy</h3>
              <p className="text-sm text-slate-500">
                Books returned after the due date will incur a fine of $0.50 per day.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Contact</h3>
              <p className="text-sm text-slate-500">Email: library@university.edu</p>
              <p className="text-sm text-slate-500">Phone: (123) 456-7890</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

