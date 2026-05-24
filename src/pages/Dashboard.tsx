import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { calculateCyclePhase } from "@/utils/cycle";
import { PearlHero } from "@/components/PearlHero";
import { PageHeader } from "@/components/PageHeader";

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
  const [advice, setAdvice] = useState<{ advice_title: string; advice_text: string } | null>(null);
  const [showFactorsModal, setShowFactorsModal] = useState(false);
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(new Set());
  const [factorsSaved, setFactorsSaved] = useState(false);

  const FACTORS = [
    { category: "Alimentation",          pills: ["Sucré/gras", "Alcool", "Peu d'eau"] },
    { category: "Stress & sommeil",      pills: ["Stress élevé", "Mauvaise nuit"] },
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
        user_id:         session.user.id,
        date:            today,
        food_quality:    selectedFactors.has("Sucré/gras")   ? "Grasses / Sucrées" : null,
        alcohol_drinks:  selectedFactors.has("Alcool")        ? 1                   : null,
        water_glasses:   selectedFactors.has("Peu d'eau")     ? 2                   : null,
        stress_level:    selectedFactors.has("Stress élevé")  ? 4                   : null,
        sleep_hours:     selectedFactors.has("Mauvaise nuit") ? 5                   : null,
        did_sport:       selectedFactors.has("Sport intense"),
        sport_intensity: selectedFactors.has("Sport intense") ? "Intense"           : null,
        product_change:  selectedFactors.has("Nouveau produit"),
        extra_factors: {
          medication:    selectedFactors.has("Médicament"),
          travel:        selectedFactors.has("Voyage"),
          sun_exposure:  selectedFactors.has("Exposition solaire"),
          new_product:   selectedFactors.has("Nouveau produit"),
        },
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
      console.log("[AdviceDebug] querying for user_id:", session.user.id, "date:", today);
      const { data, error } = await (supabase as any)
        .from("daily_advice_log")
        .select("advice_title, advice_text")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .maybeSingle();
      console.log("[AdviceDebug] data:", JSON.stringify(data));
      console.log("[AdviceDebug] error:", JSON.stringify(error));
      if (data) setAdvice(data);
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

  const cycleCalc = lastPeriodDate
    ? calculateCyclePhase(lastPeriodDate, cycleDuration, 5)
    : null;
  const cyclePhase = cycleCalc?.phase ?? null;
  const cycleDay   = cycleCalc?.day   ?? null;
  console.log("[CycleDebug] lastPeriodDate:", lastPeriodDate, "| cycleDuration:", cycleDuration, "| phase:", cyclePhase, "| day:", cycleDay);

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto bg-white">

      <PageHeader title={`Bonjour ${userName ?? ""}`} />

      {/* Hero */}
      <div className="px-5 pt-6 pb-6 bg-white">

        {/* PearlHero */}
        {cyclePhase && cycleDay ? (
          <div className="mb-6">
            <PearlHero
              firstName={userName ?? undefined}
              cyclePhase={cyclePhase as "Folliculaire" | "Ovulatoire" | "Lutéale" | "Menstruelle"}
              cycleDay={cycleDay}
              cycleDuration={cycleDuration}
              weather={{ uv_index: liveWeather.uv ?? 0 }}
              streakCount={streakCount}
            />
          </div>
        ) : null}

        {/* Conseil du jour */}
        <div className="bg-white rounded-2xl p-4 flex items-start gap-3 mb-3">
          <Sparkles size={16} strokeWidth={1.5} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            {advice ? (
              <>
                <p className="text-sm font-bold text-foreground mb-1">{advice.advice_title}</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{advice.advice_text}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Votre conseil arrive bientôt</p>
            )}
          </div>
        </div>

        {/* Lien facteurs */}
        <div className="text-center pt-1">
          <button
            onClick={() => setShowFactorsModal(true)}
            className="text-[12px] text-muted-foreground/60 hover:text-primary transition-colors"
          >
            Quelque chose à noter aujourd'hui ?
          </button>
        </div>
      </div>

      {/* Content — fond blanc */}
      <div className="bg-white px-5 pt-6">

        {/* Mes routines */}
        <h2 className="text-xl font-bold text-foreground mb-4">Mes routines</h2>

        {/* Tabs */}
        <div className="flex bg-[#F8F6F2] rounded-full p-1 mb-3">
          {(["matin", "soir"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === tab
                  ? "bg-[#1a1a1a] text-white"
                  : "text-muted-foreground"
              }`}
            >
              {tab === "matin" ? "Matin" : "Soir"}
            </button>
          ))}
        </div>

        {/* Compteur produits */}
        {(() => {
          const count = (activeTab === "matin" ? morningProducts : eveningProducts).length;
          return count > 0 ? (
            <p className="text-[12px] text-muted-foreground mb-3">
              {count} produit{count > 1 ? "s" : ""}
            </p>
          ) : null;
        })()}

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
                  className={`w-full flex items-center gap-3 py-3.5 px-4 text-left hover:bg-muted/5 transition-colors ${
                    i < arr.length - 1 ? "border-b border-border/15" : ""
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    isChecked ? "bg-[#1a1a1a] border-[#1a1a1a]" : "border-border/40"
                  }`}>
                    {isChecked && <Check size={10} strokeWidth={3} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium transition-all ${
                      isChecked ? "line-through text-muted-foreground/50" : "text-foreground"
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
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                          active
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
