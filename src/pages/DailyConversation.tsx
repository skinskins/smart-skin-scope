import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calculateCyclePhase } from "@/utils/cycle";
import { useRoutineProducts } from "@/hooks/useRoutineProducts";
import { PearlHero } from "@/components/PearlHero";

const FACTOR_PILLS = [
  "Sucré/gras", "Alcool", "Peu d'eau",
  "Stress élevé", "Mauvaise nuit",
  "Sport intense", "Médicament", "Voyage", "Exposition solaire",
];

type Feeling = "En forme" | "Fatiguée" | "Stressée";
type Sleep = "Oui" | "Non" | "Passable";

const bubble = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" } },
};

const PillButton = ({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/30"
    } ${disabled ? "opacity-50 cursor-default" : ""}`}
  >
    {label}
  </button>
);

export default function DailyConversation() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [sleep, setSleep] = useState<Sleep | null>(null);
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(new Set());
  const [factorsDone, setFactorsDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cyclePhase, setCyclePhase] = useState<string | null>(null);
  const [cycleDay, setCycleDay] = useState<number | null>(null);
  const [cycleDuration, setCycleDuration] = useState<number>(28);
  const [isEditMode, setIsEditMode] = useState(false);

  const isMorning = new Date().getHours() < 18;
  const { morning, evening } = useRoutineProducts();
  const routineProducts = (isMorning ? morning : evening).filter(p => p.frequency === "daily");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserName(session?.user?.user_metadata?.first_name ?? null);
      if (!session?.user) return;

      const today = new Date().toISOString().split("T")[0];

      const [profileRes, checkinRes] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("last_period_date, cycle_duration")
          .eq("id", session.user.id)
          .single(),
        (supabase as any)
          .from("daily_checkins")
          .select("stress_level, sleep_hours, food_quality, alcohol_drinks, water_glasses, did_sport, extra_factors")
          .eq("user_id", session.user.id)
          .eq("date", today)
          .maybeSingle(),
      ]);

      if (profileRes.data?.last_period_date) {
        const duration = profileRes.data.cycle_duration ?? 28;
        const calc = calculateCyclePhase(profileRes.data.last_period_date, duration, 5);
        if (calc?.phase) setCyclePhase(calc.phase);
        if (calc?.day) setCycleDay(calc.day);
        setCycleDuration(duration);
      }

      if (checkinRes.data) {
        const c = checkinRes.data;
        setIsEditMode(true);
        setStep(3);

        if (c.stress_level === 1) setFeeling("En forme");
        else if (c.stress_level === 4) setFeeling("Stressée");
        else if (c.sleep_hours === 5) setFeeling("Fatiguée");

        if (c.sleep_hours === 8) setSleep("Oui");
        else if (c.sleep_hours === 6) setSleep("Passable");
        else if (c.sleep_hours === 4) setSleep("Non");

        const factors = new Set<string>();
        if (c.food_quality === "Grasses / Sucrées") factors.add("Sucré/gras");
        if (c.alcohol_drinks >= 1) factors.add("Alcool");
        if (c.water_glasses === 2) factors.add("Peu d'eau");
        if (c.did_sport) factors.add("Sport intense");
        if (c.extra_factors?.medication) factors.add("Médicament");
        if (c.extra_factors?.travel) factors.add("Voyage");
        if (c.extra_factors?.sun_exposure) factors.add("Exposition solaire");
        setSelectedFactors(factors);
      }
    };
    init();
  }, []);

  const skip = () => navigate("/dashboard", { replace: true });

  const handleFeeling = (f: Feeling) => {
    if (!isEditMode && step !== 0) return;
    setFeeling(f);
    if (!isEditMode) setTimeout(() => setStep(1), 320);
  };

  const handleSleep = (s: Sleep) => {
    if (!isEditMode && step !== 1) return;
    setSleep(s);
    if (!isEditMode) setTimeout(() => setStep(2), 320);
  };

  const toggleFactor = (pill: string) => {
    if (factorsDone) return;
    setSelectedFactors(prev => {
      const next = new Set(prev);
      if (next.has(pill)) next.delete(pill); else next.add(pill);
      return next;
    });
  };

  const handleFactorsDone = () => {
    setFactorsDone(true);
    setStep(3);
  };

  const saveCheckin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const today = new Date().toISOString().split("T")[0];
    let stress_level: number | null = null;
    if (feeling === "Stressée" || selectedFactors.has("Stress élevé")) stress_level = 4;
    else if (feeling === "En forme") stress_level = 1;
    let sleep_hours: number | null = null;
    if (sleep === "Non" || selectedFactors.has("Mauvaise nuit")) sleep_hours = 4;
    else if (sleep === "Passable") sleep_hours = 6;
    else if (sleep === "Oui") sleep_hours = 8;
    else if (feeling === "Fatiguée") sleep_hours = 5;
    await (supabase as any).from("daily_checkins").upsert(
      {
        user_id:         session.user.id,
        date:            today,
        stress_level,
        sleep_hours,
        food_quality:    selectedFactors.has("Sucré/gras")       ? "Grasses / Sucrées" : null,
        alcohol_drinks:  selectedFactors.has("Alcool")            ? 1                   : null,
        water_glasses:   selectedFactors.has("Peu d'eau")         ? 2                   : null,
        did_sport:       selectedFactors.has("Sport intense"),
        sport_intensity: selectedFactors.has("Sport intense")     ? "Intense"           : null,
        extra_factors: {
          medication:    selectedFactors.has("Médicament"),
          travel:        selectedFactors.has("Voyage"),
          sun_exposure:  selectedFactors.has("Exposition solaire"),
          new_product:   false,
        },
      },
      { onConflict: "user_id,date" }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await saveCheckin();
    navigate("/dashboard", { replace: true });
  };

  const handleStartRoutine = async () => {
    setSaving(true);
    await saveCheckin();
    navigate("/routine-player");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-14 pb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
            Nacre
          </p>
          <h1 className="text-[26px] mt-1 leading-tight font-display text-foreground">
            Bonjour{userName ? ` ${userName}` : ""}
          </h1>
        </div>
        <button
          onClick={skip}
          className="mt-1 text-sm transition-colors text-muted-foreground"
        >
          Passer
        </button>
      </div>

      {/* Pearl du jour */}
      <AnimatePresence>
        {cyclePhase && cycleDay && (
          <motion.div
            key="pearl"
            variants={bubble}
            initial="hidden"
            animate="visible"
            className="px-5 pb-4"
          >
            <PearlHero
              firstName={userName ?? undefined}
              cyclePhase={cyclePhase as "Folliculaire" | "Ovulatoire" | "Lutéale" | "Menstruelle"}
              cycleDay={cycleDay}
              cycleDuration={cycleDuration}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation */}
      <div className="flex-1 px-6 space-y-9">

        {/* Q1 — Feeling */}
        <motion.div key="q1" variants={bubble} initial="hidden" animate="visible">
          <p className="text-sm mb-3 text-muted-foreground">
            Comment tu te sens ce matin ?
          </p>
          <div className="flex gap-2 flex-wrap">
            {(["En forme", "Fatiguée", "Stressée"] as Feeling[]).map(f => (
              <PillButton
                key={f}
                label={f}
                active={feeling === f}
                disabled={!isEditMode && step > 0 && feeling !== f}
                onClick={() => handleFeeling(f)}
              />
            ))}
          </div>
        </motion.div>

        {/* Q2 — Sleep */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div key="q2" variants={bubble} initial="hidden" animate="visible">
              <p className="text-sm mb-3 text-muted-foreground">
                Tu as bien dormi ?
              </p>
              <div className="flex gap-2">
                {(["Oui", "Non", "Passable"] as Sleep[]).map(s => (
                  <PillButton
                    key={s}
                    label={s}
                    active={sleep === s}
                    disabled={!isEditMode && step > 1 && sleep !== s}
                    onClick={() => handleSleep(s)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Q3 — Factors */}
        <AnimatePresence>
          {step >= 2 && (
            <motion.div key="q3" variants={bubble} initial="hidden" animate="visible">
              <p className="text-sm mb-3 text-muted-foreground">
                Quelque chose à noter ?
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {FACTOR_PILLS.map(pill => (
                  <PillButton
                    key={pill}
                    label={pill}
                    active={selectedFactors.has(pill)}
                    disabled={!isEditMode && factorsDone}
                    onClick={() => toggleFactor(pill)}
                  />
                ))}
              </div>
              {!factorsDone && !isEditMode && (
                <button
                  onClick={handleFactorsDone}
                  className="text-xs transition-colors text-muted-foreground"
                >
                  {selectedFactors.size > 0 ? "C'est tout →" : "Rien à noter aujourd'hui"}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Routine + CTAs */}
      <AnimatePresence>
        {step >= 3 && (
          <motion.div
            key="cta"
            variants={bubble}
            initial="hidden"
            animate="visible"
            className="px-6 pt-6 pb-28 space-y-3"
          >
            {/* Section routine */}
            {routineProducts.length > 0 && (
              <div className="rounded-2xl p-4 space-y-3 mb-1 bg-muted/20">
                <p className="text-[11px] uppercase tracking-[0.14em] font-medium text-muted-foreground">
                  {isMorning ? "Routine du matin" : "Routine du soir"}
                </p>
                {routineProducts.map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    {p.photo_url ? (
                      <img
                        src={p.photo_url}
                        alt={p.product_name}
                        className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-muted/20">
                        <span className="text-muted-foreground text-base">✦</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">
                        {p.product_name}
                      </p>
                      <p className="text-[11px] truncate text-muted-foreground">
                        {p.brand}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bouton primaire — Commencer la routine */}
            {routineProducts.length > 0 && (
              <button
                onClick={handleStartRoutine}
                disabled={saving}
                className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 premium-shadow hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? "Un instant…" : <>Commencer ma routine <ChevronRight size={18} /></>}
              </button>
            )}

            {/* Bouton secondaire — Voir ma perle */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 border border-border/60 text-muted-foreground hover:text-primary hover:border-primary"
            >
              {saving ? "Un instant…" : <>Voir ma perle <ChevronRight size={16} /></>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
