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
import { Plus, Search, MoreVertical, Edit, Trash, Filter, Copy, Check, Loader2, Eye, EyeOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ManageLibrarians() {
  const { toast } = useToast()
  const [librarians, setLibrarians] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentLibrarian, setCurrentLibrarian] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [credentialsCopied, setCredentialsCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newLibrarianCredentials, setNewLibrarianCredentials] = useState(null)

  const [newLibrarian, setNewLibrarian] = useState({
    username: "",
    email: "",
    password: "",
    role: "librarian",
  })

  // Generate a random password
  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  // Fetch librarians on component mount
  useEffect(() => {
    const fetchLibrarians = async () => {
      try {
        const { data, error } = await supabase.from("librarians").select("*").order("username")

        if (error) throw error
        setLibrarians(data)
      } catch (error) {
        console.error("Error fetching librarians:", error)
        toast({
          title: "Error",
          description: "Failed to load librarians. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchLibrarians()
  }, [toast])

  // Filter librarians based on search term and role
  const filteredLibrarians = librarians.filter((librarian) => {
    const matchesSearch =
      librarian.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (librarian.email && librarian.email.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesRole = roleFilter === "All" || librarian.role === roleFilter.toLowerCase()

    return matchesSearch && matchesRole
  })

  // Handle adding a new librarian
  const handleAddLibrarian = async () => {
    // Validate form
    if (!newLibrarian.username || !newLibrarian.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      // Insert the new librarian
      const { data, error } = await supabase
        .from("librarians")
        .insert([
          {
            username: newLibrarian.username,
            email: newLibrarian.email || null,
            password: newLibrarian.password,
            role: newLibrarian.role,
          },
        ])
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Duplicate Username",
            description: "A librarian with this username already exists.",
            variant: "destructive",
          })
        } else {
          throw error
        }
        return
      }

      // Add the new librarian to the state
      setLibrarians([...librarians, data])

      // Save credentials to show to the admin
      setNewLibrarianCredentials({
        username: data.username,
        password: newLibrarian.password,
      })

      // Reset form
      setNewLibrarian({
        username: "",
        email: "",
        password: generatePassword(),
        role: "librarian",
      })

      toast({
        title: "Success",
        description: "Librarian added successfully.",
      })
    } catch (error) {
      console.error("Error adding librarian:", error)
      toast({
        title: "Error",
        description: "Failed to add librarian. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle editing a librarian
  const handleEditLibrarian = async () => {
    if (!currentLibrarian) return

    // Validate form
    if (!currentLibrarian.username) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      // Update the librarian in the database
      const { error } = await supabase
        .from("librarians")
        .update({
          username: currentLibrarian.username,
          email: currentLibrarian.email || null,
          password: currentLibrarian.password,
          role: currentLibrarian.role,
        })
        .eq("id", currentLibrarian.id)

      if (error) throw error

      // Update the librarian in the state
      setLibrarians(
        librarians.map((librarian) => (librarian.id === currentLibrarian.id ? { ...currentLibrarian } : librarian)),
      )

      toast({
        title: "Success",
        description: "Librarian updated successfully.",
      })

      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Error updating librarian:", error)
      toast({
        title: "Error",
        description: "Failed to update librarian. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle deleting a librarian
  const handleDeleteLibrarian = async () => {
    if (!currentLibrarian) return

    setSubmitting(true)

    try {
      // Delete the librarian
      const { error } = await supabase.from("librarians").delete().eq("id", currentLibrarian.id)

      if (error) throw error

      // Remove the librarian from the state
      setLibrarians(librarians.filter((librarian) => librarian.id !== currentLibrarian.id))

      toast({
        title: "Success",
        description: "Librarian deleted successfully.",
      })

      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting librarian:", error)
      toast({
        title: "Error",
        description: "Failed to delete librarian. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Copy credentials to clipboard
  const copyCredentials = (username, password) => {
    const text = `Username: ${username}\nPassword: ${password}`
    navigator.clipboard.writeText(text)

    setCredentialsCopied(true)
    setTimeout(() => setCredentialsCopied(false), 2000)
  }

  // Initialize password for new librarian
  useEffect(() => {
    setNewLibrarian((prev) => ({
      ...prev,
      password: generatePassword(),
    }))
  }, [])

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="ml-2">Loading librarians...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Librarians</h1>
            <p className="text-slate-500">Add, edit, or remove librarian accounts</p>
          </div>
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              setIsAddDialogOpen(open)
              if (!open) setNewLibrarianCredentials(null)
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Librarian
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Librarian</DialogTitle>
                <DialogDescription>Enter the details of the new librarian account.</DialogDescription>
              </DialogHeader>

              {newLibrarianCredentials ? (
                <div className="py-4">
                  <Alert className="bg-green-50 border-green-200 mb-4">
                    <AlertDescription className="text-green-800">
                      Librarian added successfully! Please save these credentials:
                    </AlertDescription>
                  </Alert>

                  <div className="bg-slate-50 p-4 rounded-md mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Login Credentials</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyCredentials(newLibrarianCredentials.username, newLibrarianCredentials.password)
                        }
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
                        <span className="text-slate-500">Username:</span>
                        <span className="font-mono">{newLibrarianCredentials.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Password:</span>
                        <span className="font-mono">{newLibrarianCredentials.password}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 mb-4">
                    Please provide these credentials to the librarian. They will need them to log in to the system.
                  </p>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        setIsAddDialogOpen(false)
                        setNewLibrarianCredentials(null)
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={newLibrarian.username}
                        onChange={(e) => setNewLibrarian({ ...newLibrarian, username: e.target.value })}
                        placeholder="Enter username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newLibrarian.email}
                        onChange={(e) => setNewLibrarian({ ...newLibrarian, email: e.target.value })}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={newLibrarian.password}
                          onChange={(e) => setNewLibrarian({ ...newLibrarian, password: e.target.value })}
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
                        <span className="text-xs text-slate-500">Auto-generated secure password</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNewLibrarian({ ...newLibrarian, password: generatePassword() })}
                          className="h-7 text-xs"
                        >
                          Regenerate
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={newLibrarian.role}
                        onValueChange={(value) => setNewLibrarian({ ...newLibrarian, role: value })}
                      >
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="librarian">Librarian</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddLibrarian} disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Librarian"
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
              placeholder="Search by username or email..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Roles</SelectItem>
                <SelectItem value="librarian">Librarian</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Librarians Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Created At</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLibrarians.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No librarians found. Try adjusting your search or filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLibrarians.map((librarian) => (
                    <TableRow key={librarian.id}>
                      <TableCell className="font-medium">{librarian.username}</TableCell>
                      <TableCell className="hidden md:table-cell">{librarian.email || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            librarian.role === "admin"
                              ? "bg-purple-50 text-purple-700 hover:bg-purple-50"
                              : "bg-blue-50 text-blue-700 hover:bg-blue-50"
                          }
                        >
                          {librarian.role.charAt(0).toUpperCase() + librarian.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(librarian.created_at).toLocaleDateString()}
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
                            <DropdownMenuItem
                              onClick={() => {
                                setCurrentLibrarian(librarian)
                                setShowPassword(false)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setCurrentLibrarian(librarian)
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

        {/* Edit Librarian Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Librarian</DialogTitle>
              <DialogDescription>Update the details of the selected librarian account.</DialogDescription>
            </DialogHeader>
            {currentLibrarian && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    value={currentLibrarian.username}
                    onChange={(e) => setCurrentLibrarian({ ...currentLibrarian, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email (Optional)</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={currentLibrarian.email || ""}
                    onChange={(e) => setCurrentLibrarian({ ...currentLibrarian, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="edit-password"
                      type={showPassword ? "text" : "password"}
                      value={currentLibrarian.password}
                      onChange={(e) => setCurrentLibrarian({ ...currentLibrarian, password: e.target.value })}
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
                    <span className="text-xs text-slate-500">Current password</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentLibrarian({ ...currentLibrarian, password: generatePassword() })}
                      className="h-7 text-xs"
                    >
                      Generate New Password
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select
                    value={currentLibrarian.role}
                    onValueChange={(value) => setCurrentLibrarian({ ...currentLibrarian, role: value })}
                  >
                    <SelectTrigger id="edit-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="librarian">Librarian</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleEditLibrarian} disabled={submitting}>
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

        {/* Delete Librarian Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Librarian</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this librarian account? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {currentLibrarian && (
              <div className="py-4">
                <p className="font-medium">{currentLibrarian.username}</p>
                <p className="text-sm text-slate-500">
                  Role: {currentLibrarian.role.charAt(0).toUpperCase() + currentLibrarian.role.slice(1)}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteLibrarian} disabled={submitting}>
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
      </div>
    </DashboardLayout>
  )
}

