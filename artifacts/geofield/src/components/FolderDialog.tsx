import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useFoldersMutations } from "@/hooks/use-geofield";
import { Folder } from "@workspace/api-client-react";

export function FolderDialog({ 
  open, 
  onOpenChange, 
  folder 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  folder?: Folder;
}) {
  const [name, setName] = useState(folder?.name || "");
  const [description, setDescription] = useState(folder?.description || "");
  const { createFolder, updateFolder } = useFoldersMutations();

  const isPending = createFolder.isPending || updateFolder.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (folder) {
      updateFolder.mutate({ 
        id: folder.id, 
        data: { name, description } 
      }, {
        onSuccess: () => onOpenChange(false)
      });
    } else {
      createFolder.mutate({ 
        data: { name, description } 
      }, {
        onSuccess: () => {
          setName("");
          setDescription("");
          onOpenChange(false);
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{folder ? "Edit Dataset" : "Create New Dataset"}</DialogTitle>
        <DialogClose onClick={() => onOpenChange(false)} />
      </DialogHeader>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Dataset Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g., Summer 2024 Field Trip"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Location details or project scope"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Saving..." : folder ? "Save Changes" : "Create Dataset"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
