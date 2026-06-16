import { useNavigate } from "react-router-dom";
import { RefreshCw, Sparkles } from "lucide-react";
import { FactorsModal } from "@/components/FactorsModal";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useSaveWeather } from "@/hooks/useSaveWeather";
import { calculateCyclePhase } from "@/utils/cycle";
import { PearlHero } from "@/components/PearlHero";
import { PageHeader } from "@/components/PageHeader";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { AdviceCard, Conseil, sortConseils } from "@/components/AdviceCard";

type RoutineLogRow = { date: string; morning_routine_done: boolean | null; evening_routine_done: boolean | null };
type SymptomRow    = { date: string; symptom: string; trend: string };
type CheckinRow    = { date: string; stress_level: number | null; sleep_hours: number | null; food_quality: string | null; alcohol_drinks: number | null };

const trendToScore = (t: string) => t === "moins" ? 1 : t === "plus" ? -1 : 0;
const foodToScore  = (q: string | null): number | null =>
  q === "Équilibrée" ? 5 : q === "Quelconque" ? 3 : q === "Grasses / Sucrées" ? 1 : null;

const DashboardSkeleton = () => (
  <div className="min-h-screen pb-24 max-w-lg mx-auto bg-white animate-pulse">
    <div className="h-14 bg-[#F8F6F2]" />
    <div className="px-5 pt-8">
      <div className="rounded-3xl bg-[#F8F6F2] h-64 mb-3" />
      <div className="rounded-2xl bg-[#F8F6F2] h-20 mb-3" />
      <div className="h-4 bg-[#F8F6F2] rounded-full w-48 mx-auto mt-4" />
    </div>
  </div>
);

const Dashboard = () => {
  const [checkinStatus, setCheckinStatus] = useState<"loading" | "done">("loading");
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
  const [routineLogs, setRoutineLogs] = useState<RoutineLogRow[]>([]);
  const [symptomData, setSymptomData] = useState<SymptomRow[]>([]);
  const [checkinData, setCheckinData] = useState<CheckinRow[]>([]);
  const navigate = useNavigate();

  const { weather: liveWeather } = useSaveWeather(manualLocation || undefined);

  // Guard : redirect to silent routine generation if today's routine isn't ready yet
  useEffect(() => {
    const checkDailyRoutine = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setCheckinStatus("done");
        return;
      }
      const today = new Date().toISOString().split("T")[0];
      const isMorning = new Date().getHours() < 18;
      const { data } = await (supabase as any)
        .from("daily_routine_log")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .eq("period", isMorning ? "morning" : "evening")
        .maybeSingle();
      if (!data) {
        navigate("/daily-conversation", { replace: true });
      } else {
        setCheckinStatus("done");
      }
    };
    checkDailyRoutine();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      const ADVICE_FIELDS = "id, advice_title, advice_text, advice_tip, advice_group, priority";

      // 1. Conseils déjà en base pour aujourd'hui
      const { data } = await (supabase as any)
        .from("daily_advice_log")
        .select(ADVICE_FIELDS)
        .eq("user_id", session.user.id)
        .eq("date", today);

      if (data && data.length > 0) {
        setAdvices(sortConseils(data));
        return;
      }

      // 2. Pas de conseil → générer (filet de sécurité, en plus du flow silencieux)
      setAdviceLoading(true);
      try {
        const { error, data: genData } = await (supabase as any).functions.invoke("generate-advice", {
          body: { user_id: session.user.id },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) return;

        if (genData?.conseils?.length > 0) {
          setAdvices(sortConseils(genData.conseils));
          return;
        }

        // Fallback — relire depuis DB
        const { data: fresh } = await (supabase as any)
          .from("daily_advice_log")
          .select(ADVICE_FIELDS)
          .eq("user_id", session.user.id)
          .eq("date", today);

        if (fresh && fresh.length > 0) setAdvices(sortConseils(fresh));
      } catch (err) {
        console.error("[generate-advice] Dashboard:", err);
      } finally {
        setAdviceLoading(false);
      }
    };
    fetchAdvice();
  }, []);

  useEffect(() => {
    const fetchCharts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceStr = since.toISOString().split("T")[0];
      const uid = session.user.id;
      const [r1, r2, r3] = await Promise.all([
        (supabase as any).from("routine_logs")
          .select("date, morning_routine_done, evening_routine_done")
          .eq("user_id", uid).gte("date", sinceStr).order("date", { ascending: true }),
        (supabase as any).from("symptom_tracking")
          .select("date, symptom, trend")
          .eq("user_id", uid).gte("date", sinceStr).order("date", { ascending: true }),
        (supabase as any).from("daily_checkins")
          .select("date, stress_level, sleep_hours, food_quality, alcohol_drinks")
          .eq("user_id", uid).gte("date", sinceStr).order("date", { ascending: true }),
      ]);
      setRoutineLogs(r1.data ?? []);
      setSymptomData(r2.data ?? []);
      setCheckinData(r3.data ?? []);
    };
    fetchCharts();
  }, []);


  const cycleCalc = lastPeriodDate
    ? calculateCyclePhase(lastPeriodDate, cycleDuration, 5)
    : null;
  const cyclePhase = cycleCalc?.phase ?? null;
  const cycleDay   = cycleCalc?.day   ?? null;
  console.log("[CycleDebug] lastPeriodDate:", lastPeriodDate, "| cycleDuration:", cycleDuration, "| phase:", cyclePhase, "| day:", cycleDay);

  const routineChartData = routineLogs.map(r => ({
    date: r.date.slice(8),
    matin: r.morning_routine_done ? 1 : 0,
    soir:  r.evening_routine_done ? 1 : 0,
  }));

  const symptomByDate = new Map<string, number[]>();
  for (const s of symptomData) {
    if (!symptomByDate.has(s.date)) symptomByDate.set(s.date, []);
    symptomByDate.get(s.date)!.push(trendToScore(s.trend));
  }
  const symptomChartData = Array.from(symptomByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, scores]) => ({
      date: date.slice(8),
      score: +(scores.reduce((a, v) => a + v, 0) / scores.length).toFixed(2),
    }));

  const skinScoreMap = new Map<string, number>();
  symptomByDate.forEach((scores, date) =>
    skinScoreMap.set(date, +((scores.reduce((a, v) => a + v, 0) / scores.length + 1) * 2.5).toFixed(2))
  );
  const factorsChartData = checkinData.map(c => ({
    date:   c.date.slice(8),
    stress: c.stress_level,
    sleep:  c.sleep_hours != null ? +(Math.min(5, Math.max(1, c.sleep_hours - 3))).toFixed(1) : null,
    food:   foodToScore(c.food_quality),
    peau:   skinScoreMap.get(c.date) ?? null,
  }));

  if (checkinStatus === "loading") return <DashboardSkeleton />;

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto bg-white">

      <PageHeader title={`Bonjour ${userName ?? ""}`} />

      {/* Hero */}
      <div className="px-5 pt-6 pb-6 bg-white">

        {/* PearlHero */}
        {cyclePhase && cycleDay ? (
          <div className="mb-3">
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

        {/* Conseil du jour — 1 seul, le plus prioritaire */}
        <div className="flex flex-col gap-2 mb-3">
          {adviceLoading ? (
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-border/10">
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
            advices.slice(0, 1).map((conseil) => (
              <AdviceCard key={conseil.id} conseil={conseil} />
            ))
          ) : (
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-border/10">
              <Sparkles size={16} strokeWidth={1.5} className="text-primary flex-shrink-0" />
              <p className="text-sm text-muted-foreground">Votre conseil arrive bientôt</p>
            </div>
          )}
          {advices.length > 0 && (
            <button
              onClick={() => navigate("/weekly-plan")}
              className="text-[11px] text-muted-foreground hover:underline underline-offset-2 text-right pr-1 -mt-1"
            >
              Voir le plan de la semaine →
            </button>
          )}
        </div>

      </div>

      {/* Graphiques tendances */}
      <div className="px-5 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1 mb-3">
          Tendances · 30 derniers jours
        </p>

        {/* 1 — Régularité routine */}
        <div className="bg-[#F8F6F2] rounded-2xl p-4 mb-3">
          <p className="text-xs font-semibold text-foreground mb-2">Régularité routine</p>
          {routineChartData.length < 7 ? (
            <p className="text-xs text-muted-foreground text-center py-5">
              Continue ta routine pour voir tes tendances apparaître 🌱
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={routineChartData} barSize={5} barCategoryGap="30%">
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis hide domain={[0, 2]} />
                  <Tooltip
                    formatter={(v: number, key: string) => [v === 1 ? "Faite ✓" : "Manquée", key === "matin" ? "Matin" : "Soir"]}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.95)" }}
                  />
                  <Bar dataKey="matin" stackId="a" fill="#2C1810" radius={[0, 0, 2, 2]} />
                  <Bar dataKey="soir"  stackId="a" fill="#C4A882" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center mt-1">
                {([["#2C1810","Matin"],["#C4A882","Soir"]] as [string,string][]).map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: c }} />
                    <span className="text-[10px] text-muted-foreground">{l}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 2 — Évolution symptômes */}
        <div className="bg-[#F8F6F2] rounded-2xl p-4 mb-3">
          <p className="text-xs font-semibold text-foreground mb-2">Évolution symptômes</p>
          {symptomChartData.length < 7 ? (
            <p className="text-xs text-muted-foreground text-center py-5">
              Continue ta routine pour voir tes tendances apparaître 🌱
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={symptomChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[-1, 1]} ticks={[-1, 0, 1]} tickFormatter={(v) => v === 1 ? "↑" : v === -1 ? "↓" : "—"}
                  tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} width={16} />
                <Tooltip
                  formatter={(v: number) => [v > 0 ? "S'améliore" : v < 0 ? "Se détériore" : "Stable", "Peau"]}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.95)" }}
                />
                <Line type="monotone" dataKey="score" stroke="#2C1810" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 3 — Facteurs vs peau */}
        <div className="bg-[#F8F6F2] rounded-2xl p-4 mb-3">
          <p className="text-xs font-semibold text-foreground mb-2">Facteurs & peau</p>
          {factorsChartData.length < 7 ? (
            <p className="text-xs text-muted-foreground text-center py-5">
              Continue ta routine pour voir tes tendances apparaître 🌱
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={factorsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis domain={[0, 5]} hide />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.95)" }}
                    formatter={(v: number, key: string) => {
                      const labels: Record<string, string> = { stress: "Stress", sleep: "Sommeil", food: "Alimentation", peau: "Peau" };
                      return [v, labels[key] ?? key];
                    }}
                  />
                  <Line type="monotone" dataKey="stress" stroke="#E07070" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="sleep"  stroke="#70A0D0" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="food"   stroke="#70C090" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="peau"   stroke="#2C1810" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-3 justify-center mt-1 flex-wrap">
                {([["#E07070","Stress"],["#70A0D0","Sommeil"],["#70C090","Alimentation"],["#2C1810","Peau"]] as [string,string][]).map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                    <span className="text-[10px] text-muted-foreground">{l}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bouton flottant : régénérer la routine */}
      <button
        onClick={() => navigate("/daily-conversation")}
        className="fixed bottom-20 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-50 transition-transform active:scale-95"
        style={{ background: "#2C1810" }}
        aria-label="Régénérer ma routine"
      >
        <RefreshCw size={22} strokeWidth={1.8} className="text-white" />
      </button>

    </div>
  );
};

export default Dashboard;
