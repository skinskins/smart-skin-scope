import { motion } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { calculateCyclePhase } from "@/utils/cycle";
import pearlLumineuse from "@/assets/pearls/Pearl-lumineuse.svg";
import pearlDouce     from "@/assets/pearls/Pearl-douce.svg";
import pearlTerne     from "@/assets/pearls/Pearl-terne.svg";
import pearlFragile   from "@/assets/pearls/Pearl-fragile.svg";
import pearlAbsente   from "@/assets/pearls/Pearl-absente.svg";

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
  const [morningProducts, setMorningProducts] = useState<{ id: string; product_name: string; brand: string }[]>([]);
  const [eveningProducts, setEveningProducts] = useState<{ id: string; product_name: string; brand: string }[]>([]);
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
      const { data } = await (supabase as any)
        .from("profiles")
        .select("manual_location, last_period_date, cycle_duration, skin_goals")
        .eq("id", session.user.id)
        .single();
      if (data?.manual_location) setManualLocationState(data.manual_location);
      if (data?.last_period_date) setLastPeriodDate(data.last_period_date);
      if (data?.cycle_duration) setCycleDuration(data.cycle_duration);
      if (data?.skin_goals?.length > 0) setSkinGoal(data.skin_goals[0]);
    };
    fetchProfile();
  }, []);

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
      const { data } = await (supabase as any)
        .from("daily_advice_log")
        .select("advice_title, advice_text")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .maybeSingle();
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
          .select("id, product_name, brand, morning_use, evening_use")
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
    Folliculaire: { name: "Perle douce",     subtitle: "Votre peau est équilibrée",     img: pearlDouce     },
    Ovulatoire:   { name: "Perle lumineuse", subtitle: "Votre peau est au top",          img: pearlLumineuse },
    Lutéale:      { name: "Perle terne",     subtitle: "Votre peau a besoin de douceur", img: pearlTerne     },
    Menstruelle:  { name: "Perle fragile",   subtitle: "Votre peau est plus sensible",   img: pearlFragile   },
  };

  const cycleCalc = lastPeriodDate
    ? calculateCyclePhase(lastPeriodDate, cycleDuration, 5)
    : null;
  const cyclePhase = cycleCalc?.phase ?? null;
  const cycleDay   = cycleCalc?.day   ?? null;
  const pearl = cyclePhase ? (PEARL_CONFIG[cyclePhase] ?? null) : null;

  const cycleUp = ["Folliculaire", "Ovulatoire"].includes(cyclePhase ?? "");
  const airUp   = ["Bon", "Faible"].includes(liveWeather.pollution ?? "");

  return (
    <div className="min-h-screen pb-24 px-5 pt-10 max-w-lg mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center"
      >
        <h1 className="text-4xl font-display text-foreground">
          Bonjour {userName ?? ""}
        </h1>
      </motion.div>

      {/* Cartes contextuelles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-4 mb-8"
      >
        {/* Carte Cycle */}
        <div className="premium-card p-6 flex flex-col gap-3">
          <span className="text-2xl">{cycleUp ? "↗" : "↘"}</span>
          <p className="text-base font-display font-bold text-foreground">
            {cyclePhase ?? "–"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {cycleDay ? `Jour ${cycleDay} sur ${cycleDuration}` : "Données insuffisantes"}
          </p>
        </div>

        {/* Carte Météo */}
        <div className="premium-card p-6 flex flex-col gap-3">
          <span className="text-2xl">{airUp ? "↗" : "↘"}</span>
          <p className="text-base font-display font-bold text-foreground">
            {liveWeather.pollution ?? "–"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Indice UV à {liveWeather.uv ?? 0}
          </p>
        </div>
      </motion.div>

      {/* Hero perle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 text-center"
      >
        <div className="flex flex-col items-center gap-3">
          <img
            src={pearl?.img ?? pearlAbsente}
            alt={pearl?.name ?? "Perle absente"}
            className="w-[120px] h-[120px] object-contain"
          />
          <p className="text-xl font-display font-bold text-foreground">
            {pearl?.name ?? "Perle absente"}
          </p>
          <p className="text-sm text-muted-foreground">
            {pearl?.subtitle ?? "Données insuffisantes"}
          </p>
        </div>
      </motion.div>

      {/* Streak */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        {streakLoaded && streakCount === 0 && weekCount === 0 ? (
          <div className="bg-white rounded-[24px] px-4 py-3 flex items-center justify-center border border-border/40">
            <p className="text-sm text-muted-foreground">Commence ta première routine 🌸</p>
          </div>
        ) : (
          <button className="w-full bg-white rounded-[24px] px-4 py-3 flex items-center gap-3 border border-border/40 text-left">
            <span className="text-xl">🔥</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                {streakCount} jours · {skinGoal ?? "Objectif"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {weekCount}/7 cette semaine · Record : {bestStreak} jours
              </p>
            </div>
            <span className="text-muted-foreground/60">→</span>
          </button>
        )}
      </motion.div>

      {/* Conseil du jour */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-4"
      >
        <div className="bg-white rounded-2xl p-4 flex items-start gap-3 border border-border/40">
          <Sparkles size={18} strokeWidth={1.5} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            {advice ? (
              <>
                <p className="text-sm font-bold text-foreground mb-1">{advice.advice_title}</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {advice.advice_text.length > 80
                    ? advice.advice_text.slice(0, 80) + "…"
                    : advice.advice_text}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Votre conseil arrive bientôt</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Lien facteurs */}
      <div className="mb-8 text-center">
        <button className="text-[12px] text-muted-foreground/70 hover:text-primary transition-colors">
          Ta journée influence ta peau demain →
        </button>
      </div>

      {/* Onglets Matin / Soir */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-4"
      >
        <div className="flex gap-2 mb-4">
          {(["matin", "soir"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-white border border-border/40 text-muted-foreground"
              }`}
            >
              {tab === "matin" ? "Matin" : "Soir"}
            </button>
          ))}
        </div>

        <div className="premium-card p-4 space-y-1">
          {(activeTab === "matin" ? morningProducts : eveningProducts).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              Aucun produit dans cette routine
            </p>
          ) : (
            (activeTab === "matin" ? morningProducts : eveningProducts).map(product => {
              const isChecked = checkedProducts.has(product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => toggleProduct(product.id)}
                  className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-muted/10 transition-all text-left"
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isChecked ? "bg-primary border-primary" : "border-border/60"
                  }`}>
                    {isChecked && <Check size={12} strokeWidth={3} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium transition-all ${
                      isChecked ? "line-through text-muted-foreground/50" : "text-foreground"
                    }`}>
                      {product.product_name}
                    </p>
                    {product.brand && (
                      <p className="text-[11px] text-muted-foreground">{product.brand}</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Lien progrès */}
      <div className="mb-8 text-center">
        <button className="text-[12px] text-muted-foreground/70 hover:text-primary transition-colors">
          Découvrez ce qui a changé →
        </button>
      </div>

    </div>
  );
};

export default Dashboard;
