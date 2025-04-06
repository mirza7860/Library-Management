"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  Filter,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function BookAssignments() {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [newAssignment, setNewAssignment] = useState({
    bookId: "",
    borrowerId: "",
    assignedDate: new Date().toISOString().split("T")[0],
    dueDate: addDays(new Date(), 15).toISOString().split("T")[0], // Default 15 days
  });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assignments
        const { data: assignmentsData, error: assignmentsError } =
          await supabase
            .from("assignments")
            .select(
              `
            id,
            book_id,
            borrower_id,
            assigned_date,
            due_date,
            return_date,
            status,
            books:book_id (
              id,
              title
            ),
            borrowers:borrower_id (
              id,
              name,
              type
            )
          `
            )
            .order("assigned_date", { ascending: false });

        if (assignmentsError) throw assignmentsError;

        // Format assignments data
        const formattedAssignments = assignmentsData.map((item) => ({
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
        }));

        setAssignments(formattedAssignments);

        // Fetch available books
        const { data: booksData, error: booksError } = await supabase
          .from("books")
          .select("id, title, copies_available")
          .gt("copies_available", 0);

        if (booksError) throw booksError;
        setBooks(booksData);

        // Fetch borrowers
        const { data: borrowersData, error: borrowersError } = await supabase
          .from("borrowers")
          .select("id, name, type");

        if (borrowersError) throw borrowersError;
        setBorrowers(borrowersData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Filter assignments based on search term and status
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      assignment.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.borrowerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      assignment.status === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Handle assigning a new book
  const handleAssignBook = async () => {
    if (!newAssignment.bookId || !newAssignment.borrowerId) {
      toast({
        title: "Missing Information",
        description: "Please select both a book and a borrower.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Calculate due date (15 days from assigned date)
      const assignedDate = new Date(newAssignment.assignedDate);
      const dueDate = addDays(assignedDate, 15).toISOString().split("T")[0];

      // Create the assignment
      const { data, error } = await supabase
        .from("assignments")
        .insert([
          {
            book_id: newAssignment.bookId,
            borrower_id: newAssignment.borrowerId,
            assigned_date: newAssignment.assignedDate,
            due_date: dueDate,
            status: "borrowed",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Get book and borrower details
      const { data: book } = await supabase
        .from("books")
        .select("title")
        .eq("id", newAssignment.bookId)
        .single();

      const { data: borrower } = await supabase
        .from("borrowers")
        .select("name, type")
        .eq("id", newAssignment.borrowerId)
        .single();

      // Add the new assignment to the state
      const newAssignmentData = {
        id: data.id,
        bookId: data.book_id,
        bookTitle: book.title,
        borrowerId: data.borrower_id,
        borrowerName: borrower.name,
        borrowerType: borrower.type,
        assignedDate: data.assigned_date,
        dueDate: data.due_date,
        returnDate: null,
        status: data.status,
      };

      setAssignments([newAssignmentData, ...assignments]);

      // Update available books
      setBooks(
        books
          .map((book) =>
            book.id === newAssignment.bookId
              ? { ...book, copies_available: book.copies_available - 1 }
              : book
          )
          .filter((book) => book.copies_available > 0)
      );

      toast({
        title: "Success",
        description: "Book assigned successfully.",
      });

      // Reset form
      setNewAssignment({
        bookId: "",
        borrowerId: "",
        assignedDate: new Date().toISOString().split("T")[0],
        dueDate: addDays(new Date(), 15).toISOString().split("T")[0],
      });
      setIsAssignDialogOpen(false);
    } catch (error) {
      console.error("Error assigning book:", error);
      toast({
        title: "Error",
        description: "Failed to assign book. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle returning a book
  const handleReturnBook = async () => {
    if (!currentAssignment) return;

    setSubmitting(true);

    try {
      const today = new Date().toISOString().split("T")[0];

      // Update the assignment in the database
      const { error } = await supabase
        .from("assignments")
        .update({
          return_date: today,
          status: "returned",
        })
        .eq("id", currentAssignment.id);

      if (error) throw error;

      // Update the assignment in the state
      setAssignments(
        assignments.map((assignment) =>
          assignment.id === currentAssignment.id
            ? { ...assignment, returnDate: today, status: "returned" }
            : assignment
        )
      );

      // Update available books
      const { data: book } = await supabase
        .from("books")
        .select("id, copies_available")
        .eq("id", currentAssignment.bookId)
        .single();

      if (book) {
        // Check if the book is already in the list
        const bookExists = books.some((b) => b.id === book.id);

        if (bookExists) {
          setBooks(
            books.map((b) =>
              b.id === book.id
                ? { ...b, copies_available: b.copies_available + 1 }
                : b
            )
          );
        } else {
          // Fetch the book title and add it to the list
          const { data: bookDetails } = await supabase
            .from("books")
            .select("id, title, copies_available")
            .eq("id", currentAssignment.bookId)
            .single();

          if (bookDetails) {
            setBooks([...books, bookDetails]);
          }
        }
      }

      toast({
        title: "Success",
        description: "Book returned successfully.",
      });

      setIsReturnDialogOpen(false);
    } catch (error) {
      console.error("Error returning book:", error);
      toast({
        title: "Error",
        description: "Failed to return book. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Update due date when assigned date changes
  const handleAssignedDateChange = (date: Date | undefined) => {
    if (!date) return;

    const assignedDate = date.toISOString().split("T")[0];
    const dueDate = addDays(date, 15).toISOString().split("T")[0];

    setNewAssignment({
      ...newAssignment,
      assignedDate,
      dueDate,
    });
  };

  if (loading) {
    return (
      <DashboardLayout role="librarian">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="ml-2">Loading assignments...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="librarian">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Book Assignments
            </h1>
            <p className="text-slate-500">
              Manage book assignments and returns
            </p>
          </div>
          <Dialog
            open={isAssignDialogOpen}
            onOpenChange={setIsAssignDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Assign Book
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Assign Book to Borrower</DialogTitle>
                <DialogDescription>
                  Select a book and borrower to create a new assignment.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="book">Book</Label>
                  <Select
                    value={newAssignment.bookId}
                    onValueChange={(value) =>
                      setNewAssignment({ ...newAssignment, bookId: value })
                    }
                  >
                    <SelectTrigger id="book">
                      <SelectValue placeholder="Select a book" />
                    </SelectTrigger>
                    <SelectContent>
                      {books.length === 0 ? (
                        <SelectItem value="no-books" disabled>
                          No available books
                        </SelectItem>
                      ) : (
                        books.map((book) => (
                          <SelectItem key={book.id} value={book.id}>
                            {book.title} ({book.copies_available} available)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="borrower">Borrower</Label>
                  <Select
                    value={newAssignment.borrowerId}
                    onValueChange={(value) =>
                      setNewAssignment({ ...newAssignment, borrowerId: value })
                    }
                  >
                    <SelectTrigger id="borrower">
                      <SelectValue placeholder="Select a borrower" />
                    </SelectTrigger>
                    <SelectContent>
                      {borrowers.length === 0 ? (
                        <SelectItem value="no-borrowers" disabled>
                          No borrowers found
                        </SelectItem>
                      ) : (
                        borrowers.map((borrower) => (
                          <SelectItem key={borrower.id} value={borrower.id}>
                            {borrower.name} ({borrower.type})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedDate">Assigned Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newAssignment.assignedDate && "text-muted-foreground"
                        )}
                      >
                        {newAssignment.assignedDate ? (
                          format(new Date(newAssignment.assignedDate), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={new Date(newAssignment.assignedDate)}
                        onSelect={handleAssignedDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-slate-500">
                    Due date will be set to 15 days from assigned date
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date (Auto-calculated)</Label>
                  <Input
                    id="dueDate"
                    value={format(new Date(newAssignment.dueDate), "PPP")}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAssignDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleAssignBook} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    "Assign Book"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by book title or borrower name..."
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
                <SelectItem value="Borrowed">Borrowed</SelectItem>
                <SelectItem value="Returned">Returned</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Assignments Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Assigned Date
                  </TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Return Date
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-slate-500"
                    >
                      No assignments found. Try adjusting your search or
                      filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.bookTitle}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{assignment.borrowerName}</span>
                          <span className="text-xs text-slate-500">
                            {assignment.borrowerType}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {assignment.assignedDate}
                      </TableCell>
                      <TableCell>{assignment.dueDate}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {assignment.returnDate || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            assignment.status === "returned"
                              ? "bg-green-50 text-green-700 hover:bg-green-50"
                              : assignment.status === "borrowed"
                              ? "bg-blue-50 text-blue-700 hover:bg-blue-50"
                              : "bg-red-50 text-red-700 hover:bg-red-50"
                          }
                        >
                          {assignment.status === "returned"
                            ? "Returned"
                            : assignment.status === "borrowed"
                            ? "Borrowed"
                            : "Overdue"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.status !== "returned" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setCurrentAssignment(assignment);
                                  setIsReturnDialogOpen(true);
                                }}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Returned
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Return Book Dialog */}
        <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Return Book</DialogTitle>
              <DialogDescription>
                Are you sure you want to mark this book as returned?
              </DialogDescription>
            </DialogHeader>
            {currentAssignment && (
              <div className="py-4">
                <div className="space-y-1">
                  <p className="font-medium">{currentAssignment.bookTitle}</p>
                  <p className="text-sm text-slate-500">
                    Borrowed by: {currentAssignment.borrowerName}
                  </p>
                  <p className="text-sm text-slate-500">
                    Due date: {currentAssignment.dueDate}
                  </p>
                  {new Date(currentAssignment.dueDate) < new Date() && (
                    <div className="flex items-center gap-2 text-amber-600 mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        This book is overdue
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsReturnDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleReturnBook} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Return"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// "use client"

// import { useState, useEffect } from "react"
// import { DashboardLayout } from "@/components/layout/dashboard-layout"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// import { Plus, Search, MoreVertical, Filter, CheckCircle, AlertTriangle, Loader2 } from "lucide-react"
// import { Badge } from "@/components/ui/badge"
// import { Calendar } from "@/components/ui/calendar"
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
// import { format, addDays, parseISO, isAfter } from "date-fns"
// import { cn } from "@/lib/utils"
// import { supabase } from "@/lib/supabase"
// import { useToast } from "@/hooks/use-toast"

// export default function BookAssignments() {
//   const { toast } = useToast()
//   const [assignments, setAssignments] = useState<any[]>([])
//   const [books, setBooks] = useState<any[]>([])
//   const [borrowers, setBorrowers] = useState<any[]>([])
//   const [searchTerm, setSearchTerm] = useState("")
//   const [statusFilter, setStatusFilter] = useState("All")
//   const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
//   const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
//   const [currentAssignment, setCurrentAssignment] = useState<any>(null)
//   const [loading, setLoading] = useState(true)
//   const [submitting, setSubmitting] = useState(false)

//   const [newAssignment, setNewAssignment] = useState({
//     bookId: "",
//     borrowerId: "",
//     assignedDate: new Date().toISOString().split("T")[0],
//     dueDate: addDays(new Date(), 15).toISOString().split("T")[0], // Default 15 days
//   })

//   // Helper function to determine if an assignment is overdue
//   const checkIfOverdue = (dueDate, returnDate, status) => {
//     if (status === "returned" || returnDate) return false
//     return isAfter(new Date(), parseISO(dueDate))
//   }

//   // Process assignments to update status if overdue
//   const processAssignmentStatus = (assignment) => {
//     const isOverdue = checkIfOverdue(assignment.dueDate, assignment.returnDate, assignment.status)
//     return {
//       ...assignment,
//       status: isOverdue ? "overdue" : assignment.status
//     }
//   }

//   // Fetch data on component mount
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         // Fetch assignments
//         const { data: assignmentsData, error: assignmentsError } = await supabase
//           .from("assignments")
//           .select(`
//             id,
//             book_id,
//             borrower_id,
//             assigned_date,
//             due_date,
//             return_date,
//             status,
//             books:book_id (
//               id,
//               title
//             ),
//             borrowers:borrower_id (
//               id,
//               name,
//               type
//             )
//           `)
//           .order("assigned_date", { ascending: false })

//         if (assignmentsError) throw assignmentsError

//         // Format assignments data and check for overdue items
//         const formattedAssignments = assignmentsData.map((item) => {
//           const assignment = {
//             id: item.id,
//             bookId: item.book_id,
//             bookTitle: item.books.title,
//             borrowerId: item.borrower_id,
//             borrowerName: item.borrowers.name,
//             borrowerType: item.borrowers.type,
//             assignedDate: item.assigned_date,
//             dueDate: item.due_date,
//             returnDate: item.return_date,
//             status: item.status,
//           }

//           // Check if overdue
//           return processAssignmentStatus(assignment)
//         })

//         setAssignments(formattedAssignments)

//         // Fetch available books
//         const { data: booksData, error: booksError } = await supabase
//           .from("books")
//           .select("id, title, copies_available")
//           .gt("copies_available", 0)

//         if (booksError) throw booksError
//         setBooks(booksData)

//         // Fetch borrowers
//         const { data: borrowersData, error: borrowersError } = await supabase.from("borrowers").select("id, name, type")

//         if (borrowersError) throw borrowersError
//         setBorrowers(borrowersData)
//       } catch (error) {
//         console.error("Error fetching data:", error)
//         toast({
//           title: "Error",
//           description: "Failed to load data. Please try again.",
//           variant: "destructive",
//         })
//       } finally {
//         setLoading(false)
//       }
//     }

//     fetchData()

//   }, [toast])

//   // Filter assignments based on search term and status
//   const filteredAssignments = assignments.filter((assignment) => {
//     const matchesSearch =
//       assignment.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       assignment.borrowerName.toLowerCase().includes(searchTerm.toLowerCase())

//     const matchesStatus = statusFilter === "All" || assignment.status === statusFilter.toLowerCase()

//     return matchesSearch && matchesStatus
//   })

//   // Handle assigning a new book
//   const handleAssignBook = async () => {
//     if (!newAssignment.bookId || !newAssignment.borrowerId) {
//       toast({
//         title: "Missing Information",
//         description: "Please select both a book and a borrower.",
//         variant: "destructive",
//       })
//       return
//     }

//     setSubmitting(true)

//     try {
//       // Calculate due date (15 days from assigned date)
//       const assignedDate = new Date(newAssignment.assignedDate)
//       const dueDate = addDays(assignedDate, 15).toISOString().split("T")[0]

//       // Create the assignment
//       const { data, error } = await supabase
//         .from("assignments")
//         .insert([
//           {
//             book_id: newAssignment.bookId,
//             borrower_id: newAssignment.borrowerId,
//             assigned_date: newAssignment.assignedDate,
//             due_date: dueDate,
//             status: "borrowed",
//           },
//         ])
//         .select()
//         .single()

//       if (error) throw error

//       // Get book and borrower details
//       const { data: book } = await supabase.from("books").select("title").eq("id", newAssignment.bookId).single()

//       const { data: borrower } = await supabase
//         .from("borrowers")
//         .select("name, type")
//         .eq("id", newAssignment.borrowerId)
//         .single()

//       // Add the new assignment to the state
//       const newAssignmentData = {
//         id: data.id,
//         bookId: data.book_id,
//         bookTitle: book.title,
//         borrowerId: data.borrower_id,
//         borrowerName: borrower.name,
//         borrowerType: borrower.type,
//         assignedDate: data.assigned_date,
//         dueDate: data.due_date,
//         returnDate: null,
//         status: data.status,
//       }

//       // Check if the new assignment is already overdue (unlikely but possible)
//       const processedAssignment = processAssignmentStatus(newAssignmentData)

//       setAssignments([processedAssignment, ...assignments])

//       // Update available books
//       setBooks(
//         books
//           .map((book) =>
//             book.id === newAssignment.bookId ? { ...book, copies_available: book.copies_available - 1 } : book,
//           )
//           .filter((book) => book.copies_available > 0),
//       )

//       toast({
//         title: "Success",
//         description: "Book assigned successfully.",
//       })

//       // Reset form
//       setNewAssignment({
//         bookId: "",
//         borrowerId: "",
//         assignedDate: new Date().toISOString().split("T")[0],
//         dueDate: addDays(new Date(), 15).toISOString().split("T")[0],
//       })
//       setIsAssignDialogOpen(false)
//     } catch (error) {
//       console.error("Error assigning book:", error)
//       toast({
//         title: "Error",
//         description: "Failed to assign book. Please try again.",
//         variant: "destructive",
//       })
//     } finally {
//       setSubmitting(false)
//     }
//   }

//   // Handle returning a book
//   const handleReturnBook = async () => {
//     if (!currentAssignment) return

//     setSubmitting(true)

//     try {
//       const today = new Date().toISOString().split("T")[0]

//       // Update the assignment in the database
//       const { error } = await supabase
//         .from("assignments")
//         .update({
//           return_date: today,
//           status: "returned",
//         })
//         .eq("id", currentAssignment.id)

//       if (error) throw error

//       // Update the assignment in the state
//       setAssignments(
//         assignments.map((assignment) =>
//           assignment.id === currentAssignment.id
//             ? { ...assignment, returnDate: today, status: "returned" }
//             : assignment,
//         ),
//       )

//       // Update available books
//       const { data: book } = await supabase
//         .from("books")
//         .select("id, copies_available")
//         .eq("id", currentAssignment.bookId)
//         .single()

//       if (book) {
//         // Check if the book is already in the list
//         const bookExists = books.some((b) => b.id === book.id)

//         if (bookExists) {
//           setBooks(books.map((b) => (b.id === book.id ? { ...b, copies_available: b.copies_available + 1 } : b)))
//         } else {
//           // Fetch the book title and add it to the list
//           const { data: bookDetails } = await supabase
//             .from("books")
//             .select("id, title, copies_available")
//             .eq("id", currentAssignment.bookId)
//             .single()

//           if (bookDetails) {
//             setBooks([...books, bookDetails])
//           }
//         }
//       }

//       toast({
//         title: "Success",
//         description: "Book returned successfully.",
//       })

//       setIsReturnDialogOpen(false)
//     } catch (error) {
//       console.error("Error returning book:", error)
//       toast({
//         title: "Error",
//         description: "Failed to return book. Please try again.",
//         variant: "destructive",
//       })
//     } finally {
//       setSubmitting(false)
//     }
//   }

//   // Update due date when assigned date changes
//   const handleAssignedDateChange = (date: Date | undefined) => {
//     if (!date) return

//     const assignedDate = date.toISOString().split("T")[0]
//     const dueDate = addDays(date, 15).toISOString().split("T")[0]

//     setNewAssignment({
//       ...newAssignment,
//       assignedDate,
//       dueDate,
//     })
//   }

//   if (loading) {
//     return (
//       <DashboardLayout role="librarian">
//         <div className="flex items-center justify-center h-64">
//           <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
//           <span className="ml-2">Loading assignments...</span>
//         </div>
//       </DashboardLayout>
//     )
//   }

//   return (
//     <DashboardLayout role="librarian">
//       <div className="space-y-6">
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//           <div>
//             <h1 className="text-3xl font-bold tracking-tight">Book Assignments</h1>
//             <p className="text-slate-500">Manage book assignments and returns</p>
//           </div>
//           <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
//             <DialogTrigger asChild>
//               <Button>
//                 <Plus className="mr-2 h-4 w-4" />
//                 Assign Book
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="sm:max-w-[600px]">
//               <DialogHeader>
//                 <DialogTitle>Assign Book to Borrower</DialogTitle>
//                 <DialogDescription>Select a book and borrower to create a new assignment.</DialogDescription>
//               </DialogHeader>
//               <div className="grid gap-4 py-4">
//                 <div className="space-y-2">
//                   <Label htmlFor="book">Book</Label>
//                   <Select
//                     value={newAssignment.bookId}
//                     onValueChange={(value) => setNewAssignment({ ...newAssignment, bookId: value })}
//                   >
//                     <SelectTrigger id="book">
//                       <SelectValue placeholder="Select a book" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {books.length === 0 ? (
//                         <SelectItem value="no-books" disabled>
//                           No available books
//                         </SelectItem>
//                       ) : (
//                         books.map((book) => (
//                           <SelectItem key={book.id} value={book.id}>
//                             {book.title} ({book.copies_available} available)
//                           </SelectItem>
//                         ))
//                       )}
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="borrower">Borrower</Label>
//                   <Select
//                     value={newAssignment.borrowerId}
//                     onValueChange={(value) => setNewAssignment({ ...newAssignment, borrowerId: value })}
//                   >
//                     <SelectTrigger id="borrower">
//                       <SelectValue placeholder="Select a borrower" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {borrowers.length === 0 ? (
//                         <SelectItem value="no-borrowers" disabled>
//                           No borrowers found
//                         </SelectItem>
//                       ) : (
//                         borrowers.map((borrower) => (
//                           <SelectItem key={borrower.id} value={borrower.id}>
//                             {borrower.name} ({borrower.type})
//                           </SelectItem>
//                         ))
//                       )}
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="assignedDate">Assigned Date</Label>
//                   <Popover>
//                     <PopoverTrigger asChild>
//                       <Button
//                         variant="outline"
//                         className={cn(
//                           "w-full justify-start text-left font-normal",
//                           !newAssignment.assignedDate && "text-muted-foreground",
//                         )}
//                       >
//                         {newAssignment.assignedDate ? (
//                           format(new Date(newAssignment.assignedDate), "PPP")
//                         ) : (
//                           <span>Pick a date</span>
//                         )}
//                       </Button>
//                     </PopoverTrigger>
//                     <PopoverContent className="w-auto p-0">
//                       <Calendar
//                         mode="single"
//                         selected={new Date(newAssignment.assignedDate)}
//                         onSelect={handleAssignedDateChange}
//                         initialFocus
//                       />
//                     </PopoverContent>
//                   </Popover>
//                   <p className="text-xs text-slate-500">Due date will be set to 15 days from assigned date</p>
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="dueDate">Due Date (Auto-calculated)</Label>
//                   <Input
//                     id="dueDate"
//                     value={format(new Date(newAssignment.dueDate), "PPP")}
//                     disabled
//                     className="bg-slate-50"
//                   />
//                 </div>
//               </div>
//               <DialogFooter>
//                 <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} disabled={submitting}>
//                   Cancel
//                 </Button>
//                 <Button onClick={handleAssignBook} disabled={submitting}>
//                   {submitting ? (
//                     <>
//                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                       Assigning...
//                     </>
//                   ) : (
//                     "Assign Book"
//                   )}
//                 </Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         </div>

//         {/* Search and Filter */}
//         <div className="flex flex-col gap-4 md:flex-row">
//           <div className="relative flex-1">
//             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
//             <Input
//               placeholder="Search by book title or borrower name..."
//               className="pl-8"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//           </div>
//           <div className="flex gap-2">
//             <Select value={statusFilter} onValueChange={setStatusFilter}>
//               <SelectTrigger className="w-[180px]">
//                 <Filter className="mr-2 h-4 w-4" />
//                 <SelectValue placeholder="Status" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="All">All Status</SelectItem>
//                 <SelectItem value="Borrowed">Borrowed</SelectItem>
//                 <SelectItem value="Returned">Returned</SelectItem>
//                 <SelectItem value="Overdue">Overdue</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>
//         </div>

//         {/* Assignments Table */}
//         <div className="rounded-md border overflow-hidden">
//           <div className="overflow-x-auto">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>Book</TableHead>
//                   <TableHead>Borrower</TableHead>
//                   <TableHead className="hidden md:table-cell">Assigned Date</TableHead>
//                   <TableHead>Due Date</TableHead>
//                   <TableHead className="hidden lg:table-cell">Return Date</TableHead>
//                   <TableHead>Status</TableHead>
//                   <TableHead className="w-[80px]">Actions</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {filteredAssignments.length === 0 ? (
//                   <TableRow>
//                     <TableCell colSpan={7} className="text-center py-8 text-slate-500">
//                       No assignments found. Try adjusting your search or filters.
//                     </TableCell>
//                   </TableRow>
//                 ) : (
//                   filteredAssignments.map((assignment) => (
//                     <TableRow key={assignment.id}>
//                       <TableCell className="font-medium">{assignment.bookTitle}</TableCell>
//                       <TableCell>
//                         <div className="flex flex-col">
//                           <span>{assignment.borrowerName}</span>
//                           <span className="text-xs text-slate-500">{assignment.borrowerType}</span>
//                         </div>
//                       </TableCell>
//                       <TableCell className="hidden md:table-cell">{assignment.assignedDate}</TableCell>
//                       <TableCell>{assignment.dueDate}</TableCell>
//                       <TableCell className="hidden lg:table-cell">{assignment.returnDate || "-"}</TableCell>
//                       <TableCell>
//                         <Badge
//                           variant="outline"
//                           className={
//                             assignment.status === "returned"
//                               ? "bg-green-50 text-green-700 hover:bg-green-50"
//                               : assignment.status === "borrowed"
//                                 ? "bg-blue-50 text-blue-700 hover:bg-blue-50"
//                                 : "bg-red-50 text-red-700 hover:bg-red-50"
//                           }
//                         >
//                           {assignment.status === "returned"
//                             ? "Returned"
//                             : assignment.status === "borrowed"
//                               ? "Borrowed"
//                               : "Overdue"}
//                         </Badge>
//                       </TableCell>
//                       <TableCell>
//                         {assignment.status !== "returned" && (
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button variant="ghost" size="icon">
//                                 <MoreVertical className="h-4 w-4" />
//                                 <span className="sr-only">Actions</span>
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="end">
//                               <DropdownMenuItem
//                                 onClick={() => {
//                                   setCurrentAssignment(assignment)
//                                   setIsReturnDialogOpen(true)
//                                 }}
//                               >
//                                 <CheckCircle className="mr-2 h-4 w-4" />
//                                 Mark as Returned
//                               </DropdownMenuItem>
//                             </DropdownMenuContent>
//                           </DropdownMenu>
//                         )}
//                       </TableCell>
//                     </TableRow>
//                   ))
//                 )}
//               </TableBody>
//             </Table>
//           </div>
//         </div>

//         {/* Return Book Dialog */}
//         <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
//           <DialogContent>
//             <DialogHeader>
//               <DialogTitle>Return Book</DialogTitle>
//               <DialogDescription>Are you sure you want to mark this book as returned?</DialogDescription>
//             </DialogHeader>
//             {currentAssignment && (
//               <div className="py-4">
//                 <div className="space-y-1">
//                   <p className="font-medium">{currentAssignment.bookTitle}</p>
//                   <p className="text-sm text-slate-500">Borrowed by: {currentAssignment.borrowerName}</p>
//                   <p className="text-sm text-slate-500">Due date: {currentAssignment.dueDate}</p>
//                   {currentAssignment.status === "overdue" && (
//                     <div className="flex items-center gap-2 text-amber-600 mt-2">
//                       <AlertTriangle className="h-4 w-4" />
//                       <span className="text-sm font-medium">This book is overdue</span>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             )}
//             <DialogFooter>
//               <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)} disabled={submitting}>
//                 Cancel
//               </Button>
//               <Button onClick={handleReturnBook} disabled={submitting}>
//                 {submitting ? (
//                   <>
//                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                     Processing...
//                   </>
//                 ) : (
//                   "Confirm Return"
//                 )}
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>
//       </div>
//     </DashboardLayout>
//   )
// }
