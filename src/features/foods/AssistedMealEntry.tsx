import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { describeMeal, type DescribedFood } from "@/lib/nutrition/describe-meal";

interface Recognizer {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: {results: ArrayLike<ArrayLike<{ transcript: string }>>}) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void; abort(): void;
}
type RecognizerClass = new() => Recognizer;
const speechAPI = (): RecognizerClass | null => {
  if (typeof window === "undefined") return null;
  const api = window as unknown as {SpeechRecognition?: RecognizerClass; webkitSpeechRecognition?: RecognizerClass};
  return api.SpeechRecognition ?? api.webkitSpeechRecognition ?? null;
};
/** Optional speech transcripts may be processed by the user's browser provider.
 * Never starts a microphone on mount, stores raw audio, or auto-saves food. */
export function AssistedMealEntry({ onFind }: {onFind: (term: string) => void}) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<DescribedFood[]>([]);
  const [recording, setRecording] = useState(false);
  const recognizer = useRef<Recognizer | null>(null);
  useEffect(()=>()=>{recognizer.current?.abort();recognizer.current=null;},[]);
  const startVoice = () => {
    if (recording) { recognizer.current?.abort();return; }
    const API = speechAPI();
    if (!API) { toast.info("Voice input isn't supported in this browser. Type the meal instead.");return; }
    try {
      const r = new API();
      recognizer.current = r;
      r.lang="en-PK";r.continuous=false;r.interimResults=false;
      r.onresult=(event)=>{
        const transcript=event.results[0]?.[0]?.transcript?.trim();
        if (transcript) { setText((prev)=>[prev,transcript].filter(Boolean).join(", ").slice(0,400));setItems([]); }
      };
      r.onerror=()=>{toast.error("Voice input could not be completed. Type the foods instead.");setRecording(false);};
      r.onend=()=>setRecording(false);
      r.start();setRecording(true);
    } catch { setRecording(false);toast.error("Microphone isn't available. Type the meal instead."); }
  };
  const preview = () => {
    try { setItems(describeMeal(text)); } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check the meal description.");
    }
  };
  return (
    <details className="mm-feature-disclosure mm-assisted-meal">
      <summary className="mm-feature-disclosure-trigger"><span>Describe a meal</span><span className="mm-feature-disclosure-hint">Optional assisted search</span></summary>
      <div className="mm-feature-body">
        <p className="mm-feature-muted">Example: “2 eggs, 1 roti and chai”. This finds foods to review; it never guesses or logs nutrition automatically.</p>
        <label className="mm-feature-field">Foods eaten
          <textarea rows={2} maxLength={400} value={text}
            placeholder="Describe the foods, separated by commas or 'and'"
            onChange={(e)=>{setText(e.target.value);setItems([]);}} />
        </label>
        <div className="mm-assisted-actions">
          <button type="button" onClick={preview} disabled={!text.trim()}>Preview foods</button>
          <button type="button" onClick={startVoice}>{recording?"Stop microphone":"Use microphone"}</button>
        </div>
        <p className="mm-feature-muted">Voice is optional. Your browser may send audio to its speech provider; Macro Mint does not save the recording.</p>
        {items.length>0&&<ol className="mm-assisted-items">{items.map((item,index)=><li key={index}>
          <span><strong>{item.original}</strong><small>Search: {item.searchTerm}{item.amountText? ` · ${item.amountText} unconfirmed`:""}</small></span>
          <button type="button" onClick={()=>onFind(item.searchTerm)}>Find</button>
        </li>)}</ol>}
      </div>
    </details>
  );
}
