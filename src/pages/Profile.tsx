import { useState, useEffect } from "react";
import { ChevronRight, LogOut } from "lucide-react";
import { calculateCyclePhase } from "@/utils/cycle";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import FactorsPicker, { FACTOR_LABELS } from "@/components/FactorsPicker";

const CARNATION_LABELS: Record<string, string> = {
  très_claire: "Très claire",
  claire: "Claire",
  beige_doré: "Beige dorée",
  olive_caramel: "Olive-Caramel",
  foncée: "Foncée",
  ébène: "Ébène",
};

const CARNATION_COLORS: Record<string, string> = {
  très_claire: "#F5E6D8",
  claire: "#EAC9A8",
  beige_doré: "#C8924F",
  olive_caramel: "#A0622A",
  foncée: "#6B3A1F",
  ébène: "#2C1810",
};

const CYCLE_OPTIONS: { label: string; value: "unknown" | "none" }[] = [
  { label: "Je ne sais pas", value: "unknown" },
  { label: "Pas de règles", value: "none" },
];

// ─── Composants locaux ────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-6 mb-1 px-1">
    {children}
  </p>
);

type RowProps = {
  label: string;
  subtitle?: string;
  value?: string;
  onClick?: () => void;
  destructive?: boolean;
  badge?: string;
  swatchColor?: string;
  wrapValue?: boolean;
};

const Row = ({ label, subtitle, value, onClick, destructive, badge, swatchColor, wrapValue }: RowProps) => {
  const clickable = !!onClick;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className={`w-full flex ${wrapValue || subtitle ? "items-start" : "items-center"} justify-between gap-x-2 py-3 border-b border-border/20 last:border-b-0 text-left transition-colors ${clickable ? "hover:bg-muted/5 active:bg-muted/10" : "cursor-default"}`}
    >
      <div className="flex-shrink-0">
        <span className={`text-[14px] block ${destructive ? "text-red-500" : "text-foreground"}`}>
          {label}
        </span>
        {subtitle && (
          <span className="text-[12px] text-muted-foreground block mt-0.5">{subtitle}</span>
        )}
      </div>
      <div className={`flex items-center gap-2 ${wrapValue ? "min-w-0" : ""}`}>
        {badge && (
          <span className="text-xs bg-[#593914]/60 text-white px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {swatchColor && (
          <span
            className="w-4 h-4 rounded-full border border-border/40 flex-shrink-0"
            style={{ backgroundColor: swatchColor }}
          />
        )}
        {value && (
          <span
            className={
              wrapValue
                ? "text-[13px] text-muted-foreground text-right whitespace-normal break-words"
                : "text-[13px] text-muted-foreground max-w-[140px] truncate text-right"
            }
          >
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [skinType, setSkinType] = useState("");
  const [skinProblems, setSkinProblems] = useState<string[]>([]);
  const [skinGoals, setSkinGoals] = useState<string[]>([]);
  const [carnation, setCarnation] = useState<string | null>(null);
  const [lastPeriodDate, setLastPeriodDate] = useState<string | null>(null);
  const [cycleDuration, setCycleDuration] = useState<number>(28);
  const [cycleStatus, setCycleStatus] = useState<"unknown" | "none" | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [defaultFactors, setDefaultFactors] = useState<string[]>([]);
  const [factorsOpen, setFactorsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editingField, setEditingField] = useState<
    "name" | "type" | "problems" | "goals" | "cycle" | "carnation" | "age" | null
  >(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const meta = session.user.user_metadata as any;
        if (meta?.first_name) setFirstName(meta.first_name);
        if (meta?.last_name) setLastName(meta.last_name);
        const { data } = await (supabase as any)
          .from("profiles")
          .select("first_name, last_name, skin_type, skin_problems, skin_goals, carnation, last_period_date, cycle_duration, age, default_factors")
          .eq("id", session.user.id)
          .single();
        if (data) {
          if (data.first_name) setFirstName(data.first_name);
          if (data.last_name) setLastName(data.last_name);
          if (data.skin_type) setSkinType(data.skin_type);
          if (data.skin_problems) setSkinProblems(data.skin_problems);
          if (data.skin_goals) setSkinGoals(data.skin_goals);
          if (data.carnation) setCarnation(data.carnation);
          if (data.last_period_date) setLastPeriodDate(data.last_period_date);
          if (data.cycle_duration) setCycleDuration(data.cycle_duration);
          if (data.age) setAge(data.age);
          if (data.default_factors) {
            setDefaultFactors(
              Object.entries(data.default_factors as Record<string, boolean>)
                .filter(([, active]) => active)
                .map(([key]) => key)
            );
          }
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
          first_name: firstName,
          last_name: lastName,
          skin_type: skinType,
          skin_problems: skinProblems,
          skin_goals: skinGoals,
          carnation: carnation,
          age: age,
          last_period_date: lastPeriodDate,
          cycle_duration: cycleDuration,
        }).eq("id", session.user.id);
        await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName } });
        toast.success("Profil mis à jour");
        setEditingField(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur de sauvegarde");
    }
    setSaving(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmed || deleting) return;
    setDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Vous devez être connecté(e) pour envoyer cette demande");
      setDeleting(false);
      return;
    }
    const { error } = await (supabase as any).from("feedback").insert({
      user_id: session.user.id,
      type: "deletion_request",
      message: `Demande de suppression de compte et de données (${[firstName, lastName].filter(Boolean).join(" ") || session.user.email || session.user.id}).`,
    });
    setDeleting(false);
    if (error) {
      console.error(error);
      toast.error("Erreur lors de l'envoi, réessayez");
      return;
    }
    toast.success("Demande de suppression envoyée");
    setDeleteOpen(false);
    setDeleteConfirmed(false);
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
    : cycleStatus === "unknown"
      ? "Je ne sais pas"
      : cycleStatus === "none"
        ? "Pas de règles"
        : "–";
  return (
    <div className="min-h-screen pb-32 max-w-lg mx-auto bg-background">

      {/* Header */}
      <div className="bg-primary px-6 pt-14 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-display text-primary-foreground truncate">
              {[firstName, lastName].filter(Boolean).join(" ") || "Mon profil"}
            </h1>

          </div>
          <button
            onClick={handleLogout}
            className="ml-auto flex-shrink-0 text-primary-foreground/40 hover:text-primary-foreground/70 transition-colors p-2 -mr-2"
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
          <Row label="Type de peau" value={skinType || "–"} onClick={() => setEditingField("type")} />
          <Row label="Carnation" value={carnationLabel} swatchColor={carnation ? CARNATION_COLORS[carnation] : undefined} onClick={() => setEditingField("carnation")} />
          <Row label="Âge" value={age != null ? `${age} ans` : "–"} onClick={() => setEditingField("age")} />
          <Row label="Sensibilités" value={skinProblems.join(", ") || "Aucune"} onClick={() => setEditingField("problems")} />
          <Row label="Objectifs" value={skinGoals.join(", ") || "Aucun"} onClick={() => setEditingField("goals")} />
        </div>

        <SectionTitle>MON QUOTIDIEN</SectionTitle>
        <div>
          <Row label="Mon cycle" value={cycleValue} onClick={() => setEditingField("cycle")} />
          <Row
            label="Mes facteurs"
            value={defaultFactors.length > 0 ? defaultFactors.map(k => FACTOR_LABELS[k] ?? k).join(", ") : "Aucun"}
            wrapValue
            onClick={() => setFactorsOpen(true)}
          />
        </div>

        <SectionTitle>MON SUIVI</SectionTitle>
        <div>
          <Row label="Passeport de peau" onClick={() => navigate("/passport/preview")} />
        </div>


        <SectionTitle>COMPTE</SectionTitle>
        <div>
          <Row label="Modifier mon profil" value={[firstName, lastName].filter(Boolean).join(" ") || "–"} onClick={() => setEditingField("name")} />
          <Row
            label="Feedback et suggestions"
            subtitle="Bugs, idées, retours d'usage"
            onClick={() => navigate("/profile/feedback")}
          />
          <Row label="Confidentialité" onClick={() => navigate("/rgpd")} />
          <Row
            label="Supprimer mes données"
            onClick={() => setDeleteOpen(true)}
          />
          <Row label="Se déconnecter" onClick={handleLogout} destructive />
        </div>

        <SectionTitle>AUTRE</SectionTitle>
        <div>
          <Row label="À propos" onClick={() => navigate("/about")} />
          <Row label="Version" badge="Bêta" value={`v${__APP_VERSION__}`} />
        </div>

      </div>

      {/* Dialog édition — logique conservée + 2 nouveaux modes */}
      <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
        <DialogContent className="max-w-sm rounded-[40px] border-none bg-background premium-shadow p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-display text-foreground italic">
              {editingField === "name" && "Mon profil"}
              {editingField === "type" && "Nature de peau"}
              {editingField === "problems" && "Sensibilités"}
              {editingField === "goals" && "Mes priorités"}
              {editingField === "cycle" && "Mon cycle"}
              {editingField === "carnation" && "Carnation"}
              {editingField === "age" && "Âge"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            {editingField === "name" && (
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Votre prénom"
                  className="h-16 rounded-[24px] bg-muted/20 border-none text-lg font-display italic px-6 focus:ring-1 ring-primary/20"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
                <Input
                  type="text"
                  placeholder="Votre nom"
                  className="h-16 rounded-[24px] bg-muted/20 border-none text-lg font-display italic px-6 focus:ring-1 ring-primary/20"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
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
                    onChange={(e) => {
                      setLastPeriodDate(e.target.value || null);
                      setCycleStatus(null);
                    }}
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
                <div className="flex gap-3">
                  {CYCLE_OPTIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setLastPeriodDate(null);
                        setCycleStatus(value);
                      }}
                      className={`flex-1 py-4 rounded-[24px] border text-[11px] font-bold uppercase tracking-widest transition-all ${cycleStatus === value ? "bg-primary text-primary-foreground border-primary premium-shadow scale-[1.02]" : "bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {editingField === "carnation" && (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(CARNATION_LABELS).map(([key, label]) => (
                  <button key={key} onClick={() => setCarnation(key)}
                    className={`flex items-center justify-center gap-2 py-5 rounded-[24px] border text-[11px] font-bold uppercase tracking-widest transition-all ${carnation === key ? "bg-primary text-primary-foreground border-primary premium-shadow scale-[1.02]" : "bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20"}`}>
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: CARNATION_COLORS[key] }} />
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

      {/* Dialog "Mes facteurs" */}
      <Dialog open={factorsOpen} onOpenChange={setFactorsOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto rounded-[40px] border-none bg-background premium-shadow p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-display text-foreground italic">Ton quotidien</DialogTitle>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
              Glisse vers Nacre ce qui façonne ta peau
            </p>
          </DialogHeader>
          <FactorsPicker
            initialSelected={defaultFactors}
            onDone={(selected) => {
              setDefaultFactors(selected);
              setFactorsOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Sheet "Supprimer mes données" */}
      <Sheet
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteConfirmed(false);
        }}
      >
        <SheetContent
          side="bottom"
          className="flex flex-col gap-6 max-w-lg mx-auto rounded-t-[40px] border-none bg-background premium-shadow p-8 [&>button]:hidden"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="text-2xl font-display text-foreground italic">Supprimer mes données</SheetTitle>
          </SheetHeader>

          <p className="text-[14px] leading-[1.4] text-muted-foreground">
            Votre profil de peau, votre historique de cycle et vos routines seront supprimés sous 30 jours. Cette action est définitive et ne peut pas être annulée.
          </p>

          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={deleteConfirmed}
              onCheckedChange={(checked) => setDeleteConfirmed(checked === true)}
              className="mt-0.5 size-5 rounded-[4px] border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="text-[14px] font-medium text-foreground">
              Je comprends que cette action est irréversible
            </span>
          </label>

          <div>
            <Button
              onClick={handleConfirmDelete}
              disabled={!deleteConfirmed || deleting}
              variant="destructive"
              className="w-full disabled:opacity-100 disabled:bg-border/30 disabled:text-[hsl(var(--text-disabled))] disabled:shadow-none"
            >
              {deleting ? "Envoi…" : "Confirmer la suppression"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Profile;
