import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetCurrentAuthUser, useGetFolders } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { FolderDialog } from "./FolderDialog";
import { Pickaxe, FolderOpen, MapPin, LogOut, ChevronRight, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: authData } = useGetCurrentAuthUser();
  const { data: folders } = useGetFolders();
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = authData?.user;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2 text-primary font-display font-bold text-xl">
          <Pickaxe className="w-6 h-6" />
          <span>GeoField</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-sidebar border-r flex flex-col transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 hidden md:flex items-center gap-2 text-primary font-display font-bold text-2xl border-b border-border/50">
          <Pickaxe className="w-7 h-7" />
          <span>GeoField</span>
        </div>

        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-6">
          <div className="px-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Menu</h3>
            <nav className="space-y-1">
              <Link 
                href="/" 
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  location === "/" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <MapPin className="w-4 h-4" />
                All Samples
              </Link>
            </nav>
          </div>

          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Folders</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFolderDialogOpen(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <nav className="space-y-1">
              {folders?.map(folder => (
                <Link 
                  key={folder.id}
                  href={`/folder/${folder.id}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
                    location === `/folder/${folder.id}` 
                      ? "bg-primary text-primary-foreground font-medium shadow-md" 
                      : "text-foreground hover:bg-muted font-medium"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <FolderOpen className="w-4 h-4 opacity-80" />
                  <span className="truncate flex-1">{folder.name}</span>
                  {location === `/folder/${folder.id}` && <ChevronRight className="w-4 h-4" />}
                </Link>
              ))}
              {folders?.length === 0 && (
                <p className="text-xs text-muted-foreground italic px-3 py-2">No folders yet</p>
              )}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-border/50 bg-card mt-auto">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold font-display shadow-inner">
                {user.firstName?.[0] || user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate">{user.firstName || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <a href="/api/logout" className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground">
                <LogOut className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <Button asChild className="w-full">
              <a href="/api/login">Log In</a>
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen relative max-w-full overflow-hidden">
        <div className="flex-1 p-4 md:p-8 md:max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Folder Dialog */}
      <FolderDialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen} />
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
