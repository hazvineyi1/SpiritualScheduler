import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft } from "lucide-react";

const BG     = "#f5efe0";
const HERO   = "#e6d7b3";
const BORDER = "#c9b896";
const GN     = "#2d4a3a";
const DARK   = "#1c1712";

export default function Signup() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ slug: "", name: "", email: "", password: "", whatsapp: "", tagline: "", location: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setForm(f => ({ ...f, [k]: k === "slug" ? v.toLowerCase().replace(/[^a-z0-9-]/g, "") : v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/healers", form);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Could not create your hub");
      navigate(`/${form.slug}/dashboard`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <Link href="/"><p className="text-xs flex items-center gap-1 mb-4" style={{ color: "#9a8e7e" }}><ChevronLeft className="h-3.5 w-3.5" /> Back to African Spiritual Hub</p></Link>
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#a2532e" }}>African Spiritual Hub</p>
          <h1 className="text-xl font-semibold" style={{ color: DARK }}>List Your Practice</h1>
          <p className="text-xs mt-1" style={{ color: "#8a7d6b" }}>Get your own independent booking hub, separate from every other practitioner on the platform.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border space-y-4" style={{ borderColor: BORDER }}>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Your name</Label>
            <Input value={form.name} onChange={set("name")} placeholder="e.g. Mbuya Nyasha" required />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Hub address</Label>
            <div className="flex items-center text-xs rounded-md border overflow-hidden" style={{ borderColor: BORDER }}>
              <span className="px-2 py-2" style={{ background: HERO, color: "#8a7d6b" }}>africanspiritualhub.com/</span>
              <input value={form.slug} onChange={set("slug")} placeholder="your-name" required
                className="flex-1 px-2 py-2 text-sm outline-none" />
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Email</Label>
            <Input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Password</Label>
            <Input type="password" value={form.password} onChange={set("password")} placeholder="At least 6 characters" required minLength={6} />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>WhatsApp number</Label>
            <Input value={form.whatsapp} onChange={set("whatsapp")} placeholder="263771234567" required />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Tagline (optional)</Label>
            <Input value={form.tagline} onChange={set("tagline")} placeholder="e.g. Ancestral wisdom for modern life" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Location (optional)</Label>
            <Input value={form.location} onChange={set("location")} placeholder="e.g. Harare, Zimbabwe" />
          </div>

          {error && <p className="text-xs" style={{ color: "#b05050" }}>{error}</p>}

          <Button type="submit" className="w-full text-white" style={{ background: GN }} disabled={submitting}>
            {submitting ? "Creating your hub…" : "Create My Hub"}
          </Button>
          <p className="text-center text-[11px]" style={{ color: "#9a8e7e" }}>
            You'll start with a short example catalog you can edit anytime from your dashboard.
          </p>
        </form>
      </div>
    </div>
  );
}
