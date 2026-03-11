import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts, toast } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-md pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md",
              t.variant === "destructive" 
                ? "bg-destructive/10 border-destructive/20 text-destructive-foreground" 
                : "bg-card/90 border-border text-card-foreground"
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {t.variant === "destructive" ? (
                <AlertCircle className="w-5 h-5 text-destructive" />
              ) : (
                <CheckCircle className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              {t.title && <h3 className="font-semibold text-sm">{t.title}</h3>}
              {t.description && <p className="text-sm opacity-80 mt-1">{t.description}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
