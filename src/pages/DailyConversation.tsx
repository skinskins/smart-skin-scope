import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calculateCyclePhase } from "@/utils/cycle";
import { useRoutineProducts } from "@/hooks/useRoutineProducts";
import { PearlHero } from "@/components/PearlHero";
import { useSaveWeather } from "@/hooks/useSaveWeather";

const MORNING_FACTOR_PILLS = ["Sucré/Gras", "Stress élevé", "Médicament", "Autre"];
const EVENING_FACTOR_PILLS = ["Alcool", "Médicament", "Voyage", "Autre"];

const TYPE_DURATION: Record<string, number> = {
  "démaquillant": 2, "makeup remover": 2, "makeup_remover": 2, "démaquillage": 2,
  "nettoyant": 1, "cleanser": 1, "gel nettoyant": 1,
  "tonique": 1, "toner": 1, "eau tonique": 1, "lotion tonique": 1,
  "sérum": 3, "serum": 3,
  "contour yeux": 2, "eye cream": 2, "eye_cream": 2, "soin contour yeux": 2,
  "hydratant": 2, "moisturizer": 2, "crème hydratante": 2, "crème": 2,
  "huile": 2, "oil": 2, "face oil": 2, "huile visage": 2,
  "spf": 1, "solaire": 1, "sunscreen": 1, "protection solaire": 1,
};

const getDuration = (type: string | null): number =>
  type ? (TYPE_DURATION[type.toLowerCase().trim()] ?? 2) : 2;

type Q1MorningAnswer = "En forme" | "Fatiguée" | "Très fatiguée";
type Q1EveningAnswer = "Bien" | "Stressante" | "Épuisante";
type Q2Answer        = "Oui" | "Non" | "Passable";
type Q3EveningAnswer = "Oui" | "Non" | "Un peu";
type Screen  = "intro" | "chat";
type InciVerdict = { verdict: "danger" | "warning"; reason: string };
type RawIncompat = { product_name: string; action: 'remove' | 'keep'; reason: string };

const fadeUp = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" as const } },
};

// ── Composants ────────────────────────────────────────────────────────────────

const AiBubble = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-start">
    <div className="bg-muted/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[82%]">
      {children}
    </div>
  </div>
);

const UserBubble = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-end">
    <div className="bg-foreground text-background rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[78%] text-sm font-medium">
      {children}
    </div>
  </div>
);

const TypingIndicator = () => (
  <div className="flex justify-center py-2">
    <div className="flex gap-1.5 items-center">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-foreground/30 block"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.5, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  </div>
);

const TypingBubble = () => (
  <div className="flex justify-start">
    <div className="bg-muted/20 rounded-2xl rounded-tl-sm px-4 py-3">
      <div className="flex gap-1.5 items-center">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-foreground/30 block"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.5, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  </div>
);

const PillButton = ({
  label, active, disabled, onClick,
}: {
  label: string; active: boolean; disabled?: boolean; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/30"
    } ${disabled ? "opacity-50 cursor-default" : ""}`}
  >
    {label}
  </button>
);

// ── Composant principal ───────────────────────────────────────────────────────

export default function DailyConversation() {
  const navigate = useNavigate();

  const [userName,        setUserName]        = useState<string | null>(null);
  const [screen,          setScreen]          = useState<Screen>("intro");
  const [step,            setStep]            = useState(0);
  const [typing,          setTyping]          = useState(false);
  const [answerQ1,        setAnswerQ1]        = useState<string | null>(null);
  const [answerQ2,        setAnswerQ2]        = useState<Q2Answer | null>(null);
  const [answerQ3,        setAnswerQ3]        = useState<Q3EveningAnswer | null>(null);
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(new Set());
  const [factorsDone,     setFactorsDone]     = useState(false);
  const [analysisStep,    setAnalysisStep]    = useState<0 | 1 | 2 | 3 | 4>(0);
  const [inciDone,        setInciDone]        = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [cyclePhase,      setCyclePhase]      = useState<string | null>(null);
  const [cycleDay,        setCycleDay]        = useState<number | null>(null);
  const [cycleDuration,   setCycleDuration]   = useState<number>(28);
  const [inciVerdicts,    setInciVerdicts]    = useState<Record<string, InciVerdict>>({});
  const [preComputedRaw,  setPreComputedRaw]  = useState<RawIncompat[] | null>(null);
  const [uvIndex,         setUvIndex]         = useState<number | null>(null);
  const [skinType,        setSkinType]        = useState<string | null>(null);
  const [usedWeeklyIds,   setUsedWeeklyIds]   = useState<Set<string>>(new Set());
  const [usedMonthlyIds,  setUsedMonthlyIds]  = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inciAnalysisStarted = useRef(false);
  const routineJustGeneratedRef = useRef(false);
  const routinePersistedRef = useRef(false);

  useSaveWeather();

  const isMorning      = new Date().getHours() < 18;
  const { morning, evening } = useRoutineProducts();
  const routineProducts = useMemo(() => {
    const source = isMorning ? morning : evening;
    return source.filter(p => {
      if (!p.frequency || p.frequency === "daily") return true;
      if (p.frequency === "weekly")  return !usedWeeklyIds.has(p.id);
      if (p.frequency === "monthly") return !usedMonthlyIds.has(p.id);
      return true;
    });
  }, [isMorning, morning, evening, usedWeeklyIds, usedMonthlyIds]);

  const displayedProducts = useMemo(() =>
    routineProducts.filter(p => {
      const v = inciVerdicts[p.id] ?? inciVerdicts[p.product_name];
      return !v || v.verdict !== "danger";
    }), [routineProducts, inciVerdicts]);

  const explanationSentence = useMemo(() => {
    const removed = routineProducts.filter(p => {
      const v = inciVerdicts[p.id] ?? inciVerdicts[p.product_name];
      return v?.verdict === "danger";
    });
    if (removed.length === 0) return null;
    const names = removed.map(p => p.product_name).join(", ");
    const reason = (inciVerdicts[removed[0].id] ?? inciVerdicts[removed[0].product_name])?.reason
      ?? "ta peau a besoin de douceur";
    return `J'ai retiré ${names} — ${reason}.`;
  }, [routineProducts, inciVerdicts]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step, typing, answerQ1, answerQ2, answerQ3, factorsDone, analysisStep]);

  // Quand INCI est prêt et qu'on est au step 2 → avancer à 3
  useEffect(() => {
    if (inciDone && analysisStep === 2) {
      const t = setTimeout(() => setAnalysisStep(3), 600);
      return () => clearTimeout(t);
    }
  }, [inciDone, analysisStep]);

  // Persister la routine en DB quand step 3 est atteint (une seule fois, après conversation)
  useEffect(() => {
    if (analysisStep !== 3 || !routineJustGeneratedRef.current || routinePersistedRef.current) return;
    routinePersistedRef.current = true;
    const persist = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const today = new Date().toISOString().split("T")[0];
      await (supabase as any).from("daily_routine_log").upsert(
        {
          user_id: session.user.id,
          date: today,
          period: isMorning ? "morning" : "evening",
          product_ids: displayedProducts.map(p => p.id),
          inci_message: explanationSentence ?? null,
        },
        { onConflict: "user_id,date,period" }
      );
    };
    persist();
  }, [analysisStep]); // eslint-disable-line

  // Quand preComputedRaw + factorsDone → exposer les verdicts INCI
  useEffect(() => {
    if (preComputedRaw === null || !factorsDone) return;
    const map: Record<string, InciVerdict> = {};
    for (const inc of preComputedRaw) {
      if (inc.action !== 'remove') continue;
      const b = inc.product_name.toLowerCase().trim();
      const matched = routineProducts.find(p => {
        const a = p.product_name.toLowerCase().trim();
        return a === b || a.includes(b) || b.includes(a);
      });
      const key = matched?.id ?? inc.product_name;
      map[key] = { verdict: "danger", reason: inc.reason };
      if (matched) map[matched.product_name] = { verdict: "danger", reason: inc.reason };
    }
    setInciVerdicts(map);
    setInciDone(true);
  }, [preComputedRaw, factorsDone]); // eslint-disable-line

  const fetchInciVerdicts = async (uid: string) => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await (supabase as any)
      .from("daily_inci_verdicts")
      .select("product_id, product_name, verdict, reason")
      .eq("user_id", uid)
      .eq("date", today);
    if (!data) return;
    const map: Record<string, InciVerdict> = {};
    for (const row of data) {
      const key = row.product_id ?? row.product_name;
      if (key) map[key] = { verdict: row.verdict, reason: row.reason };
    }
    setInciVerdicts(map);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const name = session?.user?.user_metadata?.first_name ?? null;
      setUserName(name);
      if (!session?.user) return;

      const today = new Date().toISOString().split("T")[0];
      const sevenDaysAgo  = new Date(Date.now() - 7  * 86400000).toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

      const [profileRes, checkinRes, logsRes, weatherRes] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("last_period_date, cycle_duration, skin_type")
          .eq("id", session.user.id)
          .single(),
        (supabase as any)
          .from("daily_checkins")
          .select("stress_level, sleep_hours, food_quality, alcohol_drinks, water_glasses, did_sport, extra_factors")
          .eq("user_id", session.user.id)
          .eq("date", today)
          .maybeSingle(),
        (supabase as any)
          .from("routine_product_logs")
          .select("product_id, date")
          .eq("user_id", session.user.id)
          .gte("date", thirtyDaysAgo),
        (supabase as any)
          .from("daily_weather")
          .select("uv_index")
          .eq("user_id", session.user.id)
          .eq("date", today)
          .maybeSingle(),
      ]);
      if (weatherRes.data?.uv_index != null) setUvIndex(weatherRes.data.uv_index);

      const weekly = new Set<string>();
      const monthly = new Set<string>();
      for (const log of (logsRes.data ?? [])) {
        monthly.add(log.product_id);
        if (log.date >= sevenDaysAgo) weekly.add(log.product_id);
      }
      setUsedWeeklyIds(weekly);
      setUsedMonthlyIds(monthly);

      if (profileRes.data?.last_period_date) {
        const duration = profileRes.data.cycle_duration ?? 28;
        const calc = calculateCyclePhase(profileRes.data.last_period_date, duration, 5);
        if (calc?.phase) setCyclePhase(calc.phase);
        if (calc?.day)   setCycleDay(calc.day);
        setCycleDuration(duration);
      }
      if (profileRes.data?.skin_type) setSkinType(profileRes.data.skin_type);

      if (checkinRes.data) {
        const c = checkinRes.data;
        setFactorsDone(true);

        if (isMorning) {
          if (c.stress_level === 1)         setAnswerQ1("En forme");
          else if (c.stress_level === 4)    setAnswerQ1("Très fatiguée");
          else if (c.sleep_hours === 5)     setAnswerQ1("Fatiguée");

          if (c.sleep_hours === 8)          setAnswerQ2("Oui");
          else if (c.sleep_hours === 6)     setAnswerQ2("Passable");
          else if (c.sleep_hours === 4)     setAnswerQ2("Non");

          const factors = new Set<string>();
          if (c.food_quality === "Grasses / Sucrées") factors.add("Sucré/Gras");
          if (c.extra_factors?.medication)            factors.add("Médicament");
          if (c.stress_level === 4)                   factors.add("Stress élevé");
          setSelectedFactors(factors);
          setStep(2);
        } else {
          if (c.stress_level === 1)         setAnswerQ1("Bien");
          else if (c.stress_level === 3)    setAnswerQ1("Stressante");
          else if (c.stress_level === 4)    setAnswerQ1("Épuisante");

          if (c.food_quality === "Grasses / Sucrées") setAnswerQ2("Non");
          else if (c.food_quality === "Quelconque")   setAnswerQ2("Passable");
          else                                        setAnswerQ2("Oui");

          if (c.extra_factors?.sun_exposure)          setAnswerQ3("Oui");

          const factors = new Set<string>();
          if (c.alcohol_drinks >= 1)        factors.add("Alcool");
          if (c.extra_factors?.medication)  factors.add("Médicament");
          if (c.extra_factors?.travel)      factors.add("Voyage");
          setSelectedFactors(factors);
          setStep(3);
        }

        setAnalysisStep(3);
        setInciDone(true);
        setScreen("chat");
        fetchInciVerdicts(session.user.id);
      }
    };
    init();
  }, []);

  const skip = () => navigate("/dashboard", { replace: true });

  const handleQ1 = (answer: string) => {
    if (step !== 0) return;
    setAnswerQ1(answer);
    setTyping(true);
    setTimeout(() => { setTyping(false); setStep(1); }, 800);
  };

  const handleQ2 = (answer: Q2Answer) => {
    if (step !== 1) return;
    setAnswerQ2(answer);
    setTyping(true);
    setTimeout(() => { setTyping(false); setStep(2); }, 800);
  };

  const handleQ3Evening = (answer: Q3EveningAnswer) => {
    if (step !== 2 || isMorning) return;
    setAnswerQ3(answer);
    setTyping(true);
    setTimeout(() => { setTyping(false); setStep(3); }, 800);
  };

  const toggleFactor = (pill: string) => {
    if (factorsDone) return;
    setSelectedFactors(prev => {
      const next = new Set(prev);
      if (next.has(pill)) next.delete(pill); else next.add(pill);
      return next;
    });
  };

  const saveCheckin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const today = new Date().toISOString().split("T")[0];
    let stress_level: number | null = null;
    let sleep_hours: number | null = null;
    let food_quality: string | null = null;
    let alcohol_drinks: number | null = null;

    if (isMorning) {
      if (answerQ1 === "En forme")           stress_level = 1;
      else if (answerQ1 === "Très fatiguée") { stress_level = 2; sleep_hours = 4; }
      else if (answerQ1 === "Fatiguée")      sleep_hours = 5;
      if (selectedFactors.has("Stress élevé")) stress_level = 4;

      if (answerQ2 === "Oui")             sleep_hours = 8;
      else if (answerQ2 === "Passable")   sleep_hours = 6;
      else if (answerQ2 === "Non")        sleep_hours = 4;

      if (selectedFactors.has("Sucré/Gras")) food_quality = "Grasses / Sucrées";
    } else {
      if (answerQ1 === "Bien")            stress_level = 1;
      else if (answerQ1 === "Stressante") stress_level = 3;
      else if (answerQ1 === "Épuisante")  stress_level = 4;

      if (answerQ2 === "Oui")             food_quality = "Équilibrée";
      else if (answerQ2 === "Non")        food_quality = "Grasses / Sucrées";
      else if (answerQ2 === "Passable")   food_quality = "Quelconque";

      if (selectedFactors.has("Alcool"))  alcohol_drinks = 1;
    }

    await (supabase as any).from("daily_checkins").upsert(
      {
        user_id:    session.user.id,
        date:       today,
        stress_level,
        sleep_hours,
        food_quality,
        alcohol_drinks,
        extra_factors: {
          medication:   selectedFactors.has("Médicament"),
          travel:       selectedFactors.has("Voyage"),
          sun_exposure: answerQ3 === "Oui" || answerQ3 === "Un peu",
          new_product:  false,
        },
      },
      { onConflict: "user_id,date" }
    );
  };

  const runInitialInciAnalysis = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setPreComputedRaw([]); return; }
    const today = new Date().toISOString().split("T")[0];

    const { data: weather } = await (supabase as any)
      .from("daily_weather")
      .select("uv_index, temp_c")
      .eq("user_id", session.user.id)
      .eq("date", today)
      .maybeSingle();

    const products = routineProducts.map(p => ({
      product_name: p.product_name,
      brand: p.brand,
      ingredients: p.ingredients,
    }));

    const body = isMorning
      ? { morningProducts: products, eveningProducts: [], cyclePhase, uvIndex: weather?.uv_index ?? null, tempC: weather?.temp_c ?? null, skinType, factors: [...selectedFactors] }
      : { eveningProducts: products, morningProducts: [], cyclePhase, uvIndex: weather?.uv_index ?? null, tempC: weather?.temp_c ?? null, skinType, factors: [...selectedFactors] };

    try {
      const { data: result, error } = await (supabase as any).functions.invoke("inci-analysis", { body });
      if (error || !result) { setPreComputedRaw([]); return; }

      const rawAdjustments: RawIncompat[] = result.adjustments ?? [];

      for (const adj of rawAdjustments) {
        if (adj.action !== 'remove') continue;
        const b = adj.product_name.toLowerCase().trim();
        const matched = routineProducts.find(p => {
          const a = p.product_name.toLowerCase().trim();
          return a === b || a.includes(b) || b.includes(a);
        });
        (supabase as any).from("daily_inci_verdicts").insert({
          user_id: session.user.id,
          date: today,
          product_id: matched?.id ?? null,
          product_name: adj.product_name,
          verdict: "danger",
          reason: adj.reason,
          rule_id: null,
        });
      }

      setPreComputedRaw(rawAdjustments);
    } catch (err) {
      console.error("[inci-analysis] DailyConversation:", err);
      setPreComputedRaw([]);
    }
  };

  // Déclencher l'analyse initiale dès que les produits + phase cycle sont disponibles
  useEffect(() => {
    if (routineProducts.length > 0 && cyclePhase && !inciAnalysisStarted.current) {
      inciAnalysisStarted.current = true;
      runInitialInciAnalysis();
    }
  }, [routineProducts.length, cyclePhase]); // eslint-disable-line

  const handleFactorsDone = () => {
    routineJustGeneratedRef.current = true;
    setFactorsDone(true);
    saveCheckin();
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setAnalysisStep(1);
      setTimeout(() => {
        setAnalysisStep(2); // useEffect prend le relais quand inciDone=true
      }, 1200);
    }, 800);
  };

  const handleStartRoutine = async () => {
    setSaving(true);
    navigate("/routine-player");
  };

  const cycleSubtitle =
    cyclePhase === "Ovulatoire"     ? "Ta peau est au top aujourd'hui"
    : cyclePhase === "Lutéale"      ? "Ta peau a besoin de douceur"
    : cyclePhase === "Menstruelle"  ? "Ta peau est plus sensible aujourd'hui"
    : cyclePhase === "Folliculaire" ? "Ta peau se renouvelle"
    : null;

  const factorsSummary =
    selectedFactors.size === 0 ? "Rien à noter"
    : selectedFactors.size <= 3 ? [...selectedFactors].join(", ")
    : `${selectedFactors.size} facteurs notés`;

  // ── ÉCRAN 1 — Introduction ───────────────────────────────────────────────────
  if (screen === "intro") {
    return (
      <div className="min-h-screen flex flex-col bg-background">

        <div className="flex justify-end px-6 pt-14">
          <button onClick={skip} className="text-sm text-muted-foreground transition-colors">
            Passer
          </button>
        </div>

        <motion.div
          className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-8"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="space-y-2">
            <h1 className="text-[32px] font-display text-foreground leading-tight">
              {isMorning ? "Bonjour" : "Bonsoir"}{userName ? ` ${userName}` : ""} ✨
            </h1>
            {cycleSubtitle && (
              <p className="text-sm text-muted-foreground">{cycleSubtitle}</p>
            )}
          </div>

          {cyclePhase && cycleDay ? (
            <div className="w-[220px] mx-auto">
              <PearlHero
                cyclePhase={cyclePhase as "Folliculaire" | "Ovulatoire" | "Lutéale" | "Menstruelle"}
                cycleDay={cycleDay}
                cycleDuration={cycleDuration}
                weather={{ uv_index: uvIndex ?? 0 }}
                hideTitle
                hidePhotoButton
              />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-muted/20 mx-auto" />
          )}
        </motion.div>

        <div className="px-6 pb-16">
          <button
            onClick={() => setScreen("chat")}
            className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 premium-shadow hover:opacity-90 transition-all active:scale-[0.98]"
          >
            C'est parti <ChevronRight size={18} />
          </button>
        </div>

      </div>
    );
  }

  // ── ÉCRAN 2 — Conversation ───────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background">

      <div className="flex justify-end px-6 pt-14 pb-4 flex-shrink-0">
        <button onClick={skip} className="text-sm text-muted-foreground transition-colors">
          Passer
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-52">

        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <AiBubble>
            <p className="text-sm text-foreground/90">
              {isMorning ? "Comment tu te réveilles ce matin ?" : "Comment s'est passée ta journée ?"}
            </p>
          </AiBubble>
        </motion.div>

        <AnimatePresence>
          {answerQ1 && (
            <motion.div key="ans1" variants={fadeUp} initial="hidden" animate="visible">
              <UserBubble>{answerQ1}</UserBubble>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 1 && (
            <motion.div key="q2" variants={fadeUp} initial="hidden" animate="visible">
              <AiBubble>
                <p className="text-sm text-foreground/90">
                  {isMorning ? "Tu as bien dormi ?" : "Tu as mangé équilibré ?"}
                </p>
              </AiBubble>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {answerQ2 && step >= 1 && (
            <motion.div key="ans2" variants={fadeUp} initial="hidden" animate="visible">
              <UserBubble>{answerQ2}</UserBubble>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 2 && (
            <motion.div key="q3" variants={fadeUp} initial="hidden" animate="visible">
              <AiBubble>
                <p className="text-sm text-foreground/90">
                  {isMorning ? "Quelque chose à noter ?" : "Tu as été exposée au soleil ?"}
                </p>
              </AiBubble>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isMorning && answerQ3 && step >= 2 && (
            <motion.div key="ans3-sun" variants={fadeUp} initial="hidden" animate="visible">
              <UserBubble>{answerQ3}</UserBubble>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isMorning && step >= 3 && (
            <motion.div key="q4" variants={fadeUp} initial="hidden" animate="visible">
              <AiBubble>
                <p className="text-sm text-foreground/90">Quelque chose d'autre à noter ?</p>
              </AiBubble>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {factorsDone && (
            <motion.div key="ans-factors" variants={fadeUp} initial="hidden" animate="visible">
              <UserBubble>{factorsSummary}</UserBubble>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulle 1 — Analyse */}
        <AnimatePresence>
          {analysisStep === 1 && (
            <motion.div key="typing-analyse" variants={fadeUp} initial="hidden" animate="visible" exit={{ opacity: 0 }}>
              <TypingBubble />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {analysisStep >= 2 && (
            <motion.div key="bubble-analyse" variants={fadeUp} initial="hidden" animate="visible">
              <AiBubble>
                <p className="text-sm text-foreground/90">Analyse de tes réponses...</p>
              </AiBubble>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulle 2 — attente INCI */}
        <AnimatePresence>
          {analysisStep === 2 && (
            <motion.div key="typing-routine" variants={fadeUp} initial="hidden" animate="visible" exit={{ opacity: 0 }}>
              <TypingBubble />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulle 3 — Routine */}
        <AnimatePresence>
          {analysisStep >= 3 && (
            <motion.div key="bubble-routine" variants={fadeUp} initial="hidden" animate="visible">
              <AiBubble>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    Voici ta routine du {isMorning ? "matin" : "soir"} ✨
                  </p>

                  {explanationSentence && (
                    <p className="text-sm text-muted-foreground leading-snug">{explanationSentence}</p>
                  )}

                  {displayedProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun produit dans ta routine pour l'instant.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {displayedProducts.map(p => {
                        const duration = getDuration(p.product_type);
                        return (
                          <div key={p.id} className="flex items-center gap-2.5">
                            {p.photo_url ? (
                              <img
                                src={p.photo_url}
                                alt={p.product_name}
                                className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-muted/30">
                                <span className="text-muted-foreground text-xs">✦</span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{p.product_name}</p>
                              <p className="text-[11px] text-muted-foreground">{p.brand} · {duration} min</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </AiBubble>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Zone de réponse — position fixed en bas */}
      <div className="fixed bottom-0 left-0 right-0 z-10 px-5 pt-4 pb-10 border-t border-border/10 bg-background">
        <AnimatePresence mode="wait">
          {typing ? (
            <motion.div key="typing" variants={fadeUp} initial="hidden" animate="visible" exit={{ opacity: 0 }}>
              <TypingIndicator />
            </motion.div>
          ) : analysisStep >= 3 ? (
            <motion.div key="cta" variants={fadeUp} initial="hidden" animate="visible">
              {displayedProducts.length > 0 ? (
                <div className="space-y-2.5">
                  <button
                    onClick={handleStartRoutine}
                    disabled={saving}
                    className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 premium-shadow hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60"
                  >
                    {saving ? "Un instant…" : <>Commencer ma routine <ChevronRight size={18} /></>}
                  </button>
                  <button
                    onClick={skip}
                    disabled={saving}
                    className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 border border-border/60 text-muted-foreground hover:text-primary hover:border-primary transition-all disabled:opacity-60"
                  >
                    Voir ma perle <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={skip}
                  className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center border border-border/60 text-muted-foreground"
                >
                  Retour au dashboard
                </button>
              )}
            </motion.div>
          ) : analysisStep >= 1 ? null : step === 0 ? (
            <motion.div key="inp0" variants={fadeUp} initial="hidden" animate="visible" className="flex gap-2 flex-wrap justify-end">
              {(isMorning
                ? (["En forme", "Fatiguée", "Très fatiguée"] as Q1MorningAnswer[])
                : (["Bien", "Stressante", "Épuisante"] as Q1EveningAnswer[])
              ).map((a: Q1MorningAnswer | Q1EveningAnswer) => (
                <PillButton key={a} label={a} active={answerQ1 === a} onClick={() => handleQ1(a)} />
              ))}
            </motion.div>
          ) : step === 1 ? (
            <motion.div key="inp1" variants={fadeUp} initial="hidden" animate="visible" className="flex gap-2 flex-wrap justify-end">
              {(["Oui", "Non", "Passable"] as Q2Answer[]).map(a => (
                <PillButton key={a} label={a} active={answerQ2 === a} onClick={() => handleQ2(a)} />
              ))}
            </motion.div>
          ) : step === 2 && !isMorning ? (
            <motion.div key="inp2-sun" variants={fadeUp} initial="hidden" animate="visible" className="flex gap-2 flex-wrap justify-end">
              {(["Oui", "Non", "Un peu"] as Q3EveningAnswer[]).map(a => (
                <PillButton key={a} label={a} active={answerQ3 === a} onClick={() => handleQ3Evening(a)} />
              ))}
            </motion.div>
          ) : (step === 2 && isMorning) || (step === 3 && !isMorning) ? (
            <motion.div key="inp-factors" variants={fadeUp} initial="hidden" animate="visible" className="space-y-3">
              <div className="flex gap-2 flex-wrap justify-end">
                {(isMorning ? MORNING_FACTOR_PILLS : EVENING_FACTOR_PILLS).map(pill => (
                  <PillButton
                    key={pill}
                    label={pill}
                    active={selectedFactors.has(pill)}
                    disabled={factorsDone}
                    onClick={() => toggleFactor(pill)}
                  />
                ))}
              </div>
              <button
                onClick={handleFactorsDone}
                disabled={selectedFactors.size === 0}
                className={`w-full h-12 rounded-full font-bold text-sm flex items-center justify-center transition-all ${
                  selectedFactors.size === 0
                    ? "bg-primary/30 text-primary-foreground opacity-40 cursor-not-allowed"
                    : "bg-primary text-primary-foreground premium-shadow hover:opacity-90 active:scale-[0.98]"
                }`}
              >
                Envoyer
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

    </div>
  );
}
