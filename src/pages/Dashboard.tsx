import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, Bell, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { calculateCyclePhase } from "@/utils/cycle";
import pearlLumineuse from "@/assets/pearls/Pearl-lumineuse.svg";
import pearlDouce from "@/assets/pearls/Pearl-douce.svg";
import pearlTerne from "@/assets/pearls/Pearl-terne.svg";
import pearlFragile from "@/assets/pearls/Pearl-fragile.svg";
import pearlAbsente from "@/assets/pearls/Pearl-absente.svg";

// Types
type Conseil = {
  id: string;
  advice_title: string;
  advice_text: string;
  advice_tip: string;
  advice_group: string;
  priority: string;
};

// Config type badges
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  observation: { label: "Observation", color: "text-blue-600", bg: "bg-blue-50" },
  astuce: { label: "Astuce", color: "text-green-600", bg: "bg-green-50" },
  alerte: { label: "Alerte", color: "text-orange-600", bg: "bg-orange-50" },
  warning: { label: "Attention", color: "text-red-500", bg: "bg-red-50" },
};

// Composant card conseil
const AdviceCard = ({ conseil }: { conseil: Conseil }) => {
  const [open, setOpen] = useState(false);
  const typeConf = TYPE_CONFIG[conseil.advice_group] ?? TYPE_CONFIG["astuce"];

  return (
    <motion.div
      layout
      onClick={() => setOpen(!open)}
      className="bg-white rounded-2xl p-4 cursor-pointer hover:bg-muted/5 transition-colors"
    >
      {/* Preview */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeConf.bg} ${typeConf.color}`}>
              {typeConf.label}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug mb-1">
            {conseil.advice_title}
          </p>
          <p className={`text-[12px] text-muted-foreground leading-relaxed ${open ? "" : "line-clamp-1"}`}>
            {conseil.advice_text}
          </p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mt-1"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" />
          </svg>
        </motion.div>
      </div>

      {/* Détail expandable */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-border/15">
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">
                {conseil.advice_text}
              </p>
              {conseil.advice_tip && (
                <div className="bg-primary/5 rounded-xl p-3">
                  <p className="text-[11px] font-bold text-primary mb-1">Action suggérée</p>
                  <p className="text-[12px] text-foreground/80 leading-relaxed">
                    {conseil.advice_tip}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
const Dashboard = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const [lastPeriodDate, setLastPeriodDate] = useState<string>("");
  const [cycleDuration, setCycleDuration] = useState<number>(28);
  const [manualLocation, setManualLocationState] = useState<string | null>(
    () => localStorage.getItem("manualLocation")
  );
  const [streakCount, setStreakCount] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [skinGoal, setSkinGoal] = useState<string | null>(null);
  const [streakLoaded, setStreakLoaded] = useState(false);
  const [advices, setAdvices] = useState<Conseil[]>([]);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [showFactorsModal, setShowFactorsModal] = useState(false);
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(new Set());
  const [factorsSaved, setFactorsSaved] = useState(false);

  const FACTORS = [
    { category: "Alimentation", pills: ["Sucré/gras", "Alcool", "Peu d'eau"] },
    { category: "Stress & sommeil", pills: ["Stress élevé", "Mauvaise nuit"] },
    { category: "Corps & environnement", pills: ["Sport intense", "Médicament", "Voyage", "Exposition solaire"] },
  ];

  const toggleFactor = (pill: string) => {
    setSelectedFactors(prev => {
      const next = new Set(prev);
      if (next.has(pill)) next.delete(pill); else next.add(pill);
      return next;
    });
  };

  const saveFactors = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setShowFactorsModal(false); return; }
    const today = new Date().toISOString().split("T")[0];
    await (supabase as any).from("daily_checkins").upsert(
      {
        user_id: session.user.id,
        date: today,
        food_quality: selectedFactors.has("Sucré/gras") ? "Grasses / Sucrées" : null,
        alcohol_drinks: selectedFactors.has("Alcool") ? 1 : null,
        water_glasses: selectedFactors.has("Peu d'eau") ? 2 : null,
        stress_level: selectedFactors.has("Stress élevé") ? 4 : null,
        sleep_hours: selectedFactors.has("Mauvaise nuit") ? 5 : null,
        did_sport: selectedFactors.has("Sport intense"),
        sport_intensity: selectedFactors.has("Sport intense") ? "Intense" : null,
      },
      { onConflict: "user_id,date" }
    );
    setFactorsSaved(true);
    setTimeout(() => { setShowFactorsModal(false); setFactorsSaved(false); setSelectedFactors(new Set()); }, 800);
  };
  const [morningProducts, setMorningProducts] = useState<{ id: string; product_name: string; brand: string; frequency?: string | null }[]>([]);
  const [eveningProducts, setEveningProducts] = useState<{ id: string; product_name: string; brand: string; frequency?: string | null }[]>([]);
  const [activeTab, setActiveTab] = useState<"matin" | "soir">("matin");
  const [checkedProducts, setCheckedProducts] = useState<Set<string>>(new Set());

  const { weather: liveWeather } = useWeatherData(manualLocation || undefined);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      if (session.user.user_metadata?.first_name) {
        setUserName(session.user.user_metadata.first_name);
      }
      console.log("[CycleDebug] user.id used in WHERE:", session.user.id);
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("manual_location, last_period_date, cycle_duration, skin_goals")
        .eq("id", session.user.id)
        .single();
      console.log("[CycleDebug] profiles data:", JSON.stringify(data));
      console.log("[CycleDebug] profiles error:", JSON.stringify(error));
      if (data?.manual_location) setManualLocationState(data.manual_location);
      if (data?.last_period_date) setLastPeriodDate(data.last_period_date);
      if (data?.cycle_duration) setCycleDuration(data.cycle_duration);
      if (data?.skin_goals?.length > 0) setSkinGoal(data.skin_goals[0]);
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    console.log("[WeatherSave] liveWeather changed:", liveWeather);
    if (liveWeather.locationName === "...") return;
    const save = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { console.log("[WeatherSave] no session, abort"); return; }
      const today = new Date().toISOString().split("T")[0];
      console.log("[WeatherSave] inserting for", session.user.id, today, liveWeather);
      const { data, error } = await (supabase as any)
        .from("daily_weather")
        .upsert(
          {
            user_id: session.user.id,
            date: today,
            temp: liveWeather.temp,
            uv: liveWeather.uv,
            pollution: liveWeather.pollution,
          },
          { onConflict: "user_id,date", ignoreDuplicates: true }
        );
      console.log("[WeatherSave] result →", { data, error });
    };
    save();
  }, [liveWeather]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserName(session?.user?.user_metadata?.first_name ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchStreak = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setStreakLoaded(true); return; }

      const since = new Date();
      since.setDate(since.getDate() - 60);

      const { data } = await (supabase as any)
        .from("routine_logs")
        .select("date, morning_routine_done, evening_routine_done")
        .eq("user_id", session.user.id)
        .gte("date", since.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (!data?.length) { setStreakLoaded(true); return; }

      const done = new Set<string>(
        data
          .filter((r: any) => r.morning_routine_done || r.evening_routine_done)
          .map((r: any) => r.date as string)
      );

      // Streak courant
      let streak = 0;
      const cursor = new Date();
      while (done.has(cursor.toISOString().split("T")[0])) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }

      // 7 derniers jours
      let week = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        if (done.has(d.toISOString().split("T")[0])) week++;
      }

      // Meilleure série
      const sorted = Array.from(done).sort();
      let best = 0, cur = 0;
      let prev: Date | null = null;
      for (const s of sorted) {
        const d = new Date(s);
        const gap = prev ? (d.getTime() - prev.getTime()) / 86400000 : 0;
        cur = gap === 1 ? cur + 1 : 1;
        if (cur > best) best = cur;
        prev = d;
      }

      setStreakCount(streak);
      setWeekCount(week);
      setBestStreak(best);
      setStreakLoaded(true);
    };
    fetchStreak();
  }, []);

  useEffect(() => {
    const fetchAdvice = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const today = new Date().toISOString().split("T")[0];

      // 1. Chercher si conseils déjà en base
      const { data } = await (supabase as any)
        .from("daily_advice_log")
        .select("advice_title, advice_text")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .maybeSingle();
      console.log("[AdviceDebug] data:", JSON.stringify(data), "user:", session.user.id, "date:", today);
      if (data) {
        setAdvices([data]);
        return;
      }

      // 2. Pas de conseil → générer
      setAdviceLoading(true);
      console.log("[AdviceDebug] Lancement generate-advice pour:", session.user.id);
      try {
        const { error, data: genData } = await supabase.functions.invoke("generate-advice", {
          body: { user_id: session.user.id },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error("[AdviceDebug] Erreur:", JSON.stringify(error));
          return;
        }

        // Utiliser directement la réponse
        if (genData?.conseils?.length > 0) {
          const first = genData.conseils[0];
          setAdvices(genData.conseils);
          return;
        }

        // Fallback — relire depuis DB
        const { data: fresh } = await (supabase as any)
          .from("daily_advice_log")
          .select("advice_title, advice_text")
          .eq("user_id", session.user.id)
          .eq("date", today)
          .maybeSingle();

        if (fresh) setAdvices([fresh]);

      } catch (err) {
        console.error("[AdviceDebug] Exception:", err);
      } finally {
        setAdviceLoading(false);
      }
    };

    fetchAdvice();
  }, []);

  useEffect(() => {
    const fetchProductsAndRoutine = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const today = new Date().toISOString().split("T")[0];

      const [productsRes, routineRes] = await Promise.all([
        (supabase as any)
          .from("user_products")
          .select("id, product_name, brand, morning_use, evening_use, frequency")
          .eq("user_id", session.user.id)
          .eq("is_active", true),
        (supabase as any)
          .from("routine_logs")
          .select("morning_routine_done, evening_routine_done")
          .eq("user_id", session.user.id)
          .eq("date", today)
          .maybeSingle(),
      ]);

      const products = productsRes.data ?? [];
      const morning = products.filter((p: any) => p.morning_use);
      const evening = products.filter((p: any) => p.evening_use);
      setMorningProducts(morning);
      setEveningProducts(evening);

      const log = routineRes.data;
      if (log) {
        const preChecked = new Set<string>();
        if (log.morning_routine_done) morning.forEach((p: any) => preChecked.add(p.id));
        if (log.evening_routine_done) evening.forEach((p: any) => preChecked.add(p.id));
        setCheckedProducts(preChecked);
      }
    };
    fetchProductsAndRoutine();
  }, []);

  const toggleProduct = async (productId: string) => {
    const isChecking = !checkedProducts.has(productId);
    setCheckedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    if (!isChecking) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const today = new Date().toISOString().split("T")[0];
    const field = activeTab === "matin" ? "morning_routine_done" : "evening_routine_done";
    await (supabase as any).from("routine_logs").upsert(
      { user_id: session.user.id, date: today, [field]: true },
      { onConflict: "user_id,date" }
    );
  };

  const PEARL_CONFIG: Record<string, { name: string; subtitle: string; img: string }> = {
    Folliculaire: { name: "Perle douce", subtitle: "Votre peau est équilibrée", img: pearlDouce },
    Ovulatoire: { name: "Perle lumineuse", subtitle: "Votre peau est au top", img: pearlLumineuse },
    Lutéale: { name: "Perle terne", subtitle: "Votre peau a besoin de douceur", img: pearlTerne },
    Menstruelle: { name: "Perle fragile", subtitle: "Votre peau est plus sensible", img: pearlFragile },
  };

  const cycleCalc = lastPeriodDate
    ? calculateCyclePhase(lastPeriodDate, cycleDuration, 5)
    : null;
  const cyclePhase = cycleCalc?.phase ?? null;
  const cycleDay = cycleCalc?.day ?? null;
  const pearl = cyclePhase ? (PEARL_CONFIG[cyclePhase] ?? null) : null;
  console.log("[CycleDebug] lastPeriodDate:", lastPeriodDate, "| cycleDuration:", cycleDuration, "| phase:", cyclePhase, "| day:", cycleDay, "| pearl:", pearl?.name ?? "null");

  const cycleUp = ["Folliculaire", "Ovulatoire"].includes(cyclePhase ?? "");
  const airUp = ["Bon", "Faible"].includes(liveWeather.pollution ?? "");

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto bg-white">

      {/* Header — fond blanc */}
      <div className="bg-white px-5 pt-8 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="w-10 h-10 rounded-full bg-primary/15 overflow-hidden flex items-center justify-center">
            <img src={pearlDouce} alt="avatar" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors">
              <Bell size={20} strokeWidth={1.5} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors">
              <BookOpen size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          Bonjour {userName ?? ""}
        </h1>
      </div>

      {/* Hero — fond #F8F6F2 */}
      <div className="px-5 pt-6 pb-6" style={{ backgroundColor: "#F8F6F2" }}>

        {/* Cartes contextuelles */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-bold ${cycleUp ? "text-green-500" : "text-muted-foreground"}`}>
                {cycleUp ? "↗" : "↘"}
              </span>
              <p className="text-sm font-bold text-foreground">{cyclePhase ?? "–"}</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {cycleDay ? `Jour ${cycleDay} sur ${cycleDuration}` : "–"}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-bold ${airUp ? "text-green-500" : "text-muted-foreground"}`}>
                {airUp ? "↗" : "↘"}
              </span>
              <p className="text-sm font-bold text-foreground">Qualité d'air</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Indice UV à {liveWeather.uv ?? 0}
            </p>
          </div>
        </div>

        {/* Perle */}
        <div className="text-center mb-6">
          <p className="text-xl font-bold text-foreground mb-1">
            {pearl?.name ?? "Perle absente"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {pearl?.subtitle ?? ""}
          </p>
          <img
            src={pearl?.img ?? pearlAbsente}
            alt={pearl?.name ?? "Perle absente"}
            className="w-40 h-40 object-contain mx-auto"
          />
        </div>
        {/* Conseil du jour */}
        <div className="flex flex-col gap-2 mb-3">
          {adviceLoading ? (
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent flex-shrink-0"
              />
              <p className="text-[12px] text-muted-foreground">
                Vos conseils personnalisés sont en cours de préparation...
              </p>
            </div>
          ) : advices.length > 0 ? (
            advices.map((conseil) => (
              <AdviceCard key={conseil.id} conseil={conseil} />
            ))
          ) : (
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3">
              <Sparkles size={16} strokeWidth={1.5} className="text-primary flex-shrink-0" />
              <p className="text-sm text-muted-foreground">Votre conseil arrive bientôt</p>
            </div>
          )}
        </div>

        {/* Liste produits */}
        <div className="rounded-2xl overflow-hidden border border-border/15 mb-8">
          {(activeTab === "matin" ? morningProducts : eveningProducts).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun produit dans cette routine
            </p>
          ) : (
            (activeTab === "matin" ? morningProducts : eveningProducts).map((product, i, arr) => {
              const isChecked = checkedProducts.has(product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => toggleProduct(product.id)}
                  className={`w-full flex items-center gap-3 py-3.5 px-4 text-left hover:bg-muted/5 transition-colors ${i < arr.length - 1 ? "border-b border-border/15" : ""
                    }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${isChecked ? "bg-[#1a1a1a] border-[#1a1a1a]" : "border-border/40"
                    }`}>
                    {isChecked && <Check size={10} strokeWidth={3} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium transition-all ${isChecked ? "line-through text-muted-foreground/50" : "text-foreground"
                      }`}>
                      {product.product_name}
                    </p>
                    {product.brand && (
                      <p className="text-[11px] text-muted-foreground">{product.brand}</p>
                    )}
                  </div>
                  {product.frequency === "weekly" && (
                    <span className="text-[10px] text-muted-foreground border border-border/40 rounded-full px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                      → Cette semaine
                    </span>
                  )}
                  {product.frequency === "monthly" && (
                    <span className="text-[10px] text-muted-foreground border border-border/40 rounded-full px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                      → Ce mois
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Modale facteurs du jour */}
      <Dialog open={showFactorsModal} onOpenChange={(open) => { if (!open) { setShowFactorsModal(false); setSelectedFactors(new Set()); setFactorsSaved(false); } }}>
        <DialogContent className="max-w-sm rounded-[32px] border-none premium-shadow p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-display text-foreground">Ta journée</DialogTitle>
            <p className="text-[11px] text-muted-foreground mt-1">Quelque chose à noter ?</p>
          </DialogHeader>

          <div className="space-y-6 mb-8">
            {FACTORS.map(({ category, pills }) => (
              <div key={category}>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {pills.map(pill => {
                    const active = selectedFactors.has(pill);
                    return (
                      <button
                        key={pill}
                        onClick={() => toggleFactor(pill)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white border-border/40 text-muted-foreground hover:border-primary/40"
                          }`}
                      >
                        {pill}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {factorsSaved ? (
                <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-primary/10 rounded-full">
                  <Check size={16} className="text-primary" />
                  <span className="text-sm font-bold text-primary">Noté !</span>
                </motion.div>
              ) : (
                <motion.button key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={saveFactors}
                  disabled={selectedFactors.size === 0}
                  className="w-full h-12 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Enregistrer
                </motion.button>
              )}
            </AnimatePresence>
            <button
              onClick={() => { setShowFactorsModal(false); setSelectedFactors(new Set()); }}
              className="w-full h-10 text-[12px] text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              Rien à noter aujourd'hui
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Dashboard;
