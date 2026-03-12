import { useState } from "react";
import { useGetSamples, useGetFolders } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Download, FolderOpen, Layers } from "lucide-react";
import { exportSamplesToExcel } from "@/lib/export";
import { cn } from "@/lib/utils";

type Selection = "all" | "uncategorized" | number;

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [selected, setSelected] = useState<Selection>("all");
  const { data: folders } = useGetFolders();
  const { data: allSamples } = useGetSamples();

  const samplesToExport = (() => {
    if (!allSamples) return [];
    if (selected === "all") return allSamples;
    if (selected === "uncategorized") return allSamples.filter(s => !s.folderId);
    return allSamples.filter(s => s.folderId === selected);
  })();

  const count = samplesToExport.length;
  const selectedFolder = typeof selected === "number" ? folders?.find(f => f.id === selected) : null;
  const uncategorizedCount = (allSamples || []).filter(s => !s.folderId).length;

  const handleExport = () => {
    if (samplesToExport.length === 0) return;
    const folderName = selectedFolder
      ? selectedFolder.name
      : selected === "uncategorized"
      ? "Uncategorized"
      : "All Samples";
    const filename = selectedFolder
      ? `geofield-${selectedFolder.name.replace(/\s+/g, "-").toLowerCase()}`
      : selected === "uncategorized"
      ? "geofield-uncategorized"
      : "geofield-all";
    exportSamplesToExcel(samplesToExport, folderName, filename);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Download className="w-5 h-5 text-primary" />
            Export to Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Choose which samples to include. Photos are excluded automatically.
          </p>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {/* All samples */}
            <OptionRow
              icon={<Layers className="w-4 h-4" />}
              label="All Samples"
              count={allSamples?.length ?? 0}
              selected={selected === "all"}
              onClick={() => setSelected("all")}
            />

            {/* Folders */}
            {folders?.map(folder => (
              <OptionRow
                key={folder.id}
                icon={<FolderOpen className="w-4 h-4" />}
                label={folder.name}
                count={(allSamples || []).filter(s => s.folderId === folder.id).length}
                selected={selected === folder.id}
                onClick={() => setSelected(folder.id)}
              />
            ))}

            {/* Uncategorized */}
            {uncategorizedCount > 0 && (
              <OptionRow
                icon={<FolderOpen className="w-4 h-4 opacity-40" />}
                label="Uncategorized"
                count={uncategorizedCount}
                selected={selected === "uncategorized"}
                onClick={() => setSelected("uncategorized")}
                muted
              />
            )}
          </div>

          <div className="flex gap-3 pt-2 border-t">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1 gap-2" disabled={count === 0} onClick={handleExport}>
              <Download className="w-4 h-4" />
              Download {count > 0 ? `(${count} samples)` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OptionRow({
  icon, label, count, selected, onClick, muted,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left",
        selected
          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
          : "border-border bg-card hover:border-primary/30 hover:bg-muted/40"
      )}
    >
      <div className="flex items-center gap-3">
        <span className={muted ? "opacity-50" : ""}>{icon}</span>
        <span className={cn("truncate max-w-[220px]", muted && "text-muted-foreground")}>{label}</span>
      </div>
      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-mono shrink-0 ml-2">
        {count}
      </span>
    </button>
  );
}
