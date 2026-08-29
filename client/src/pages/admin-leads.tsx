import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Inbox } from "lucide-react";

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

export default function AdminLeads() {
  const [key, setKey] = useState("");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/leads", { headers: { "x-admin-key": key } });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load");
      setLeads(json.data);
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

        <h1 className="text-xl font-semibold mb-1" style={{ color: DARK }}>Interest Form Submissions</h1>
        <p className="text-sm mb-6" style={{ color: "#6b5f4a" }}>Healers who left their details on the marketing page, not yet signed up.</p>

        {leads === null ? (
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
        ) : leads.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: BORDER }}>
            <Inbox className="h-6 w-6 mx-auto mb-3" style={{ color: "#9a8e7e" }} />
            <p className="text-sm" style={{ color: "#6b5f4a" }}>No submissions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "#9a8e7e" }}>{leads.length} submission{leads.length !== 1 ? "s" : ""}</p>
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
    </div>
  );
}
