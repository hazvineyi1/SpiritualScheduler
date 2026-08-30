import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, Plus, Trash2, UserCog, ShoppingBag, Loader2 } from "lucide-react";
import type { Reading, Product, SessionFormat } from "@shared/types";
import { AFRICAN_COUNTRIES } from "@shared/countries";

const HERO   = "#e6d7b3";
const BORDER = "#c9b896";
const GN     = "#2d4a3a";
const DARK   = "#1c1712";
const GOLD   = "#a2532e";

const ALL_FORMATS: { value: SessionFormat; label: string }[] = [
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "chat", label: "Live Chat" },
  { value: "async", label: "Async" },
  { value: "in_person", label: "In-Person" },
];

interface HealerProfile {
  name: string;
  tagline: string;
  location: string;
  whatsapp: string;
  avatarUrl: string;
  headerImageUrl: string;
  shopEnabled: boolean;
  country: string;
  readings: Reading[];
  products: Product[];
}

export default function HubSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: healer, isLoading } = useQuery<HealerProfile>({
    queryKey: ["/api/profile"],
  });

  const [profile, setProfile] = useState({ name: "", tagline: "", location: "", whatsapp: "", avatarUrl: "", headerImageUrl: "", shopEnabled: true, country: "" });
  const [readings, setReadings] = useState<Reading[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);

  // Load fetched data into local editable draft state once available.
  useEffect(() => {
    if (!healer) return;
    setProfile({
      name: healer.name || "", tagline: healer.tagline || "", location: healer.location || "",
      whatsapp: healer.whatsapp || "", avatarUrl: healer.avatarUrl || "", headerImageUrl: healer.headerImageUrl || "",
      shopEnabled: healer.shopEnabled ?? true, country: healer.country || "",
    });
    setReadings(healer.readings || []);
    setProducts(healer.products || []);
  }, [healer]);

  const saveProfile = async () => {
    if (!profile.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSavingProfile(true);
    try {
      const res = await apiRequest("PUT", "/api/profile", profile);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save profile");
      qc.invalidateQueries({ queryKey: ["/api/profile"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile saved" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to save", variant: "destructive" });
    } finally { setSavingProfile(false); }
  };

  const saveCatalog = async () => {
    for (const r of readings) {
      if (!r.name.trim() || !r.category.trim() || !r.price || r.price <= 0) {
        toast({ title: "Check your readings", description: "Every reading needs a name, category, and a price greater than 0.", variant: "destructive" }); return;
      }
      if (r.formats.length === 0) {
        toast({ title: "Check your readings", description: `"${r.name || "A reading"}" needs at least one session format selected.`, variant: "destructive" }); return;
      }
    }
    for (const p of products) {
      if (!p.name.trim() || !p.price || p.price <= 0) {
        toast({ title: "Check your products", description: "Every product needs a name and a price greater than 0.", variant: "destructive" }); return;
      }
    }
    setSavingCatalog(true);
    try {
      const res = await apiRequest("PUT", "/api/catalog", { readings, products });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save catalog");
      setReadings(json.data.readings);
      setProducts(json.data.products);
      qc.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Catalog saved", description: "Your storefront is now updated." });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to save", variant: "destructive" });
    } finally { setSavingCatalog(false); }
  };

  const addReading = () => setReadings(prev => [...prev, {
    id: -Date.now(), name: "", category: prev[0]?.category || "General", price: 20,
    description: "", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false,
  }]);
  const updateReading = (i: number, patch: Partial<Reading>) =>
    setReadings(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const toggleFormat = (i: number, f: SessionFormat) =>
    setReadings(prev => prev.map((r, idx) => idx === i
      ? { ...r, formats: r.formats.includes(f) ? r.formats.filter(x => x !== f) : [...r.formats, f] }
      : r));
  const removeReading = (i: number) => setReadings(prev => prev.filter((_, idx) => idx !== i));

  const addProduct = () => setProducts(prev => [...prev, { id: -Date.now(), name: "", price: 20, description: "" }]);
  const updateProduct = (i: number, patch: Partial<Product>) =>
    setProducts(prev => prev.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  const removeProduct = (i: number) => setProducts(prev => prev.filter((_, idx) => idx !== i));

  if (isLoading) {
    return <div className="flex items-center justify-center py-16" style={{ color: "#9a8e7e" }}><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading your hub…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Profile / branding */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: BORDER }}>
        <div className="px-4 py-2.5 flex items-center gap-2 border-b bg-white" style={{ borderColor: BORDER }}>
          <UserCog className="h-4 w-4" style={{ color: GN }} />
          <span className="text-sm font-medium" style={{ color: DARK }}>Hub Profile</span>
        </div>
        <div className="p-4 bg-white space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Display name</Label>
              <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>WhatsApp number</Label>
              <Input value={profile.whatsapp} onChange={e => setProfile(p => ({ ...p, whatsapp: e.target.value }))} placeholder="263771234567" />
              <p className="text-[11px] mt-1.5 leading-snug" style={{ color: "#9a8e7e" }}>
                This is the number your hub connects to — clients message you here, and it's where booking
                confirmations and "start session" messages go out from. No separate WhatsApp setup needed:
                just make sure this number, with country code and no spaces or +, has WhatsApp on it.
              </p>
              {profile.whatsapp && (
                <a
                  href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] underline inline-block mt-1"
                  style={{ color: GN }}
                >
                  Test it — open a chat to this number on WhatsApp ↗
                </a>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Tagline</Label>
            <Input value={profile.tagline} onChange={e => setProfile(p => ({ ...p, tagline: e.target.value }))} placeholder="e.g. Where Ancient Wisdom Meets Modern Healing" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Location</Label>
            <Input value={profile.location} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Harare, Zimbabwe · worldwide" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Country you align with</Label>
            <Select value={profile.country} onValueChange={v => setProfile(p => ({ ...p, country: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {AFRICAN_COUNTRIES.map(c => (
                  <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] mt-1" style={{ color: "#b0a898" }}>This is how clients find your hub on the map.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Avatar image URL</Label>
              <Input value={profile.avatarUrl} onChange={e => setProfile(p => ({ ...p, avatarUrl: e.target.value }))} placeholder="https://…" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Header banner image URL</Label>
              <Input value={profile.headerImageUrl} onChange={e => setProfile(p => ({ ...p, headerImageUrl: e.target.value }))} placeholder="https://…" />
            </div>
          </div>
          <p className="text-[11px]" style={{ color: "#b0a898" }}>Paste a link to an image hosted elsewhere. Direct upload isn't available yet.</p>
          <Button size="sm" className="text-white gap-1.5" style={{ background: GN }} onClick={saveProfile} disabled={savingProfile}>
            <Save className="h-3.5 w-3.5" /> {savingProfile ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </div>

      {/* Readings editor */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: BORDER }}>
        <div className="px-4 py-2.5 flex items-center gap-2 border-b bg-white" style={{ borderColor: BORDER }}>
          <span className="text-sm font-medium" style={{ color: DARK }}>Readings</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full ml-auto" style={{ background: "#f0ece4", color: "#7a6e5e" }}>{readings.length}</span>
        </div>
        <div className="divide-y bg-white" style={{ borderColor: "#f0ece4" }}>
          {readings.map((r, i) => (
            <div key={r.id} className="p-4 space-y-2.5">
              <div className="grid sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <Label className="text-[11px] mb-1 block" style={{ color: "#9a8e7e" }}>Name</Label>
                  <Input value={r.name} onChange={e => updateReading(i, { name: e.target.value })} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block" style={{ color: "#9a8e7e" }}>Price (USD)</Label>
                  <Input type="number" min={1} value={r.price} onChange={e => updateReading(i, { price: Number(e.target.value) })} className="h-8 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-[11px] mb-1 block" style={{ color: "#9a8e7e" }}>Category</Label>
                <Input value={r.category} onChange={e => updateReading(i, { category: e.target.value })} className="h-8 text-sm" placeholder="e.g. Guidance & Consultation" />
              </div>
              <div>
                <Label className="text-[11px] mb-1 block" style={{ color: "#9a8e7e" }}>Description</Label>
                <textarea value={r.description} onChange={e => updateReading(i, { description: e.target.value })}
                  className="w-full rounded-md border px-2.5 py-1.5 text-sm resize-none" style={{ borderColor: BORDER }} rows={2} />
              </div>
              <div>
                <Label className="text-[11px] mb-1.5 block" style={{ color: "#9a8e7e" }}>Available formats</Label>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {ALL_FORMATS.map(f => (
                    <label key={f.value} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: DARK }}>
                      <Checkbox checked={r.formats.includes(f.value)} onCheckedChange={() => toggleFormat(i, f.value)} />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: DARK }}>
                    <Checkbox checked={r.isAdult} onCheckedChange={v => updateReading(i, { isAdult: !!v })} /> 18+ only
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: DARK }}>
                    <Checkbox checked={r.isFixed} onCheckedChange={v => updateReading(i, { isFixed: !!v })} /> Fixed price
                  </label>
                </div>
                <button onClick={() => removeReading(i)} className="text-xs flex items-center gap-1 hover:opacity-70" style={{ color: "#a03030" }}>
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
          {readings.length === 0 && <p className="text-sm text-center py-6" style={{ color: "#9a8e7e" }}>No readings yet. Add your first one below.</p>}
        </div>
        <div className="px-4 py-3 bg-white border-t flex items-center gap-2" style={{ borderColor: BORDER }}>
          <Button size="sm" variant="outline" className="gap-1.5" style={{ borderColor: BORDER, color: GN }} onClick={addReading}>
            <Plus className="h-3.5 w-3.5" /> Add Reading
          </Button>
        </div>
      </div>

      {/* Products editor */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: BORDER }}>
        <div className="px-4 py-2.5 flex items-center gap-2 border-b bg-white" style={{ borderColor: BORDER }}>
          <ShoppingBag className="h-4 w-4" style={{ color: GN }} />
          <span className="text-sm font-medium" style={{ color: DARK }}>Shop Products</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full ml-auto" style={{ background: "#f0ece4", color: "#7a6e5e" }}>{products.length}</span>
        </div>
        <div className="px-4 py-3 border-b bg-white flex items-center justify-between gap-3" style={{ borderColor: "#f0ece4" }}>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: DARK }}>
            <Checkbox checked={profile.shopEnabled} onCheckedChange={v => setProfile(p => ({ ...p, shopEnabled: !!v }))} />
            Show a Shop tab on my storefront
          </label>
          <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0" style={{ borderColor: BORDER, color: GN }} onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save"}
          </Button>
        </div>
        {!profile.shopEnabled && (
          <p className="text-xs px-4 py-2 bg-white" style={{ color: "#b0a898" }}>
            Your shop is hidden from visitors. You can still add and edit products below; they just won't be visible until you turn this back on.
          </p>
        )}
        <div className="divide-y bg-white" style={{ borderColor: "#f0ece4" }}>
          {products.map((p, i) => (
            <div key={p.id} className="p-4 space-y-2.5">
              <div className="grid sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <Label className="text-[11px] mb-1 block" style={{ color: "#9a8e7e" }}>Name</Label>
                  <Input value={p.name} onChange={e => updateProduct(i, { name: e.target.value })} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block" style={{ color: "#9a8e7e" }}>Price (USD)</Label>
                  <Input type="number" min={1} value={p.price} onChange={e => updateProduct(i, { price: Number(e.target.value) })} className="h-8 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-[11px] mb-1 block" style={{ color: "#9a8e7e" }}>Description</Label>
                <textarea value={p.description} onChange={e => updateProduct(i, { description: e.target.value })}
                  className="w-full rounded-md border px-2.5 py-1.5 text-sm resize-none" style={{ borderColor: BORDER }} rows={2} />
              </div>
              <div className="flex justify-end">
                <button onClick={() => removeProduct(i)} className="text-xs flex items-center gap-1 hover:opacity-70" style={{ color: "#a03030" }}>
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="text-sm text-center py-6" style={{ color: "#9a8e7e" }}>No products yet. Add one below.</p>}
        </div>
        <div className="px-4 py-3 bg-white border-t flex items-center gap-2" style={{ borderColor: BORDER }}>
          <Button size="sm" variant="outline" className="gap-1.5" style={{ borderColor: BORDER, color: GN }} onClick={addProduct}>
            <Plus className="h-3.5 w-3.5" /> Add Product
          </Button>
        </div>
      </div>

      <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: HERO, border: `1px solid ${GN}33` }}>
        <p className="text-xs" style={{ color: "#5a5040" }}>Save readings and products together. This updates your live storefront immediately.</p>
        <Button className="text-white gap-1.5 flex-shrink-0" style={{ background: GN }} onClick={saveCatalog} disabled={savingCatalog}>
          <Save className="h-3.5 w-3.5" /> {savingCatalog ? "Saving…" : "Save Catalog"}
        </Button>
      </div>
    </div>
  );
}
