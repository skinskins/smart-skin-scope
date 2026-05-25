import { useNavigate } from "react-router-dom";
import { MessageCircle, Sparkles } from "lucide-react";
import { FactorsModal } from "@/components/FactorsModal";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { calculateCyclePhase } from "@/utils/cycle";
import { PearlHero } from "@/components/PearlHero";
import { PageHeader } from "@/components/PageHeader";

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
  const [advice, setAdvice] = useState<{ advice_title: string; advice_text: string } | null>(null);
  const [showFactorsModal, setShowFactorsModal] = useState(false);
  const navigate = useNavigate();

  const { weather: liveWeather } = useWeatherData(manualLocation || undefined);

  // Guard : redirect to daily conversation if checkin not done yet today
  useEffect(() => {
    const checkDailyCheckin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setCheckinStatus("done");
        return;
      }
      const today = new Date().toISOString().split("T")[0];
      const { data } = await (supabase as any)
        .from("daily_checkins")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .maybeSingle();
      if (!data) {
        navigate("/daily-conversation", { replace: true });
      } else {
        setCheckinStatus("done");
      }
    };
    checkDailyCheckin();
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
    console.log("[WeatherSave] liveWeather changed:", liveWeather);
    if (liveWeather.locationName === "...") return;
    const save = async () => {
      const hour = new Date().getHours();
      if (hour < 11 || hour >= 15) { console.log("[WeatherSave] hors fenêtre 11h-15h, skip UV"); return; }
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


  const cycleCalc = lastPeriodDate
    ? calculateCyclePhase(lastPeriodDate, cycleDuration, 5)
    : null;
  const cyclePhase = cycleCalc?.phase ?? null;
  const cycleDay   = cycleCalc?.day   ?? null;
  console.log("[CycleDebug] lastPeriodDate:", lastPeriodDate, "| cycleDuration:", cycleDuration, "| phase:", cyclePhase, "| day:", cycleDay);

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

      </div>

      {/* Bouton flottant IA */}
      <button
        onClick={() => navigate("/daily-conversation")}
        className="fixed bottom-20 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-50 transition-transform active:scale-95"
        style={{ background: "#2C1810" }}
        aria-label="Ouvrir la conversation"
      >
        <MessageCircle size={22} strokeWidth={1.8} className="text-white" />
      </button>

    </div>
  );
};

export default Dashboard;
