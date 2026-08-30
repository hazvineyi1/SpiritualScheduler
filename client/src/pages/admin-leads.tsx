import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Inbox, MessageSquareHeart, MapPin } from "lucide-react";

const BG      = "#f5efe0";
const BORDER  = "#c9b896";
const GN      = "#2d4a3a";
const DARK    = "#1c1712";

interface Lead {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  createdAt: string;
}

interface FeedbackEntry {
  id: number;
  name: string;
  message: string;
  createdAt: string;
}

interface VisitEntry {
  id: number;
  path: string;
  city: string;
  country: string;
  startedAt: string;
  lastSeenAt: string;
}

function formatDuration(startedAt: string, lastSeenAt: string): string {
  const ms = new Date(lastSeenAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return "just landed";
  const totalSeconds = Math.round(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export default function AdminLeads() {
  const [key, setKey] = useState("");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [feedback, setFeedback] = useState<FeedbackEntry[] | null>(null);
  const [visits, setVisits] = useState<VisitEntry[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const [leadsRes, feedbackRes, visitsRes] = await Promise.all([
        fetch("/api/leads", { headers: { "x-admin-key": key } }),
        fetch("/api/feedback", { headers: { "x-admin-key": key } }),
        fetch("/api/visits", { headers: { "x-admin-key": key } }),
      ]);
      const leadsJson = await leadsRes.json();
      const feedbackJson = await feedbackRes.json();
      const visitsJson = await visitsRes.json();
      if (!leadsJson.success) throw new Error(leadsJson.error || "Failed to load");
      setLeads(leadsJson.data);
      setFeedback(feedbackJson.success ? feedbackJson.data : []);
      setVisits(visitsJson.success ? visitsJson.data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: BG, color: DARK }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        {leads === null ? (
          <>
            <h1 className="text-xl font-semibold mb-1" style={{ color: DARK }}>Admin</h1>
            <p className="text-sm mb-6" style={{ color: "#6b5f4a" }}>Interest form submissions, trial-user feedback, and visit activity.</p>
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
                <MapPin className="h-4 w-4" style={{ color: GN }} />
                <h2 className="text-lg font-semibold" style={{ color: DARK }}>Visit Activity</h2>
              </div>
              <p className="text-xs mb-4" style={{ color: "#9a8e7e" }}>
                Who's viewed the demo hubs and marketing pages, from where, and roughly how long they stayed.
                {" "}{(visits ?? []).length} visit{(visits ?? []).length !== 1 ? "s" : ""}
              </p>
              {(visits ?? []).length === 0 ? (
                <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: BORDER }}>
                  <p className="text-sm" style={{ color: "#6b5f4a" }}>No visits recorded yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                  <div className="grid grid-cols-4 gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "#f0ece0", color: "#9a8e7e" }}>
                    <span>Page</span>
                    <span>Location</span>
                    <span>When</span>
                    <span>Duration</span>
                  </div>
                  <div className="divide-y" style={{ borderColor: BORDER }}>
                    {(visits ?? []).map(v => (
                      <div key={v.id} className="grid grid-cols-4 gap-2 px-4 py-2.5 text-xs items-center">
                        <span className="font-medium truncate" style={{ color: DARK }}>{v.path}</span>
                        <span style={{ color: "#6b5f4a" }}>{v.city || v.country ? `${v.city}${v.city && v.country ? ", " : ""}${v.country}` : "Unknown"}</span>
                        <span style={{ color: "#8a7d6b" }}>{new Date(v.startedAt).toLocaleString()}</span>
                        <span style={{ color: "#8a7d6b" }}>{formatDuration(v.startedAt, v.lastSeenAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
                      <p className="text-xs mb-1" style={{ color: "#6b5f4a" }}>{l.email} · {l.whatsapp}</p>
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
