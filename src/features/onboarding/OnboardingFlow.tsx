import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Plus, Check, ImageOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Figma design tokens (Nacre_Amira / node 135-5871) ───────────
const BG_INTRO = "#f2f2f7";   // intro + confirmation screens
const BG      = "#ffffff";    // all content steps
const PRIMARY = "#2c180f";    // CTA, selected state
const TEXT    = "#18181b";    // primary text
const MUTED   = "#737373";    // secondary / hint text
const PILL_BG = "#f0ebe3";    // unselected pill background
const PILL_TEXT = "#0a0a0a";  // unselected pill text
const MANROPE = "'Manrope', 'DM Sans', sans-serif";
const OPEN_SANS = "'Open Sans', system-ui, sans-serif";

// ─── Types ────────────────────────────────────────────────────────
interface SelectedProduct {
  source: "catalog" | "obf";
  catalogId?: string;
  product_name: string;
  brand: string | null;
  product_type: string | null;
  photo_url: string | null;
  ingredients: string | null;
  open_beauty_facts_id: string | null;
}

interface Collected {
  skinType: string;
  skinProblems: string[];
  skinGoals: string[];
  acneBaseline: string;
  rednessBaseline: string;
  drynessBaseline: string;
  lastPeriodDate: string;
  cycleDuration: number;
  selectedProducts: SelectedProduct[];
  firstName: string;
  email: string;
  password: string;
}

const EMPTY: Collected = {
  skinType: "", skinProblems: [], skinGoals: [],
  acneBaseline: "", rednessBaseline: "", drynessBaseline: "",
  lastPeriodDate: "", cycleDuration: 28,
  selectedProducts: [],
  firstName: "", email: "", password: "",
};

// ─── Shared primitives ────────────────────────────────────────────

function NavBar({ step, onBack, onClose }: {
  step: number; onBack: () => void; onClose: () => void;
}) {
  const TOTAL = 5;
  return (
    <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0">
      <button onClick={onBack} className="p-2 -ml-2">
        <ArrowLeft size={20} color={TEXT} strokeWidth={2} />
      </button>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: TOTAL }, (_, i) => (
          <div
            key={i}
            style={{
              height: 6,
              borderRadius: 3,
              width: i === step - 1 ? 20 : 6,
              background: i < step ? PRIMARY : "#ddd5cb",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
      <button onClick={onClose} className="p-2 -mr-2">
        <X size={20} color={MUTED} strokeWidth={2} />
      </button>
    </div>
  );
}

function CTAButton({ label, onClick, disabled, loading }: {
  label: string; onClick: () => void; disabled?: boolean; loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-4 transition-opacity disabled:opacity-40"
      style={{
        background: PRIMARY,
        color: "#ffffff",
        borderRadius: 100,
        fontFamily: MANROPE,
        fontWeight: 700,
        fontSize: 16,
      }}
    >
      {loading ? "Chargement…" : label}
    </button>
  );
}

function GhostButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 text-sm text-center"
      style={{ color: TEXT, fontFamily: MANROPE, fontWeight: 400 }}
    >
      {label}
    </button>
  );
}

function Pill({ label, selected, onToggle }: {
  label: string; selected: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="px-4 py-2 transition-all"
      style={{
        borderRadius: 100,
        background: selected ? PRIMARY : PILL_BG,
        color: selected ? "#fafafa" : PILL_TEXT,
        fontFamily: OPEN_SANS,
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      {label}
    </button>
  );
}

function GridCard({ label, selected, onSelect }: {
  label: string; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="py-3.5 text-sm text-center transition-all"
      style={{
        borderRadius: 12,
        background: selected ? PRIMARY : PILL_BG,
        color: selected ? "#fafafa" : TEXT,
        fontFamily: OPEN_SANS,
        fontSize: 14,
        fontWeight: 400,
      }}
    >
      {label}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm mb-3" style={{ color: MUTED, fontFamily: MANROPE, fontWeight: 400 }}>
      {children}
    </p>
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: MANROPE,
      fontWeight: 500,
      fontSize: 24,
      color: TEXT,
      lineHeight: 1.3,
      marginBottom: 8,
      marginTop: 16,
    }}>
      {children}
    </h2>
  );
}

function StepSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: MUTED, fontSize: 16, lineHeight: 1.5, marginBottom: 28 }}>
      {children}
    </p>
  );
}

// ─── Step 0 — Intro ───────────────────────────────────────────────
function StepIntro({ onNext, onLogin }: { onNext: () => void; onLogin: () => void }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG_INTRO }}>
      {/* Hero image area */}
      <div className="flex-1 relative flex items-center justify-center min-h-[55vh]">
        {/* Pearl placeholder — replace with actual asset */}
        <div
          className="w-52 h-52 rounded-full"
          style={{ background: "radial-gradient(circle at 35% 35%, #e8e0d8, #c4b5a0)" }}
        />
        <div className="absolute top-14 left-0 right-0 flex justify-center">
          <span style={{ fontFamily: MANROPE, fontWeight: 700, fontSize: 18, color: PRIMARY, letterSpacing: "0.2em" }}>
            NACRE
          </span>
        </div>
      </div>

      {/* Footer text + CTAs */}
      <div className="px-6 pt-6 pb-10" style={{ background: BG_INTRO }}>
        <h1 style={{ fontFamily: MANROPE, fontWeight: 700, fontSize: 32, color: TEXT, lineHeight: 1.2, marginBottom: 12 }}>
          Votre peau,<br />comprise
        </h1>
        <p style={{ color: MUTED, fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
          Une perle met 5 ans à se former.<br />
          Votre peau aussi a besoin de temps<br />
          pour vraiment changer.
        </p>
        <div className="flex flex-col gap-3">
          <CTAButton label="Commencer" onClick={onNext} />
          <GhostButton label="Déjà un compte ? Se connecter" onClick={onLogin} />
        </div>
      </div>
    </div>
  );
}

// ─── Step 1 — Peau ────────────────────────────────────────────────
function StepPeau({ data, onChange, onNext, onBack, onClose }: {
  data: Collected;
  onChange: (p: Partial<Collected>) => void;
  onNext: () => void; onBack: () => void; onClose: () => void;
}) {
  const toggle = (key: "skinProblems" | "skinGoals", val: string) => {
    const arr = data[key] as string[];
    onChange({ [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <NavBar step={1} onBack={onBack} onClose={onClose} />

      <div className="flex-1 overflow-y-auto px-5 pb-36">
        <StepTitle>La nacre se forme<br />autour d'une irritation</StepTitle>
        <StepSubtitle>Comprendre ce qui agresse votre peau, c'est le premier pas.</StepSubtitle>

        <Label>Type de peau</Label>
        <div className="grid grid-cols-2 gap-2.5 mb-8">
          {["Mixte", "Grasse", "Sèche", "Sensible", "Acnéique", "Normale"].map(t => (
            <GridCard key={t} label={t} selected={data.skinType === t} onSelect={() => onChange({ skinType: t })} />
          ))}
        </div>

        <Label>Préoccupations</Label>
        <div className="flex flex-wrap gap-2 mb-8">
          {["Acné", "Taches", "Rides", "Rougeurs", "Déshydratation", "Cernes", "Eczéma", "Points noirs"].map(p => (
            <Pill key={p} label={p} selected={data.skinProblems.includes(p)} onToggle={() => toggle("skinProblems", p)} />
          ))}
        </div>

        <Label>Objectifs</Label>
        <div className="flex flex-wrap gap-2">
          {["Hydratation", "Éclat", "Anti-âge", "Anti-imperfections", "Apaiser", "Pores"].map(g => (
            <Pill key={g} label={g} selected={data.skinGoals.includes(g)} onToggle={() => toggle("skinGoals", g)} />
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-3" style={{ background: BG }}>
        <CTAButton label="Suivant" onClick={onNext} />
      </div>
    </div>
  );
}

// ─── Step 2 — Day 0 Check-in ──────────────────────────────────────
function StepCheckin({ data, onChange, onNext, onBack, onClose }: {
  data: Collected;
  onChange: (p: Partial<Collected>) => void;
  onNext: () => void; onBack: () => void; onClose: () => void;
}) {
  const row = (label: string, options: string[], field: keyof Collected) => (
    <div className="mb-7">
      <Label>{label}</Label>
      <div className="grid grid-cols-3 gap-2.5">
        {options.map(opt => (
          <GridCard key={opt} label={opt} selected={data[field] === opt} onSelect={() => onChange({ [field]: opt })} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <NavBar step={2} onBack={onBack} onClose={onClose} />

      <div className="flex-1 overflow-y-auto px-5 pb-36">
        <StepTitle>Votre point de départ</StepTitle>
        <StepSubtitle>Comment est votre peau aujourd'hui ?</StepSubtitle>
        {row("Acné", ["Légère", "Modérée", "Forte"], "acneBaseline")}
        {row("Rougeurs", ["Légères", "Modérées", "Fortes"], "rednessBaseline")}
        {row("Sécheresse", ["Légère", "Modérée", "Forte"], "drynessBaseline")}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-3" style={{ background: BG }}>
        <CTAButton label="Suivant" onClick={onNext} />
      </div>
    </div>
  );
}

// ─── Step 3 — Cycle ───────────────────────────────────────────────
function StepCycle({ data, onChange, onNext, onBack, onClose }: {
  data: Collected;
  onChange: (p: Partial<Collected>) => void;
  onNext: () => void; onBack: () => void; onClose: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <NavBar step={3} onBack={onBack} onClose={onClose} />

      <div className="flex-1 overflow-y-auto px-5 pb-36">
        <StepTitle>Votre peau suit<br />ses propres rythmes</StepTitle>
        <p style={{ color: MUTED, fontSize: 16, lineHeight: 1.5, marginBottom: 6 }}>
          Le cycle menstruel influence directement votre peau.
        </p>
        <p style={{ color: MUTED, fontSize: 13, fontStyle: "italic", marginBottom: 28 }}>
          Ces données restent strictement privées et ne sont jamais partagées.
        </p>

        <Label>Dernières règles</Label>
        <input
          type="date"
          value={data.lastPeriodDate}
          onChange={e => onChange({ lastPeriodDate: e.target.value })}
          max={new Date().toISOString().split("T")[0]}
          className="w-full px-4 py-3 mb-8 focus:outline-none"
          style={{
            background: PILL_BG, border: "none", borderRadius: 12,
            color: TEXT, fontSize: 15, fontFamily: MANROPE,
          }}
        />

        <Label>Durée du cycle — {data.cycleDuration} jours</Label>
        <input
          type="range"
          min={21} max={35}
          value={data.cycleDuration}
          onChange={e => onChange({ cycleDuration: parseInt(e.target.value) })}
          className="w-full mb-2"
          style={{ accentColor: PRIMARY }}
        />
        <div className="flex justify-between text-xs" style={{ color: MUTED, fontFamily: MANROPE }}>
          <span>21 jours</span>
          <span>35 jours</span>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-3 flex flex-col gap-2" style={{ background: BG }}>
        <CTAButton label="Suivant" onClick={onNext} />
        <GhostButton label="Passer" onClick={onNext} />
      </div>
    </div>
  );
}

// ─── Step 4 — Routine ─────────────────────────────────────────────
const PRODUCT_CATEGORIES = ["Tous", "Démaquillant", "Nettoyant", "Hydratant", "SPF", "Sérum", "Masques", "Autre"];

function StepRoutine({ data, onChange, onNext, onBack, onClose }: {
  data: Collected;
  onChange: (p: Partial<Collected>) => void;
  onNext: () => void; onBack: () => void; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addedNames = new Set(data.selectedProducts.map(p => p.product_name.toLowerCase()));

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        let q = (supabase as any)
          .from("user_products")
          .select("id, product_name, brand, product_type, photo_url, ingredients, open_beauty_facts_id")
          .is("user_id", null)
          .or(`product_name.ilike.%${query}%,brand.ilike.%${query}%`)
          .limit(8);
        if (activeCategory !== "Tous") q = q.ilike("product_type", `%${activeCategory}%`);
        const { data: rows } = await q;
        const catalog = (rows ?? []).map((r: any) => ({
          key: `c-${r.id}`, source: "catalog", catalogId: r.id,
          product_name: r.product_name, brand: r.brand,
          product_type: r.product_type, photo_url: r.photo_url,
          ingredients: r.ingredients, open_beauty_facts_id: r.open_beauty_facts_id,
        }));
        let obf: any[] = [];
        if (catalog.length < 3) {
          const res = await fetch(
            `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&tagtype_0=categories&tag_contains_0=contains&tag_0=face-care&json=true&page_size=10`
          );
          const json = await res.json();
          const catalogNames = new Set(catalog.map((r: any) => r.product_name.toLowerCase()));
          obf = (json.products ?? [])
            .filter((p: any) => !!p.product_name && !catalogNames.has(p.product_name.toLowerCase()))
            .slice(0, 5)
            .map((p: any) => ({
              key: `o-${p.code || p.product_name}`, source: "obf",
              product_name: p.product_name, brand: p.brands || null,
              product_type: null, photo_url: p.image_front_url || null,
              ingredients: p.ingredients_text || null, open_beauty_facts_id: p.code || null,
            }));
        }
        setResults([...catalog, ...obf]);
      } catch { /* silent */ }
      finally { setSearching(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, activeCategory]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <NavBar step={4} onBack={onBack} onClose={onClose} />

      <div className="flex-1 overflow-y-auto pb-36">
        <div className="px-5">
          <StepTitle>Chaque couche<br />de nacre compte</StepTitle>
          <p style={{ color: MUTED, fontSize: 16, marginBottom: 4 }}>
            Vos produits sont les premiers gestes de ce suivi.
          </p>
          <p style={{ color: MUTED, fontSize: 13, fontStyle: "italic", marginBottom: 20 }}>(Optionnel)</p>
        </div>

        {/* Category chips — horizontal scroll */}
        <div className="overflow-x-auto px-5 mb-5" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-2" style={{ width: "max-content" }}>
            {PRODUCT_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setQuery(""); }}
                className="px-4 py-2 text-sm whitespace-nowrap transition-all"
                style={{
                  borderRadius: 100,
                  background: activeCategory === cat ? PRIMARY : PILL_BG,
                  color: activeCategory === cat ? "#fafafa" : PILL_TEXT,
                  fontFamily: OPEN_SANS,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5">
          {/* Search bar */}
          <div className="relative mb-4">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full pl-10 pr-4 py-3 focus:outline-none"
              style={{
                background: PILL_BG, border: "none", borderRadius: 12,
                color: TEXT, fontSize: 14, fontFamily: MANROPE,
              }}
            />
          </div>

          {/* Search results */}
          {(searching || results.length > 0) && (
            <div className="mb-5 overflow-hidden" style={{ border: `1px solid #e8e0d8`, borderRadius: 12 }}>
              {searching ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: PRIMARY }} />
                </div>
              ) : results.map(r => (
                <div key={r.key} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: "#e8e0d8" }}>
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: PILL_BG }}>
                    {r.photo_url ? (
                      <img src={r.photo_url} alt="" className="w-full h-full object-contain rounded-xl"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : <ImageOff size={14} color={MUTED} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: TEXT, fontFamily: MANROPE }}>{r.product_name}</p>
                    {r.brand && <p className="text-xs truncate" style={{ color: MUTED }}>{r.brand}</p>}
                  </div>
                  <button
                    onClick={() => {
                      if (!addedNames.has(r.product_name.toLowerCase()))
                        onChange({ selectedProducts: [...data.selectedProducts, r] });
                    }}
                    disabled={addedNames.has(r.product_name.toLowerCase())}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 transition-all disabled:opacity-60"
                    style={{
                      borderRadius: 100,
                      background: addedNames.has(r.product_name.toLowerCase()) ? PILL_BG : PRIMARY,
                      color: addedNames.has(r.product_name.toLowerCase()) ? MUTED : "#fafafa",
                      fontSize: 13, fontFamily: MANROPE, fontWeight: 500,
                    }}
                  >
                    {addedNames.has(r.product_name.toLowerCase()) ? <Check size={12} /> : <Plus size={12} />}
                    <span className="ml-0.5">{addedNames.has(r.product_name.toLowerCase()) ? "Ajouté" : "Ajouter"}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Added products list */}
          {data.selectedProducts.length > 0 && (
            <div>
              <Label>Produits ajoutés</Label>
              <div className="flex flex-col gap-2">
                {data.selectedProducts.map(p => (
                  <div
                    key={p.product_name}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ background: PILL_BG, borderRadius: 12 }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: TEXT, fontFamily: MANROPE }}>{p.product_name}</p>
                      {p.brand && <p className="text-xs truncate" style={{ color: MUTED }}>{p.brand}</p>}
                    </div>
                    <button
                      onClick={() => onChange({ selectedProducts: data.selectedProducts.filter(x => x.product_name !== p.product_name) })}
                    >
                      <X size={14} color={MUTED} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-3 flex flex-col gap-2" style={{ background: BG }}>
        <CTAButton label="Suivant" onClick={onNext} />
        <GhostButton label="Passer — j'ajouterai plus tard" onClick={onNext} />
      </div>
    </div>
  );
}

// ─── Step 5 — Compte ──────────────────────────────────────────────
function StepCompte({ data, onChange, onNext, onBack, onClose }: {
  data: Collected;
  onChange: (p: Partial<Collected>) => void;
  onNext: () => void; onBack: () => void; onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const baselineMap: Record<string, string> = {
    "Légère": "moins", "Légères": "moins",
    "Modérée": "pareil", "Modérées": "pareil",
    "Forte": "plus", "Fortes": "plus",
  };

  const handleCreate = async () => {
    if (!data.email || !data.password || !data.firstName) return;
    if (data.password.length < 8) { toast.error("Mot de passe trop court (8 caractères min.)"); return; }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { first_name: data.firstName } },
      });
      if (authError) {
        toast.error(authError.message.includes("already") ? "Cet email est déjà utilisé." : authError.message);
        return;
      }
      const userId = authData.user?.id;
      if (!userId) { toast.error("Erreur inattendue."); return; }
      const today = new Date().toISOString().split("T")[0];
      await Promise.all([
        (supabase as any).from("profiles").upsert({
          id: userId,
          first_name: data.firstName,
          skin_type: data.skinType || null,
          skin_problems: data.skinProblems.length ? data.skinProblems : null,
          skin_goals: data.skinGoals.length ? data.skinGoals : null,
          last_period_date: data.lastPeriodDate || null,
          cycle_duration: data.cycleDuration || null,
        }),
        (data.acneBaseline || data.rednessBaseline || data.drynessBaseline)
          ? (supabase as any).from("skin_symptoms").upsert({
              user_id: userId, date: today,
              acne_trend: baselineMap[data.acneBaseline] ?? null,
              redness_trend: baselineMap[data.rednessBaseline] ?? null,
              dryness_trend: baselineMap[data.drynessBaseline] ?? null,
            }, { onConflict: "user_id,date" })
          : Promise.resolve(),
        ...data.selectedProducts.map(p =>
          (supabase as any).from("user_products").insert({
            user_id: userId,
            open_beauty_facts_id: p.open_beauty_facts_id,
            product_name: p.product_name,
            brand: p.brand,
            product_type: p.product_type,
            photo_url: p.photo_url,
            ingredients: p.ingredients,
          })
        ),
      ]);
      onNext();
    } catch {
      toast.error("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const valid = data.email.includes("@") && data.password.length >= 8 && data.firstName.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <NavBar step={5} onBack={onBack} onClose={onClose} />

      <div className="flex-1 overflow-y-auto px-5 pb-36">
        <StepTitle>Plus qu'une étape</StepTitle>
        <StepSubtitle>Créez votre espace pour sauvegarder votre profil.</StepSubtitle>

        {/* Privacy note */}
        <div className="mb-8 px-4 py-3" style={{ background: PILL_BG, borderRadius: 12 }}>
          <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.5 }}>
            Vos données sont privées et ne seront jamais vendues ni partagées sans votre consentement.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {([
            { label: "Prénom", key: "firstName" as const, type: "text", placeholder: "Votre prénom" },
            { label: "Email", key: "email" as const, type: "email", placeholder: "email@exemple.com" },
            { label: "Mot de passe", key: "password" as const, type: "password", placeholder: "8 caractères minimum" },
          ] as const).map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <p style={{ color: MUTED, fontSize: 11, fontFamily: MANROPE, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 6 }}>
                {label.toUpperCase()}
              </p>
              <input
                type={type}
                placeholder={placeholder}
                value={data[key]}
                onChange={e => onChange({ [key]: e.target.value })}
                className="w-full px-4 py-3 focus:outline-none"
                style={{
                  background: PILL_BG, border: "none", borderRadius: 12,
                  color: TEXT, fontSize: 15, fontFamily: MANROPE,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-3" style={{ background: BG }}>
        <CTAButton label="Créer mon espace" onClick={handleCreate} disabled={!valid} loading={loading} />
      </div>
    </div>
  );
}

// ─── Step 6 — Confirmation ────────────────────────────────────────
function StepConfirmation({ firstName, onFinish }: { firstName: string; onFinish: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center" style={{ background: BG_INTRO }}>
      {/* Pearl placeholder */}
      <div
        className="w-24 h-24 rounded-full mb-10"
        style={{ background: "radial-gradient(circle at 35% 35%, #e8e0d8, #c4b5a0)" }}
      />
      <h2 style={{ fontFamily: MANROPE, fontWeight: 700, fontSize: 28, color: TEXT, lineHeight: 1.3, marginBottom: 16 }}>
        Aujourd'hui{firstName ? `, ${firstName},` : ""}<br />vous avez posé<br />une première couche
      </h2>
      <p style={{ color: MUTED, fontSize: 16, lineHeight: 1.6, marginBottom: 48 }}>
        Demain, vous continuerez.<br />Et cette fois, vous verrez la différence.
      </p>
      <div className="w-full max-w-xs">
        <CTAButton label="Voir mon espace →" onClick={onFinish} />
      </div>
    </div>
  );
}

// ─── Main orchestrator ────────────────────────────────────────────
export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [collected, setCollected] = useState<Collected>(EMPTY);

  const patch = (p: Partial<Collected>) => setCollected(c => ({ ...c, ...p }));
  const next  = () => setStep(s => s + 1);
  const back  = () => { if (step === 0) navigate("/login"); else setStep(s => s - 1); };
  const close = () => navigate("/login");

  const slide = {
    enter:  { x: 40,  opacity: 0 },
    center: { x: 0,   opacity: 1 },
    exit:   { x: -40, opacity: 0 },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        variants={slide}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: "tween", duration: 0.22 }}
        style={{ minHeight: "100vh" }}
      >
        {step === 0 && <StepIntro onNext={next} onLogin={() => navigate("/login")} />}
        {step === 1 && <StepPeau    data={collected} onChange={patch} onNext={next} onBack={back} onClose={close} />}
        {step === 2 && <StepCheckin data={collected} onChange={patch} onNext={next} onBack={back} onClose={close} />}
        {step === 3 && <StepCycle   data={collected} onChange={patch} onNext={next} onBack={back} onClose={close} />}
        {step === 4 && <StepRoutine data={collected} onChange={patch} onNext={next} onBack={back} onClose={close} />}
        {step === 5 && <StepCompte  data={collected} onChange={patch} onNext={next} onBack={back} onClose={close} />}
        {step === 6 && (
          <StepConfirmation
            firstName={collected.firstName}
            onFinish={() => {
              localStorage.removeItem("guestProfile");
              navigate("/checkin-advice", { state: { isOnboarding: true, firstName: collected.firstName } });
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
