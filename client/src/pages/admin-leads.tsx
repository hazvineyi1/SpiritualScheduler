import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Inbox, MessageSquareHeart } from "lucide-react";

const BG      = "#f5efe0";
const BORDER  = "#c9b896";
const GN      = "#2d4a3a";
const DARK    = "#1c1712";

interface Lead {
  id: number;
  name: string;
  contact: string;
  country: string;
  message: string;
  createdAt: string;
}

interface FeedbackEntry {
  id: number;
  name: string;
  message: string;
  createdAt: string;
}

export default function AdminLeads() {
  const [key, setKey] = useState("");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [feedback, setFeedback] = useState<FeedbackEntry[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const [leadsRes, feedbackRes] = await Promise.all([
        fetch("/api/leads", { headers: { "x-admin-key": key } }),
        fetch("/api/feedback", { headers: { "x-admin-key": key } }),
      ]);
      const leadsJson = await leadsRes.json();
      const feedbackJson = await feedbackRes.json();
      if (!leadsJson.success) throw new Error(leadsJson.error || "Failed to load");
      setLeads(leadsJson.data);
      setFeedback(feedbackJson.success ? feedbackJson.data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: BG, color: DARK }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/"><p className="text-xs flex items-center gap-1 mb-6" style={{ color: "#9a8e7e" }}><ChevronLeft className="h-3.5 w-3.5" /> Back to African Spiritual Hub</p></Link>

        {leads === null ? (
          <>
            <h1 className="text-xl font-semibold mb-1" style={{ color: DARK }}>Admin</h1>
            <p className="text-sm mb-6" style={{ color: "#6b5f4a" }}>Interest form submissions and trial-user feedback.</p>
            <form onSubmit={load} className="bg-white rounded-xl border p-6 max-w-sm space-y-3" style={{ borderColor: BORDER }}>
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Admin key</Label>
                <Input type="password" value={key} onChange={e => setKey(e.target.value)} required />
              </div>
              {error && <p className="text-xs" style={{ color: "#b05050" }}>{error}</p>}
              <Button type="submit" className="w-full text-white" style={{ background: GN }} disabled={loading}>
                {loading ? "Checking…" : "View Submissions"}
              </Button>
            </form>
          </>
        ) : (
          <div className="space-y-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Inbox className="h-4 w-4" style={{ color: GN }} />
                <h2 className="text-lg font-semibold" style={{ color: DARK }}>Interest Form Submissions</h2>
              </div>
              <p className="text-xs mb-4" style={{ color: "#9a8e7e" }}>Healers who left their details, not yet signed up. {leads.length} submission{leads.length !== 1 ? "s" : ""}</p>
              {leads.length === 0 ? (
                <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: BORDER }}>
                  <p className="text-sm" style={{ color: "#6b5f4a" }}>No submissions yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leads.map(l => (
                    <div key={l.id} className="bg-white rounded-xl border p-4" style={{ borderColor: BORDER }}>
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-semibold" style={{ color: DARK }}>{l.name}</p>
                        <p className="text-[11px]" style={{ color: "#9a8e7e" }}>{new Date(l.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="text-xs mb-1" style={{ color: "#6b5f4a" }}>{l.contact}{l.country ? ` · ${l.country}` : ""}</p>
                      {l.message && <p className="text-xs mt-2 italic" style={{ color: "#8a7d6b" }}>"{l.message}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquareHeart className="h-4 w-4" style={{ color: GN }} />
                <h2 className="text-lg font-semibold" style={{ color: DARK }}>Trial-User Feedback</h2>
              </div>
              <p className="text-xs mb-4" style={{ color: "#9a8e7e" }}>Suggestions from people trying the platform out. {(feedback ?? []).length} note{(feedback ?? []).length !== 1 ? "s" : ""}</p>
              {(feedback ?? []).length === 0 ? (
                <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: BORDER }}>
                  <p className="text-sm" style={{ color: "#6b5f4a" }}>No feedback yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(feedback ?? []).map(f => (
                    <div key={f.id} className="bg-white rounded-xl border p-4" style={{ borderColor: BORDER }}>
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-semibold" style={{ color: DARK }}>{f.name || "Anonymous"}</p>
                        <p className="text-[11px]" style={{ color: "#9a8e7e" }}>{new Date(f.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#6b5f4a" }}>{f.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
