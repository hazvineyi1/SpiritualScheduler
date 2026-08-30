import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, CheckCircle2, MessageSquareHeart } from "lucide-react";

const BG      = "#f5efe0";
const BORDER  = "#c9b896";
const GN      = "#2d4a3a";
const DARK    = "#1c1712";

export default function Feedback() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/feedback", { name, message });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Something went wrong");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: BG }}>
      <div className="w-full max-w-md">
        <Link href="/"><p className="text-xs flex items-center gap-1 mb-4" style={{ color: "#9a8e7e" }}><ChevronLeft className="h-3.5 w-3.5" /> Back to African Spiritual Hub</p></Link>

        <div className="bg-white rounded-xl border p-6 sm:p-8" style={{ borderColor: BORDER }}>
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-3" style={{ color: GN }} />
              <h3 className="text-lg font-semibold mb-1.5" style={{ color: DARK }}>Thank you — this really helps.</h3>
              <p className="text-sm" style={{ color: "#6b5f4a" }}>We read every message and it goes straight into what we build next.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquareHeart className="h-4 w-4" style={{ color: GN }} />
                <h1 className="text-lg font-semibold" style={{ color: DARK }}>What would make this better for you?</h1>
              </div>
              <p className="text-xs mb-5" style={{ color: "#6b5f4a" }}>
                You're one of the first to actually use this — anything you'd like to see added, changed, or fixed helps shape where we take it next.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Your name (optional)</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. VaShava" />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>What would you like to see?</Label>
                  <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Anything at all — a feature, a fix, something confusing…" rows={5} required />
                </div>
                {error && <p className="text-xs" style={{ color: "#b05050" }}>{error}</p>}
                <Button type="submit" className="w-full text-white" style={{ background: GN }} disabled={submitting}>
                  {submitting ? "Sending…" : "Send Feedback"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
