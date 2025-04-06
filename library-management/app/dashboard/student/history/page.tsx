"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, CheckCircle, AlertTriangle, Search, Filter, Loader2 } from "lucide-react"
// import { useState } from "react" // Removed duplicate useState import
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export default function BorrowingHistory() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [borrowingHistory, setBorrowingHistory] = useState([])

  // Client-side state for filtering
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")

  useEffect(() => {
    const fetchBorrowingHistory = async () => {
      if (!user) return

      try {
        // Fetch the borrower ID using the student ID
        const { data: borrower, error: borrowerError } = await supabase
          .from("borrowers")
          .select("id")
          .eq("student_or_faculty_id", user.username)
          .single()

        if (borrowerError) throw borrowerError

        // Fetch borrowing history
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
          .eq("borrower_id", borrower.id)
          .order("assigned_date", { ascending: false })

        if (historyError) throw historyError

        // Format the data
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

        setBorrowingHistory(formattedHistory)
      } catch (error) {
        console.error("Error fetching borrowing history:", error)
        toast({
          title: "Error",
          description: "Failed to load your borrowing history. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBorrowingHistory()
  }, [user, toast])

  // Filter borrowing history based on search term and status
  const filteredHistory = borrowingHistory.filter((record) => {
    const matchesSearch =
      record.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.category.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "All" || record.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="ml-2">Loading your borrowing history...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Borrowing History</h1>
          <p className="text-slate-500">View all your past and current book borrowings</p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by title, author, or category..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="borrowed">Borrowed</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Borrowing History */}
        <Card>
          <CardHeader>
            <CardTitle>Your Borrowing History</CardTitle>
            <CardDescription>All books you've borrowed from the library</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Borrowed Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No borrowing history found. Try adjusting your search or filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.bookTitle}</TableCell>
                      <TableCell>{record.author}</TableCell>
                      <TableCell>{record.category}</TableCell>
                      <TableCell>{record.assignedDate}</TableCell>
                      <TableCell>{record.dueDate}</TableCell>
                      <TableCell>{record.returnDate || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record.status === "returned" ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                                Returned
                              </Badge>
                            </>
                          ) : record.status === "borrowed" ? (
                            <>
                              <Clock className="h-4 w-4 text-blue-600" />
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                                Borrowed
                              </Badge>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
                                Overdue
                              </Badge>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

