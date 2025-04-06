"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash,
  Filter,
  BookOpen,
  User,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Departments for filtering
const departments = [
  "All Departments",
  "Computer Science",
  "Mathematics",
  "Physics",
  "Literature",
  "History",
  "Engineering",
  "Chemistry",
]

// Borrower types
const borrowerTypes = ["student", "faculty"]

export default function ManageBorrowers() {
  const { toast } = useToast()
  const [borrowers, setBorrowers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("All Departments")
  const [typeFilter, setTypeFilter] = useState("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isViewHistoryDialogOpen, setIsViewHistoryDialogOpen] = useState(false)
  const [currentBorrower, setCurrentBorrower] = useState<any>(null)
  const [borrowingHistory, setBorrowingHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [credentialsCopied, setCredentialsCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newBorrowerCredentials, setNewBorrowerCredentials] = useState<{
    id: string
    password: string
  } | null>(null)

  const [newBorrower, setNewBorrower] = useState({
    name: "",
    student_or_faculty_id: "",
    email: "",
    phone: "",
    department: "",
    type: "student",
  })

  // Fetch borrowers on component mount
  useEffect(() => {
    const fetchBorrowers = async () => {
      try {
        // Fetch borrowers
        const { data, error } = await supabase
          .from("borrowers")
          .select("id, name, student_or_faculty_id, email, phone, department, type, password")

        if (error) throw error

        // For each borrower, count their borrowed books
        const borrowersWithCounts = await Promise.all(
          data.map(async (borrower) => {
            const { count, error: countError } = await supabase
              .from("assignments")
              .select("id", { count: "exact", head: true })
              .eq("borrower_id", borrower.id)
              .in("status", ["borrowed", "overdue"])

            return {
              ...borrower,
              borrowedBooks: count || 0,
            }
          }),
        )

        setBorrowers(borrowersWithCounts)
      } catch (error) {
        console.error("Error fetching borrowers:", error)
        toast({
          title: "Error",
          description: "Failed to load borrowers. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBorrowers()
  }, [toast])

  // Filter borrowers based on search term, department, and type
  const filteredBorrowers = borrowers.filter((borrower) => {
    const matchesSearch =
      borrower.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      borrower.student_or_faculty_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      borrower.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDepartment = departmentFilter === "All Departments" || borrower.department === departmentFilter

    const matchesType = typeFilter === "All" || borrower.type === typeFilter.toLowerCase()

    return matchesSearch && matchesDepartment && matchesType
  })

  // Generate a random password
  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let password = ""
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  // Handle adding a new borrower
  const handleAddBorrower = async () => {
    // Validate form
    if (!newBorrower.name || !newBorrower.student_or_faculty_id || !newBorrower.email || !newBorrower.department) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      // Generate a password
      const password = generatePassword()

      // Insert the new borrower
      const { data, error } = await supabase
        .from("borrowers")
        .insert([
          {
            name: newBorrower.name,
            student_or_faculty_id: newBorrower.student_or_faculty_id,
            email: newBorrower.email,
            phone: newBorrower.phone || null,
            department: newBorrower.department,
            type: newBorrower.type,
            password: password,
          },
        ])
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Duplicate Entry",
            description: "A borrower with this ID or email already exists.",
            variant: "destructive",
          })
        } else {
          throw error
        }
        return
      }

      // Add the new borrower to the state
      setBorrowers([
        {
          ...data,
          borrowedBooks: 0,
        },
        ...borrowers,
      ])

      // Save credentials to show to the librarian
      setNewBorrowerCredentials({
        id: data.student_or_faculty_id,
        password: password,
      })

      // Reset form
      setNewBorrower({
        name: "",
        student_or_faculty_id: "",
        email: "",
        phone: "",
        department: "",
        type: "student",
      })

      toast({
        title: "Success",
        description: "Borrower added successfully.",
      })
    } catch (error) {
      console.error("Error adding borrower:", error)
      toast({
        title: "Error",
        description: "Failed to add borrower. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle editing a borrower
  const handleEditBorrower = async () => {
    if (!currentBorrower) return

    // Validate form
    if (
      !currentBorrower.name ||
      !currentBorrower.student_or_faculty_id ||
      !currentBorrower.email ||
      !currentBorrower.department
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      // Update the borrower in the database
      const { error } = await supabase
        .from("borrowers")
        .update({
          name: currentBorrower.name,
          student_or_faculty_id: currentBorrower.student_or_faculty_id,
          email: currentBorrower.email,
          phone: currentBorrower.phone || null,
          department: currentBorrower.department,
          type: currentBorrower.type,
          password: currentBorrower.password,
        })
        .eq("id", currentBorrower.id)

      if (error) throw error

      // Update the borrower in the state
      setBorrowers(
        borrowers.map((borrower) =>
          borrower.id === currentBorrower.id
            ? {
                ...currentBorrower,
                borrowedBooks: borrower.borrowedBooks,
              }
            : borrower,
        ),
      )

      toast({
        title: "Success",
        description: "Borrower updated successfully.",
      })

      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Error updating borrower:", error)
      toast({
        title: "Error",
        description: "Failed to update borrower. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle deleting a borrower
  const handleDeleteBorrower = async () => {
    if (!currentBorrower) return

    setSubmitting(true)

    try {
      // Check if borrower has active assignments
      const { count, error: countError } = await supabase
        .from("assignments")
        .select("id", { count: "exact", head: true })
        .eq("borrower_id", currentBorrower.id)
        .in("status", ["borrowed", "overdue"])

      if (countError) throw countError

      if (count && count > 0) {
        toast({
          title: "Cannot Delete",
          description: "This borrower has active book assignments. Return all books before deleting.",
          variant: "destructive",
        })
        setIsDeleteDialogOpen(false)
        return
      }

      // Delete the borrower
      const { error } = await supabase.from("borrowers").delete().eq("id", currentBorrower.id)

      if (error) throw error

      // Remove the borrower from the state
      setBorrowers(borrowers.filter((borrower) => borrower.id !== currentBorrower.id))

      toast({
        title: "Success",
        description: "Borrower deleted successfully.",
      })

      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting borrower:", error)
      toast({
        title: "Error",
        description: "Failed to delete borrower. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle viewing borrower history
  const handleViewHistory = async (borrower: any) => {
    setCurrentBorrower(borrower)
    setIsViewHistoryDialogOpen(true)

    try {
      // Fetch borrowing history
      const { data, error } = await supabase
        .from("assignments")
        .select(`
        id,
        assigned_date,
        due_date,
        return_date,
        status,
        books:book_id (
          title
        )
      `)
        .eq("borrower_id", borrower.id)
        .order("assigned_date", { ascending: false })

      if (error) throw error

      // Format the data
      const formattedHistory = data.map((item) => ({
        id: item.id,
        bookTitle: item.books.title,
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
        description: "Failed to load borrowing history.",
        variant: "destructive",
      })
      setBorrowingHistory([])
    }
  }

  // Copy credentials to clipboard
  const copyCredentials = (id, password) => {
    const text = `ID: ${id}\nPassword: ${password}`
    navigator.clipboard.writeText(text)

    setCredentialsCopied(true)
    setTimeout(() => setCredentialsCopied(false), 2000)
  }

  if (loading) {
    return (
      <DashboardLayout role="librarian">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="ml-2">Loading borrowers...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="librarian">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Borrowers</h1>
            <p className="text-slate-500">Add, edit, or remove borrowers from the system</p>
          </div>
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              setIsAddDialogOpen(open)
              if (!open) setNewBorrowerCredentials(null)
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Borrower
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Borrower</DialogTitle>
                <DialogDescription>Enter the details of the new borrower to add to the system.</DialogDescription>
              </DialogHeader>

              {newBorrowerCredentials ? (
                <div className="py-4">
                  <Alert className="bg-green-50 border-green-200 mb-4">
                    <AlertDescription className="text-green-800">
                      Borrower added successfully! Please save these credentials:
                    </AlertDescription>
                  </Alert>

                  <div className="bg-slate-50 p-4 rounded-md mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Login Credentials</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyCredentials(newBorrowerCredentials.id, newBorrowerCredentials.password)}
                        className="h-8"
                      >
                        {credentialsCopied ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">ID:</span>
                        <span className="font-mono">{newBorrowerCredentials.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Password:</span>
                        <span className="font-mono">{newBorrowerCredentials.password}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 mb-4">
                    Please provide these credentials to the borrower. They will need them to log in to the system.
                  </p>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        setIsAddDialogOpen(false)
                        setNewBorrowerCredentials(null)
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={newBorrower.name}
                          onChange={(e) => setNewBorrower({ ...newBorrower, name: e.target.value })}
                          placeholder="Full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="student_or_faculty_id">Student/Faculty ID</Label>
                        <Input
                          id="student_or_faculty_id"
                          value={newBorrower.student_or_faculty_id}
                          onChange={(e) => setNewBorrower({ ...newBorrower, student_or_faculty_id: e.target.value })}
                          placeholder="ID number"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newBorrower.email}
                          onChange={(e) => setNewBorrower({ ...newBorrower, email: e.target.value })}
                          placeholder="Email address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={newBorrower.phone}
                          onChange={(e) => setNewBorrower({ ...newBorrower, phone: e.target.value })}
                          placeholder="Phone number"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Select
                          value={newBorrower.department}
                          onValueChange={(value) => setNewBorrower({ ...newBorrower, department: value })}
                        >
                          <SelectTrigger id="department">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments
                              .filter((dept) => dept !== "All Departments")
                              .map((department) => (
                                <SelectItem key={department} value={department}>
                                  {department}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={newBorrower.type}
                          onValueChange={(value) => setNewBorrower({ ...newBorrower, type: value })}
                        >
                          <SelectTrigger id="type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {borrowerTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddBorrower} disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Borrower"
                      )}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by name, ID, or email..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <User className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Borrowers Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Books</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBorrowers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No borrowers found. Try adjusting your search or filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBorrowers.map((borrower) => (
                    <TableRow key={borrower.id}>
                      <TableCell className="font-medium">{borrower.name}</TableCell>
                      <TableCell>{borrower.student_or_faculty_id}</TableCell>
                      <TableCell className="hidden md:table-cell">{borrower.email}</TableCell>
                      <TableCell className="hidden lg:table-cell">{borrower.department}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            borrower.type === "student"
                              ? "bg-blue-50 text-blue-700 hover:bg-blue-50"
                              : "bg-purple-50 text-purple-700 hover:bg-purple-50"
                          }
                        >
                          {borrower.type.charAt(0).toUpperCase() + borrower.type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {borrower.borrowedBooks > 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                            {borrower.borrowedBooks} books
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 hover:bg-slate-50">
                            No books
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewHistory(borrower)}>
                              <BookOpen className="mr-2 h-4 w-4" />
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setCurrentBorrower(borrower)
                                setShowPassword(false)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setCurrentBorrower(borrower)
                                setIsDeleteDialogOpen(true)
                              }}
                              className="text-red-600"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Edit Borrower Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Borrower</DialogTitle>
              <DialogDescription>Update the details of the selected borrower.</DialogDescription>
            </DialogHeader>
            {currentBorrower && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input
                      id="edit-name"
                      value={currentBorrower.name}
                      onChange={(e) => setCurrentBorrower({ ...currentBorrower, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-studentId">Student/Faculty ID</Label>
                    <Input
                      id="edit-studentId"
                      value={currentBorrower.student_or_faculty_id}
                      onChange={(e) =>
                        setCurrentBorrower({ ...currentBorrower, student_or_faculty_id: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={currentBorrower.email}
                      onChange={(e) => setCurrentBorrower({ ...currentBorrower, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={currentBorrower.phone || ""}
                      onChange={(e) => setCurrentBorrower({ ...currentBorrower, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-department">Department</Label>
                    <Select
                      value={currentBorrower.department}
                      onValueChange={(value) => setCurrentBorrower({ ...currentBorrower, department: value })}
                    >
                      <SelectTrigger id="edit-department">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments
                          .filter((dept) => dept !== "All Departments")
                          .map((department) => (
                            <SelectItem key={department} value={department}>
                              {department}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-type">Type</Label>
                    <Select
                      value={currentBorrower.type}
                      onValueChange={(value) => setCurrentBorrower({ ...currentBorrower, type: value })}
                    >
                      <SelectTrigger id="edit-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {borrowerTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Login Credentials Section */}
                <div className="space-y-2 mt-2">
                  <Label htmlFor="edit-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="edit-password"
                      type={showPassword ? "text" : "password"}
                      value={currentBorrower.password}
                      onChange={(e) => setCurrentBorrower({ ...currentBorrower, password: e.target.value })}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                    </Button>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-slate-500">Current login password</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentBorrower({ ...currentBorrower, password: generatePassword() })}
                      className="h-7 text-xs"
                    >
                      Generate New Password
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-md mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Login Credentials</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCredentials(currentBorrower.student_or_faculty_id, currentBorrower.password)}
                      className="h-8"
                    >
                      {credentialsCopied ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3 w-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">ID:</span>
                      <span className="font-mono">{currentBorrower.student_or_faculty_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Password:</span>
                      <span className="font-mono">{showPassword ? currentBorrower.password : "••••••••"}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    These are the credentials the borrower uses to log in. You can provide these to the borrower if they
                    forget.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleEditBorrower} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Borrower Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Borrower</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this borrower? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {currentBorrower && (
              <div className="py-4">
                <p className="font-medium">{currentBorrower.name}</p>
                <p className="text-sm text-slate-500">
                  {currentBorrower.student_or_faculty_id} - {currentBorrower.department}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteBorrower} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Borrowing History Dialog */}
        <Dialog open={isViewHistoryDialogOpen} onOpenChange={setIsViewHistoryDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Borrowing History</DialogTitle>
              {currentBorrower && (
                <DialogDescription>
                  Viewing borrowing history for {currentBorrower.name} ({currentBorrower.student_or_faculty_id})
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="py-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book Title</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {borrowingHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-slate-500">
                          No borrowing history found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      borrowingHistory.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.bookTitle}</TableCell>
                          <TableCell>{record.assignedDate}</TableCell>
                          <TableCell>{record.dueDate}</TableCell>
                          <TableCell>{record.returnDate || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                record.status === "returned"
                                  ? "bg-green-50 text-green-700 hover:bg-green-50"
                                  : record.status === "borrowed"
                                    ? "bg-blue-50 text-blue-700 hover:bg-blue-50"
                                    : "bg-red-50 text-red-700 hover:bg-red-50"
                              }
                            >
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsViewHistoryDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

