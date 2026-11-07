import { useRef, useState, type RefObject } from "react";
import { Camera, ImagePlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Photo entry, keyboard-free by default. Notes are intentionally disclosed
 * only when needed, so a camera-first user never gets an unsolicited keyboard. */
export function ScanCapture({
  cameraButtonRef, hints, setHints, onFile, onSearchText, error,
}: {
  cameraButtonRef: RefObject<HTMLButtonElement | null>;
  hints: string;
  setHints: (text: string) => void;
  onFile: (file: File) => void;
  onSearchText: () => void;
  error: string | null;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [showNotes, setShowNotes] = useState(false);
  return (
    <div className="grid gap-2.5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button ref={cameraButtonRef} type="button" className="min-h-12 justify-center gap-2"
          onClick={() => cameraRef.current?.click()}>
          <Camera className="h-5 w-5" aria-hidden="true" /> Take photo
        </Button>
        <Button type="button" variant="outline" className="min-h-12 justify-center gap-2"
          onClick={() => galleryRef.current?.click()}>
          <ImagePlus className="h-5 w-5" aria-hidden="true" /> Choose from gallery
        </Button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        className="sr-only absolute h-px w-px overflow-hidden opacity-0" tabIndex={-1}
        aria-label="Take a new meal photo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <input ref={galleryRef} type="file" accept="image/*"
        className="sr-only absolute h-px w-px overflow-hidden opacity-0" tabIndex={-1}
        aria-label="Choose an existing meal photo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <div className="pt-2">
        <button type="button" onClick={onSearchText}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search or enter a meal instead
        </button>
      </div>
      <div className="pt-1">
        <button type="button" onClick={() => setShowNotes((shown) => !shown)}
          aria-expanded={showNotes} aria-controls="scan-notes"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {showNotes ? "Hide details" : "Add details (optional)"}
        </button>
        {showNotes && (
          <div id="scan-notes" className="mt-2 grid gap-1.5">
            <Label htmlFor="scan-hints">What the photo doesn't show</Label>
            <Input id="scan-hints" value={hints} onChange={(event) => setHints(event.target.value)}
              placeholder="e.g. cooked in oil, small serving" maxLength={300} />
          </div>
        )}
      </div>
      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
