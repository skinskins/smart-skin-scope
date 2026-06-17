import { useState, useEffect } from "react";
import { ChevronRight, LogOut } from "lucide-react";
import { calculateCyclePhase } from "@/utils/cycle";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CARNATION_LABELS: Record<string, string> = {
  très_claire:   "Très claire",
  claire:        "Claire",
  beige_doré:    "Beige dorée",
  olive_caramel: "Olive-Caramel",
  foncée:        "Foncée",
  ébène:         "Ébène",
};

// ─── Composants locaux ────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-6 mb-1 px-1">
    {children}
  </p>
);

type RowProps = {
  label: string;
  value?: string;
  onClick?: () => void;
  destructive?: boolean;
  badge?: string;
};

const Row = ({ label, value, onClick, destructive, badge }: RowProps) => {
  const clickable = !!onClick;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className={`w-full flex items-center justify-between py-3 border-b border-border/20 last:border-b-0 text-left transition-colors ${clickable ? "hover:bg-muted/5 active:bg-muted/10" : "cursor-default"}`}
    >
      <span className={`text-[14px] ${destructive ? "text-red-500" : "text-foreground"}`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {value && (
          <span className="text-[13px] text-muted-foreground max-w-[140px] truncate text-right">
            {value}
          </span>
        )}
        {clickable && !badge && (
          <ChevronRight size={15} className="text-muted-foreground/50 flex-shrink-0" />
        )}
      </div>
    </button>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const Profile = () => {
  const navigate = useNavigate();
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [firstName,      setFirstName]      = useState("");
  const [skinType,       setSkinType]       = useState("");
  const [skinProblems,   setSkinProblems]   = useState<string[]>([]);
  const [skinGoals,      setSkinGoals]      = useState<string[]>([]);
  const [carnation,      setCarnation]      = useState<string | null>(null);
  const [lastPeriodDate, setLastPeriodDate] = useState<string | null>(null);
  const [cycleDuration,  setCycleDuration]  = useState<number>(28);
  const [age,            setAge]            = useState<number | null>(null);

  const [editingField, setEditingField] = useState<
    "name" | "type" | "problems" | "goals" | "cycle" | "carnation" | "age" | null
  >(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await (supabase as any)
          .from("profiles")
          .select("first_name, skin_type, skin_problems, skin_goals, carnation, last_period_date, cycle_duration, age")
          .eq("id", session.user.id)
          .single();
        if (data) {
          if (data.first_name)      setFirstName(data.first_name);
          if (data.skin_type)       setSkinType(data.skin_type);
          if (data.skin_problems)   setSkinProblems(data.skin_problems);
          if (data.skin_goals)      setSkinGoals(data.skin_goals);
          if (data.carnation)       setCarnation(data.carnation);
          if (data.last_period_date) setLastPeriodDate(data.last_period_date);
          if (data.cycle_duration)  setCycleDuration(data.cycle_duration);
          if (data.age)             setAge(data.age);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const toggleProblem = (prob: string) =>
    setSkinProblems(prev => prev.includes(prob) ? prev.filter(p => p !== prob) : [...prev, prob]);

  const toggleGoal = (goal: string) =>
    setSkinGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await (supabase as any).from("profiles").update({
          first_name:      firstName,
          skin_type:       skinType,
          skin_problems:   skinProblems,
          skin_goals:      skinGoals,
          carnation:       carnation,
          age:             age,
          last_period_date: lastPeriodDate,
          cycle_duration:  cycleDuration,
        }).eq("id", session.user.id);
        await supabase.auth.updateUser({ data: { first_name: firstName } });
        toast.success("Profil mis à jour");
        setEditingField(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur de sauvegarde");
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("guestProfile");
    navigate("/onboarding");
  };

  const cycleCalc = lastPeriodDate
    ? calculateCyclePhase(lastPeriodDate, cycleDuration, 5)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = firstName ? firstName[0].toUpperCase() : "?";
  const carnationLabel = carnation ? (CARNATION_LABELS[carnation] ?? carnation) : "–";
  const cycleValue = cycleCalc
    ? `${cycleCalc.phase} · Jour ${cycleCalc.day}`
    : "–";
  const lastPeriodValue = lastPeriodDate
    ? new Date(lastPeriodDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : "–";

  return (
    <div className="min-h-screen pb-32 max-w-lg mx-auto bg-background">

      {/* Header sombre */}
      <div className="bg-slate-900 px-6 pt-14 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-display text-white truncate">
              {firstName || "Mon profil"}
            </h1>
            {skinType && (
              <p className="text-[13px] text-white/50 mt-0.5">{skinType}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="ml-auto flex-shrink-0 text-white/40 hover:text-white/70 transition-colors p-2 -mr-2"
            aria-label="Se déconnecter"
          >
            <LogOut size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Sections liste */}
      <div className="px-5">

        <SectionTitle>MA PEAU</SectionTitle>
        <div>
          <Row label="Type de peau"  value={skinType || "–"}          onClick={() => setEditingField("type")} />
          <Row label="Carnation"     value={carnationLabel}            onClick={() => setEditingField("carnation")} />
          <Row label="Âge"           value={age != null ? `${age} ans` : "–"} onClick={() => setEditingField("age")} />
          <Row label="Sensibilités"  value={skinProblems.join(", ") || "Aucune"} onClick={() => setEditingField("problems")} />
          <Row label="Objectifs"     value={skinGoals.join(", ") || "Aucun"}     onClick={() => setEditingField("goals")} />
        </div>

        <SectionTitle>MON CYCLE</SectionTitle>
        <div>
          <Row label="Phase actuelle"   value={cycleValue}                          onClick={() => setEditingField("cycle")} />
          <Row label="Durée du cycle"   value={`${cycleDuration} jours`}            onClick={() => setEditingField("cycle")} />
          <Row label="Dernières règles" value={lastPeriodValue}                     onClick={() => setEditingField("cycle")} />
        </div>

        <SectionTitle>MON QUOTIDIEN</SectionTitle>
        <div>
          <Row label="Mes facteurs" value="Modifier" onClick={() => navigate("/onboarding/factors")} />
        </div>

        <SectionTitle>MON SUIVI</SectionTitle>
        <div>
          <Row label="Passeport de peau" onClick={() => navigate("/passport/preview")} />
        </div>

        <SectionTitle>ABONNEMENT</SectionTitle>
        <div>
          <Row label="Plan actuel"          value="Beta gratuite" />
          <Row label="Renouvellement"       value="—" />
          <Row label="Gérer mon abonnement" badge="À venir" />
        </div>

        <SectionTitle>CONNEXIONS</SectionTitle>
        <div>
          <Row label="Cycle (Flo / Clue)"  value="Non connecté" />
          <Row label="Accessoires beauté"  value="Gérer →" onClick={() => navigate("/vanity")} />
          <Row label="Diagnostic pro"      value="Importer un PDF" onClick={() => navigate("/vanity")} />
        </div>

        <SectionTitle>AIDE</SectionTitle>
        <div>
          <Row label="Soumettre un bug"          onClick={() => window.open("mailto:bugs@nacre.app")} />
          <Row label="Suggérer une amélioration" onClick={() => window.open("mailto:suggestions@nacre.app")} />
        </div>

        <SectionTitle>COMPTE</SectionTitle>
        <div>
          <Row label="Modifier mon profil" onClick={() => setEditingField("name")} />
          <Row label="Confidentialité"     onClick={() => navigate("/privacy")} />
          <Row label="Se déconnecter"      onClick={handleLogout} destructive />
        </div>

      </div>

      {/* Dialog édition — logique conservée + 2 nouveaux modes */}
      <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
        <DialogContent className="max-w-sm rounded-[40px] border-none bg-background premium-shadow p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-display text-foreground italic">
              {editingField === "name"      && "Prénom"}
              {editingField === "type"      && "Nature de peau"}
              {editingField === "problems"  && "Sensibilités"}
              {editingField === "goals"     && "Mes priorités"}
              {editingField === "cycle"     && "Mon cycle"}
              {editingField === "carnation" && "Carnation"}
              {editingField === "age"       && "Âge"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            {editingField === "name" && (
              <Input
                type="text"
                placeholder="Votre prénom"
                className="h-16 rounded-[24px] bg-muted/20 border-none text-lg font-display italic px-6 focus:ring-1 ring-primary/20"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
              />
            )}

            {editingField === "type" && (
              <div className="grid grid-cols-2 gap-3">
                {["Sèche", "Grasse", "Mixte", "Normale", "Sensible", "Acnéique"].map(type => (
                  <button key={type} onClick={() => setSkinType(type)}
                    className={`py-5 rounded-[24px] border text-[11px] font-bold uppercase tracking-widest transition-all ${skinType === type ? "bg-primary text-primary-foreground border-primary premium-shadow scale-[1.02]" : "bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20"}`}>
                    {type}
                  </button>
                ))}
              </div>
            )}

            {editingField === "problems" && (
              <div className="grid grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1">
                {["Acné", "Rougeurs", "Taches", "Points noirs", "Déshydratation", "Rides", "Cernes", "Eczéma"].map(prob => (
                  <button key={prob} onClick={() => toggleProblem(prob)}
                    className={`py-5 rounded-[24px] border text-[11px] font-bold uppercase tracking-widest transition-all ${skinProblems.includes(prob) ? "bg-primary text-primary-foreground border-primary premium-shadow scale-[1.02]" : "bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20"}`}>
                    {prob}
                  </button>
                ))}
              </div>
            )}

            {editingField === "goals" && (
              <div className="grid grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1">
                {["Hydratation", "Anti-âge", "Éclat / Glow", "Anti-imperfections", "Apaiser", "Taches", "Pores", "Anti-cernes"].map(goal => (
                  <button key={goal} onClick={() => toggleGoal(goal)}
                    className={`py-5 rounded-[24px] border text-[11px] font-bold uppercase tracking-widest transition-all ${skinGoals.includes(goal) ? "bg-primary text-primary-foreground border-primary premium-shadow scale-[1.02]" : "bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20"}`}>
                    {goal}
                  </button>
                ))}
              </div>
            )}

            {editingField === "cycle" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">
                    Date des dernières règles
                  </label>
                  <Input
                    type="date"
                    className="h-16 rounded-[24px] bg-muted/20 border-none text-lg font-display px-6 focus:ring-1 ring-primary/20 w-full"
                    value={lastPeriodDate || ""}
                    onChange={(e) => setLastPeriodDate(e.target.value || null)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">
                    Durée du cycle (jours)
                  </label>
                  <Input
                    type="number"
                    min={15}
                    max={45}
                    className="h-16 rounded-[24px] bg-muted/20 border-none text-lg font-display px-6 focus:ring-1 ring-primary/20 w-full"
                    value={cycleDuration}
                    onChange={(e) => setCycleDuration(parseInt(e.target.value) || 28)}
                  />
                </div>
              </div>
            )}

            {editingField === "carnation" && (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(CARNATION_LABELS).map(([key, label]) => (
                  <button key={key} onClick={() => setCarnation(key)}
                    className={`py-5 rounded-[24px] border text-[11px] font-bold uppercase tracking-widest transition-all ${carnation === key ? "bg-primary text-primary-foreground border-primary premium-shadow scale-[1.02]" : "bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20"}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {editingField === "age" && (
              <Input
                type="number"
                min={13}
                max={99}
                placeholder="Votre âge"
                className="h-16 rounded-[24px] bg-muted/20 border-none text-lg font-display px-6 focus:ring-1 ring-primary/20"
                value={age ?? ""}
                onChange={(e) => setAge(parseInt(e.target.value) || null)}
                autoFocus
              />
            )}
          </div>

          <div className="pt-8">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full h-16 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
