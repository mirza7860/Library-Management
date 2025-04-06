"use client"

import { useEffect, useState } from "react"
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function ToastProvider() {
  const { toasts, dismiss } = useToast()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4 w-full max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-start p-4 rounded-lg shadow-lg border transition-all duration-300 transform translate-y-0 opacity-100",
            "bg-white border-slate-200",
            toast.variant === "destructive" && "bg-red-50 border-red-200",
            toast.variant === "success" && "bg-green-50 border-green-200",
          )}
          role="alert"
        >
          <div className="flex-shrink-0 mr-3">
            {toast.variant === "destructive" && <AlertCircle className="h-5 w-5 text-red-500" />}
            {toast.variant === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
            {toast.variant === "warning" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            {toast.variant === "info" && <Info className="h-5 w-5 text-blue-500" />}
          </div>
          <div className="flex-1">
            {toast.title && (
              <h3
                className={cn(
                  "font-medium text-slate-900",
                  toast.variant === "destructive" && "text-red-800",
                  toast.variant === "success" && "text-green-800",
                )}
              >
                {toast.title}
              </h3>
            )}
            {toast.description && (
              <div
                className={cn(
                  "text-sm text-slate-500 mt-1",
                  toast.variant === "destructive" && "text-red-700",
                  toast.variant === "success" && "text-green-700",
                )}
              >
                {toast.description}
              </div>
            )}
          </div>
          <button
            type="button"
            className={cn(
              "flex-shrink-0 ml-3 h-5 w-5 rounded-full inline-flex items-center justify-center text-slate-400 hover:text-slate-500 focus:outline-none",
              toast.variant === "destructive" && "text-red-400 hover:text-red-500",
              toast.variant === "success" && "text-green-400 hover:text-green-500",
            )}
            onClick={() => dismiss(toast.id)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
      ))}
    </div>
  )
}

