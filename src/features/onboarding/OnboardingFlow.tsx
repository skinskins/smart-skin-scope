import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Plus, Check, ImageOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Design tokens ────────────────────────────────────────────────
const BG = "#F0EBE3";
const PRIMARY = "#2C1810";
const MUTED = "#8B7355";
const INPUT_BG = "#FAF6F2";
const INPUT_BORDER = "#C4A98A";
const SERIF = { fontFamily: "Georgia, serif" };

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

// ─── Shared layout ────────────────────────────────────────────────
function Screen({ children, step }: { children: React.ReactNode; step: number }) {
  const showCounter = step >= 1 && step <= 4;
  return (
    <div className="min-h-screen flex flex-col overflow-y-auto" style={{ background: BG }}>
      {showCounter && (
        <div className="flex items-center justify-between px-6 pt-10 pb-4 flex-shrink-0">
          <span className="text-xs font-mono" style={{ color: MUTED }}>ÉTAPE {step}/4</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 20 : 6,
                  backgroundColor: i <= step ? PRIMARY : "#D4C4B0",
                }}
              />
            ))}
          </div>
        </div>
      )}
      {!showCounter && <div className="pt-10" />}
      {children}
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="flex items-center gap-2 mb-8 px-6" style={{ color: MUTED }}>
      <ArrowLeft size={16} />
      <span className="text-xs font-mono">Retour</span>
    </button>
  );
}

function CTAButton({ label, onClick, disabled, loading }: {
  label: string; onClick: () => void; disabled?: boolean; loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-4 font-semibold text-sm transition-opacity disabled:opacity-40"
      style={{ background: PRIMARY, color: "#FAF6F2", borderRadius: 50 }}
    >
      {loading ? "Chargement..." : label}
    </button>
  );
}

function SkipLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-xs font-mono text-center underline" style={{ color: MUTED }}>
      {label}
    </button>
  );
}

function PillButton({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="px-4 py-2 text-sm font-medium transition-all"
      style={{
        borderRadius: 50,
        border: `1.5px solid ${selected ? PRIMARY : "#C4A98A"}`,
        background: selected ? PRIMARY : INPUT_BG,
        color: selected ? "#FAF6F2" : MUTED,
      }}
    >
      {label}
    </button>
  );
}

function GridButton({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="py-3 text-sm font-medium transition-all"
      style={{
        borderRadius: 10,
        border: `1.5px solid ${selected ? PRIMARY : "#C4A98A"}`,
        background: selected ? PRIMARY : INPUT_BG,
        color: selected ? "#FAF6F2" : PRIMARY,
      }}
    >
      {label}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono font-bold tracking-[0.15em] mb-3" style={{ color: MUTED }}>
      {children}
    </p>
  );
}

function OBFSearchResult({ result, added, onAdd }: {
  result: { key: string; product_name: string; brand: string | null; photo_url: string | null };
  added: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b" style={{ borderColor: "#E8DDD5" }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#EDE8E3" }}>
        {result.photo_url ? (
          <img src={result.photo_url} alt="" className="w-full h-full object-contain rounded-lg"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : <ImageOff size={14} color={MUTED} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: PRIMARY }}>{result.product_name}</p>
        {result.brand && <p className="text-xs truncate" style={{ color: MUTED }}>{result.brand}</p>}
      </div>
      <button
        onClick={onAdd}
        disabled={added}
        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-all"
        style={{
          borderRadius: 50,
          background: added ? "#E8DDD5" : PRIMARY,
          color: added ? MUTED : "#FAF6F2",
        }}
      >
        {added ? <Check size={12} /> : <Plus size={12} />}
        {added ? "Ajouté" : "Ajouter"}
      </button>
    </div>
  );
}

// ─── Screen 0 — Intro ─────────────────────────────────────────────
function ScreenIntro({ onNext, onLogin }: { onNext: () => void; onLogin: () => void }) {
  return (
    <Screen step={0}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center min-h-[80vh]">
        {/* TODO: add pearl illustration */}
        <div className="w-32 h-32 rounded-full mb-10" style={{ background: "#E8DDD5" }} />

        <p className="text-[10px] font-mono tracking-[0.3em] mb-4" style={{ color: MUTED }}>NACRE</p>

        <h1 className="text-4xl font-bold mb-6 leading-snug" style={{ ...SERIF, color: PRIMARY }}>
          Votre peau,{"\n"}comprise
        </h1>

        <p className="text-sm leading-relaxed mb-16" style={{ color: MUTED }}>
          Une perle met 5 ans à se former.{"\n"}
          Votre peau aussi a besoin de temps{"\n"}
          pour vraiment changer.
        </p>

        <div className="w-full max-w-xs flex flex-col gap-4">
          <CTAButton label="Commencer →" onClick={onNext} />
          <button onClick={onLogin} className="text-xs font-mono underline" style={{ color: MUTED }}>
            Déjà un compte ? Se connecter
          </button>
        </div>
      </div>
    </Screen>
  );
}

// ─── Screen 1 — Peau (3 sub-steps) ───────────────────────────────
function ScreenPeau({ data, onChange, onNext, onBack }: {
  data: Collected;
  onChange: (patch: Partial<Collected>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [sub, setSub] = useState<"a" | "b" | "c">("a");

  const toggle = (key: "skinProblems" | "skinGoals", val: string) => {
    const arr = data[key] as string[];
    onChange({ [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] });
  };

  const handleBack = () => {
    if (sub === "a") onBack();
    else if (sub === "b") setSub("a");
    else setSub("b");
  };

  // 1a — Type de peau
  if (sub === "a") {
    return (
      <Screen step={1}>
        <div className="px-6 pb-16">
          <BackButton onBack={handleBack} />
          <h2 className="text-3xl font-bold leading-snug mb-2" style={{ ...SERIF, color: PRIMARY }}>
            La nacre se forme{"\n"}autour d'une irritation
          </h2>
          <p className="text-sm mb-10" style={{ color: MUTED }}>
            Comprendre ce qui agresse votre peau, c'est le premier pas.
          </p>
          <SectionLabel>TYPE DE PEAU</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {["Mixte", "Grasse", "Sèche", "Sensible", "Acnéique", "Normale"].map((t) => (
              <GridButton
                key={t}
                label={t}
                selected={data.skinType === t}
                onSelect={() => { onChange({ skinType: t }); setSub("b"); }}
              />
            ))}
          </div>
        </div>
      </Screen>
    );
  }

  // 1b — Préoccupations + Objectifs
  if (sub === "b") {
    return (
      <Screen step={1}>
        <div className="px-6 pb-32">
          <BackButton onBack={handleBack} />
          <h2 className="text-3xl font-bold leading-snug mb-8" style={{ ...SERIF, color: PRIMARY }}>
            Vos priorités
          </h2>
          <SectionLabel>PRÉOCCUPATIONS</SectionLabel>
          <div className="flex flex-wrap gap-2 mb-8">
            {["Acné", "Taches", "Rides", "Rougeurs", "Déshydratation", "Cernes", "Eczéma", "Points noirs"].map((p) => (
              <PillButton key={p} label={p} selected={data.skinProblems.includes(p)} onToggle={() => toggle("skinProblems", p)} />
            ))}
          </div>
          <SectionLabel>OBJECTIFS</SectionLabel>
          <div className="flex flex-wrap gap-2 mb-8">
            {["Hydratation", "Éclat", "Anti-âge", "Anti-imperfections", "Apaiser", "Pores"].map((g) => (
              <PillButton key={g} label={g} selected={data.skinGoals.includes(g)} onToggle={() => toggle("skinGoals", g)} />
            ))}
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4" style={{ background: BG }}>
          <CTAButton label="Suivant →" onClick={() => setSub("c")} />
        </div>
      </Screen>
    );
  }

  // 1c — État de départ
  const baselineRow = (label: string, options: string[], field: keyof Collected) => (
    <div className="mb-5">
      <p className="text-xs font-mono mb-2" style={{ color: MUTED }}>{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <GridButton key={opt} label={opt} selected={data[field] === opt} onSelect={() => onChange({ [field]: opt })} />
        ))}
      </div>
    </div>
  );

  return (
    <Screen step={1}>
      <div className="px-6 pb-32">
        <BackButton onBack={handleBack} />
        <h2 className="text-3xl font-bold leading-snug mb-2" style={{ ...SERIF, color: PRIMARY }}>
          Votre point de départ
        </h2>
        <p className="text-sm italic mb-10" style={{ color: MUTED }}>
          Votre baseline — on mesurera l'évolution depuis aujourd'hui
        </p>
        {baselineRow("Acné aujourd'hui", ["Légère", "Modérée", "Forte"], "acneBaseline")}
        {baselineRow("Rougeurs aujourd'hui", ["Légères", "Modérées", "Fortes"], "rednessBaseline")}
        {baselineRow("Sécheresse aujourd'hui", ["Légère", "Modérée", "Forte"], "drynessBaseline")}
      </div>
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4" style={{ background: BG }}>
        <CTAButton label="Suivant →" onClick={onNext} />
      </div>
    </Screen>
  );
}

// ─── Screen 2 — Cycle ─────────────────────────────────────────────
function ScreenCycle({ data, onChange, onNext, onBack }: {
  data: Collected;
  onChange: (patch: Partial<Collected>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <Screen step={2}>
      <div className="px-6 pb-32">
        <BackButton onBack={onBack} />

        <h2 className="text-3xl font-bold leading-snug mb-2" style={{ ...SERIF, color: PRIMARY }}>
          Votre peau suit{"\n"}ses propres rythmes
        </h2>
        <p className="text-sm mb-3" style={{ color: MUTED }}>
          Le cycle menstruel influence directement votre peau.{"\n"}
          C'est l'une des clés pour mieux la comprendre.
        </p>
        <p className="text-xs italic mb-10" style={{ color: MUTED }}>
          Ces données restent strictement privées et ne sont jamais partagées.
        </p>

        {/* Last period */}
        <SectionLabel>DERNIÈRES RÈGLES</SectionLabel>
        <input
          type="date"
          value={data.lastPeriodDate}
          onChange={(e) => onChange({ lastPeriodDate: e.target.value })}
          max={new Date().toISOString().split("T")[0]}
          className="w-full px-4 py-3 text-sm mb-8 focus:outline-none"
          style={{
            background: INPUT_BG, border: `1.5px solid ${INPUT_BORDER}`,
            borderRadius: 10, color: PRIMARY,
          }}
        />

        {/* Cycle duration */}
        <SectionLabel>DURÉE DU CYCLE — {data.cycleDuration} JOURS</SectionLabel>
        <input
          type="range"
          min={21}
          max={35}
          value={data.cycleDuration}
          onChange={(e) => onChange({ cycleDuration: parseInt(e.target.value) })}
          className="w-full mb-2"
          style={{ accentColor: PRIMARY }}
        />
        <div className="flex justify-between text-xs font-mono" style={{ color: MUTED }}>
          <span>21j</span>
          <span>35j</span>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 flex flex-col gap-3" style={{ background: BG }}>
        <CTAButton label="Suivant →" onClick={onNext} />
        <SkipLink label="Passer" onClick={onNext} />
      </div>
    </Screen>
  );
}

// ─── Screen 3 — Routine ───────────────────────────────────────────
function ScreenRoutine({ data, onChange, onNext, onBack }: {
  data: Collected;
  onChange: (patch: Partial<Collected>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addedNames = new Set(data.selectedProducts.map((p) => p.product_name.toLowerCase()));

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data: catalogRows } = await (supabase as any)
          .from("user_products")
          .select("id, product_name, brand, product_type, photo_url, ingredients, open_beauty_facts_id")
          .is("user_id", null)
          .or(`product_name.ilike.%${query}%,brand.ilike.%${query}%`)
          .limit(8);

        const catalog = (catalogRows ?? []).map((r: any) => ({
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
      } catch {
        // silent fail
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleAdd = (r: any) => {
    if (addedNames.has(r.product_name.toLowerCase())) return;
    onChange({ selectedProducts: [...data.selectedProducts, r] });
  };

  const handleRemove = (name: string) => {
    onChange({ selectedProducts: data.selectedProducts.filter((p) => p.product_name !== name) });
  };

  return (
    <Screen step={3}>
      <div className="px-6 pb-40">
        <BackButton onBack={onBack} />

        <h2 className="text-3xl font-bold leading-snug mb-2" style={{ ...SERIF, color: PRIMARY }}>
          Chaque couche{"\n"}de nacre compte
        </h2>
        <p className="text-sm mb-1" style={{ color: MUTED }}>
          Vos produits sont les premiers gestes de ce suivi.
        </p>
        <p className="text-xs italic mb-8" style={{ color: MUTED }}>(Optionnel)</p>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full pl-10 pr-4 py-3 text-sm focus:outline-none"
            style={{
              background: INPUT_BG, border: `1.5px solid ${INPUT_BORDER}`,
              borderRadius: 10, color: PRIMARY,
            }}
          />
        </div>

        {/* Results */}
        {(searching || results.length > 0) && (
          <div className="mb-6 rounded-xl overflow-hidden" style={{ border: `1px solid #D4C4B0` }}>
            {searching && (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: PRIMARY }} />
              </div>
            )}
            {!searching && results.map((r) => (
              <OBFSearchResult
                key={r.key}
                result={r}
                added={addedNames.has(r.product_name.toLowerCase())}
                onAdd={() => handleAdd(r)}
              />
            ))}
          </div>
        )}

        {/* Added products */}
        {data.selectedProducts.length > 0 && (
          <div>
            <SectionLabel>PRODUITS AJOUTÉS</SectionLabel>
            <div className="flex flex-col gap-2">
              {data.selectedProducts.map((p) => (
                <div key={p.product_name} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: PRIMARY }}>{p.product_name}</p>
                    {p.brand && <p className="text-xs truncate" style={{ color: MUTED }}>{p.brand}</p>}
                  </div>
                  <button onClick={() => handleRemove(p.product_name)} className="flex-shrink-0 p-1" style={{ color: MUTED }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 flex flex-col gap-3" style={{ background: BG }}>
        <CTAButton label="Suivant →" onClick={onNext} />
        <SkipLink label="Passer — j'ajouterai plus tard" onClick={onNext} />
      </div>
    </Screen>
  );
}

// ─── Screen 4 — Compte ────────────────────────────────────────────
function ScreenCompte({ data, onChange, onNext, onBack }: {
  data: Collected;
  onChange: (patch: Partial<Collected>) => void;
  onNext: () => void;
  onBack: () => void;
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
      // 1. Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { first_name: data.firstName } },
      });

      if (authError) {
        toast.error(authError.message.includes("already") ? "Cet email est déjà utilisé." : authError.message);
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) { toast.error("Erreur inattendue."); setLoading(false); return; }

      const today = new Date().toISOString().split("T")[0];

      // 2. Batch write: profiles + skin_symptoms + user_products
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
              user_id: userId,
              date: today,
              acne_trend: baselineMap[data.acneBaseline] ?? null,
              redness_trend: baselineMap[data.rednessBaseline] ?? null,
              dryness_trend: baselineMap[data.drynessBaseline] ?? null,
            }, { onConflict: "user_id,date" })
          : Promise.resolve(),

        ...data.selectedProducts.map((p) =>
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
    <Screen step={4}>
      <div className="px-6 pb-40">
        <BackButton onBack={onBack} />

        <h2 className="text-3xl font-bold leading-snug mb-2" style={{ ...SERIF, color: PRIMARY }}>
          Plus qu'une étape
        </h2>
        <p className="text-sm mb-8" style={{ color: MUTED }}>
          Créez votre espace sécurisé pour sauvegarder votre profil.
        </p>

        {/* Privacy card */}
        <div className="mb-8 p-4 rounded-xl" style={{
          background: INPUT_BG,
          borderLeft: `3px solid ${INPUT_BORDER}`,
          border: `1px solid ${INPUT_BORDER}`,
        }}>
          <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
            Vos données sont privées et ne seront jamais vendues ni partagées sans votre consentement.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {[
            { label: "Prénom", key: "firstName" as const, type: "text", placeholder: "Votre prénom" },
            { label: "Email", key: "email" as const, type: "email", placeholder: "email@exemple.com" },
            { label: "Mot de passe", key: "password" as const, type: "password", placeholder: "8 caractères minimum" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <p className="text-[10px] font-mono tracking-[0.15em] mb-2" style={{ color: MUTED }}>{label.toUpperCase()}</p>
              <input
                type={type}
                placeholder={placeholder}
                value={data[key] as string}
                onChange={(e) => onChange({ [key]: e.target.value })}
                className="w-full px-4 py-3 text-sm focus:outline-none"
                style={{
                  background: INPUT_BG, border: `1.5px solid ${INPUT_BORDER}`,
                  borderRadius: 10, color: PRIMARY,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4" style={{ background: BG }}>
        <CTAButton label="Créer mon espace →" onClick={handleCreate} disabled={!valid} loading={loading} />
      </div>
    </Screen>
  );
}

// ─── Screen 5 — Confirmation ──────────────────────────────────────
function ScreenConfirmation({ firstName, onFinish }: { firstName: string; onFinish: () => void }) {
  return (
    <Screen step={5}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center min-h-[85vh]">
        {/* TODO: add pearl illustration */}
        <div className="w-24 h-24 rounded-full mb-10" style={{ background: "#D4C4B0" }} />

        <h2 className="text-3xl font-bold leading-snug mb-4" style={{ ...SERIF, color: PRIMARY }}>
          Aujourd'hui, {firstName ? `${firstName}, ` : ""}vous avez{"\n"}posé une première couche
        </h2>
        <p className="text-sm leading-relaxed mb-16" style={{ color: MUTED }}>
          Demain, vous continuerez.{"\n"}Et cette fois, vous verrez la différence.
        </p>

        <div className="w-full max-w-xs">
          <CTAButton label="Voir mon espace →" onClick={onFinish} />
        </div>
      </div>
    </Screen>
  );
}

// ─── Main flow ────────────────────────────────────────────────────
export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [collected, setCollected] = useState<Collected>(EMPTY);

  const patch = (p: Partial<Collected>) => setCollected((c) => ({ ...c, ...p }));

  const next = () => setStep((s) => s + 1);
  const back = () => {
    if (step === 0) navigate("/login");
    else setStep((s) => s - 1);
  };

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: "tween", duration: 0.25 }}
        className="min-h-screen"
      >
        {step === 0 && <ScreenIntro onNext={next} onLogin={() => navigate("/login")} />}
        {step === 1 && <ScreenPeau data={collected} onChange={patch} onNext={next} onBack={back} />}
        {step === 2 && <ScreenCycle data={collected} onChange={patch} onNext={next} onBack={back} />}
        {step === 3 && <ScreenRoutine data={collected} onChange={patch} onNext={next} onBack={back} />}
        {step === 4 && <ScreenCompte data={collected} onChange={patch} onNext={next} onBack={back} />}
        {step === 5 && (
          <ScreenConfirmation
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
