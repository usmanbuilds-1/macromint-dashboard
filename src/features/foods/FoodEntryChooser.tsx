import { useRef } from "react";
import { Camera, Search, ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** One decision before opening an input. Keeps the software keyboard closed
 * until the user explicitly chooses to type. Both paths preserve meal/date. */
export function FoodEntryChooser({
  open, onClose, onSearch, onScan,
}: {
  open: boolean;
  onClose: () => void;
  onSearch: () => void;
  onScan: () => void;
}) {
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        className="mm-food-entry-chooser max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          firstChoiceRef.current?.focus({ preventScroll: true });
        }}
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl tracking-tight">Add food</DialogTitle>
          <DialogDescription>
            Choose how you want to log this meal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2" aria-label="Ways to add food">
          <button ref={firstChoiceRef} type="button" onClick={onSearch}
            className="group flex min-h-20 items-center gap-4 rounded-xl border bg-background px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
              <Search className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Search or type a food</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                Find a food or enter its nutrition manually
              </span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
          <button type="button" onClick={onScan}
            className="group flex min-h-20 items-center gap-4 rounded-xl border bg-background px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
              <Camera className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Use a meal photo</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                Take a photo or select an existing image
              </span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
