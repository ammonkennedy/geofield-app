import { useState, useEffect } from "react"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ToastActionType = 
  | { type: "ADD_TOAST", toast: Toast }
  | { type: "DISMISS_TOAST", toastId: Toast["id"] }
  | { type: "REMOVE_TOAST", toastId: Toast["id"] }

let memoryState: Toast[] = []
let listeners: Array<(state: Toast[]) => void> = []

function dispatch(action: ToastActionType) {
  switch (action.type) {
    case "ADD_TOAST":
      memoryState = [action.toast, ...memoryState]
      break
    case "DISMISS_TOAST":
      memoryState = memoryState.filter(t => t.id !== action.toastId)
      break
    case "REMOVE_TOAST":
      memoryState = memoryState.filter(t => t.id !== action.toastId)
      break
  }
  listeners.forEach(listener => listener(memoryState))
}

export function toast(props: Omit<Toast, "id">) {
  const id = genId()
  const newToast = { ...props, id }
  dispatch({ type: "ADD_TOAST", toast: newToast })
  
  setTimeout(() => {
    dispatch({ type: "DISMISS_TOAST", toastId: id })
  }, 5000)
  
  return {
    id,
    dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id })
  }
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryState)

  useEffect(() => {
    listeners.push(setToasts)
    return () => {
      listeners = listeners.filter(l => l !== setToasts)
    }
  }, [])

  return { toasts, toast }
}
