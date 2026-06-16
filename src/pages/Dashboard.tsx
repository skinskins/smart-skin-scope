import { useNavigate } from "react-router-dom";
import { Sparkles, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { calculateCyclePhase } from "@/utils/cycle";
import { PearlHero } from "@/components/PearlHero";
import { PageHeader } from "@/components/PageHeader";
import { motion } from "framer-motion";
import { AdviceCard, Conseil } from "@/components/AdviceCard";

type RoutineLogRow = { date: string; morning_routine_done: boolean | null; evening_routine_done: boolean | null };
type SkinPhotoRow  = { date: string; analysis_json: any; storage_path: string; publicUrl?: string };

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

// ── helpers ──────────────────────────────────────────────────────────────────

const nextCycleEvent = (cycleDay: number, cycleDuration: number): string => {
  const ovDay  = Math.max(1, cycleDuration - 14);
  const daysToOv     = ovDay - cycleDay;
  const daysToPeriod = cycleDuration - cycleDay;

  if (daysToOv > 0 && daysToOv <= 5)
    return `Ovulation dans ${daysToOv} jour${daysToOv > 1 ? "s" : ""}`;
  if (daysToOv === 0)
    return "Pic d'ovulation aujourd'hui";
  if (daysToPeriod <= 5 && daysToPeriod > 0)
    return `Règles dans ${daysToPeriod} jour${daysToPeriod > 1 ? "s" : ""}`;
  if (daysToPeriod === 0)
    return "Début des règles aujourd'hui";
  if (daysToPeriod < 0)
    return "Règles en cours";
  return `Règles dans ${daysToPeriod} jour${daysToPeriod > 1 ? "s" : ""}`;
};

// ── composant ────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const [checkinStatus] = useState<"loading" | "done">("done");
  const [routineProducts, setRoutineProducts] = useState<any[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [lastPeriodDate, setLastPeriodDate] = useState<string>("");
  const [cycleDuration, setCycleDuration] = useState<number>(28);
  const [manualLocation, setManualLocationState] = useState<string | null>(
    () => localStorage.getItem("manualLocation")
  );
  const [streakCount, setStreakCount] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [streakLoaded, setStreakLoaded] = useState(false);
  const [advices, setAdvices] = useState<Conseil[]>([]);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [skinPhotos, setSkinPhotos] = useState<SkinPhotoRow[]>([]);
  const navigate = useNavigate();

  const { weather: liveWeather } = useWeatherData(manualLocation || undefined);

  // ── Routine produits ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRoutineProducts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const isMorning = new Date().getHours() < 15;
      const { data } = await (supabase as any)
        .from("user_products")
        .select("id, product_name, brand, photo_url, product_type")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .eq(isMorning ? "morning_use" : "evening_use", true)
        .limit(8);
      if (data) setRoutineProducts(data);
    };
    fetchRoutineProducts();
  }, []);

  // ── Profil + cycle ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      if (session.user.user_metadata?.first_name) {
        setUserName(session.user.user_metadata.first_name);
      }
      const { data } = await (supabase as any)
        .from("profiles")
        .select("manual_location, last_period_date, cycle_duration")
        .eq("id", session.user.id)
        .single();
      if (data?.manual_location) setManualLocationState(data.manual_location);
      if (data?.last_period_date) setLastPeriodDate(data.last_period_date);
      if (data?.cycle_duration)   setCycleDuration(data.cycle_duration);
    };
    fetchProfile();
  }, []);

  // ── Sauvegarde météo ──────────────────────────────────────────────────────
  useEffect(() => {
    if (liveWeather.locationName === "...") return;
    const save = async () => {
      const hour = new Date().getHours();
      if (hour < 11 || hour >= 15) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const today = new Date().toISOString().split("T")[0];
      await (supabase as any)
        .from("daily_weather")
        .upsert(
          { user_id: session.user.id, date: today, temp: liveWeather.temp, uv: liveWeather.uv, pollution: liveWeather.pollution },
          { onConflict: "user_id,date", ignoreDuplicates: true }
        );
    };
    save();
  }, [liveWeather]);

  // ── Auth listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserName(session?.user?.user_metadata?.first_name ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Streak routine ────────────────────────────────────────────────────────
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
        (data as RoutineLogRow[])
          .filter(r => r.morning_routine_done || r.evening_routine_done)
          .map(r => r.date)
      );

      let streak = 0;
      const cursor = new Date();
      while (done.has(cursor.toISOString().split("T")[0])) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }

      let week = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        if (done.has(d.toISOString().split("T")[0])) week++;
      }

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

  // ── Conseil du jour ───────────────────────────────────────────────────────
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

      if (data) {
        setAdvices([{ id: "today-advice", advice_title: data.advice_title, advice_text: data.advice_text, advice_tip: "", advice_group: "astuce", priority: "normal" }]);
        return;
      }

      setAdviceLoading(true);
      try {
        const { error, data: genData } = await supabase.functions.invoke("generate-advice", {
          body: { user_id: session.user.id },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (error) return;
        if (genData?.conseils?.length > 0) {
          const ORDER: Record<string, number> = { alerte: 0, warning: 0, astuce: 1, observation: 2 };
          setAdvices([...genData.conseils].sort((a: any, b: any) => (ORDER[a.advice_group] ?? 3) - (ORDER[b.advice_group] ?? 3)));
          return;
        }
        const { data: fresh } = await (supabase as any)
          .from("daily_advice_log").select("advice_title, advice_text")
          .eq("user_id", session.user.id).eq("date", today).maybeSingle();
        if (fresh) setAdvices([{ id: "today-advice-fresh", advice_title: fresh.advice_title, advice_text: fresh.advice_text, advice_tip: "", advice_group: "astuce", priority: "normal" }]);
      } finally {
        setAdviceLoading(false);
      }
    };
    fetchAdvice();
  }, []);

  // ── Photos de peau (2 dernières) ──────────────────────────────────────────
  useEffect(() => {
    const fetchSkinPhotos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await (supabase as any)
        .from("skin_photos")
        .select("date, analysis_json, storage_path")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .limit(2);
      if (!data?.length) return;
      const withUrls: SkinPhotoRow[] = await Promise.all(
        data.map(async (row: SkinPhotoRow) => {
          const { data: signed } = await supabase.storage
            .from("skin-photos")
            .createSignedUrl(row.storage_path, 3600);
          return { ...row, publicUrl: signed?.signedUrl ?? undefined };
        })
      );
      setSkinPhotos(withUrls);
    };
    fetchSkinPhotos();
  }, []);

  // ── Cycle ─────────────────────────────────────────────────────────────────
  const cycleCalc  = lastPeriodDate ? calculateCyclePhase(lastPeriodDate, cycleDuration, 5) : null;
  const cyclePhase = cycleCalc?.phase ?? null;
  const cycleDay   = cycleCalc?.day   ?? null;

  // ── Skin score ────────────────────────────────────────────────────────────
  const today     = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const photoToday = skinPhotos.find(p => p.date === today);
  const photoYest  = skinPhotos.find(p => p.date === yesterday)
    ?? (skinPhotos.length > 1 && skinPhotos[0].date !== today ? skinPhotos[1] : null)
    ?? (skinPhotos.length > 1 ? skinPhotos[1] : null);


  if (checkinStatus === "loading") return <DashboardSkeleton />;

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto bg-white">

      <PageHeader title={`Bonjour ${userName ?? ""}`} />

      {/* Hero */}
      <div className="px-5 pt-6 pb-3 bg-white">
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

        {/* Routine du jour */}
        {routineProducts.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              {new Date().getHours() < 15 ? "Routine du matin" : "Routine du soir"}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {routineProducts.map(p => (
                <div key={p.id} className="flex flex-col items-center gap-1 shrink-0 w-14">
                  <div className="w-12 h-12 rounded-xl bg-muted/30 border border-border/40 overflow-hidden flex items-center justify-center">
                    {p.photo_url
                      ? <img src={p.photo_url} alt={p.product_name} className="w-full h-full object-contain" />
                      : <ImageOff size={14} className="text-muted-foreground/40" />}
                  </div>
                  <p className="text-[9px] text-muted-foreground text-center leading-tight truncate w-full">{p.brand || p.product_name}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/routine-player")}
              className="w-full mt-3 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase transition active:scale-95"
            >
              Commencer la routine
            </button>
          </div>
        )}

        {/* Conseil du jour */}
        <div className="flex flex-col gap-2 mb-1">
          {adviceLoading ? (
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-border/10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent flex-shrink-0"
              />
              <p className="text-[12px] text-muted-foreground">Vos conseils personnalisés sont en cours de préparation...</p>
            </div>
          ) : advices.length > 0 ? (
            advices.slice(0, 1).map((conseil) => <AdviceCard key={conseil.id} conseil={conseil} />)
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

      {/* ── Métriques ────────────────────────────────────────────────────── */}
      <div className="px-5 pb-6 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-2 pb-1">
          Mes métriques
        </p>

        {/* Carte 1 — Streak */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#F8F6F2] rounded-2xl p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Routine</p>
          {streakLoaded && streakCount > 0 ? (
            <div>
              <p className="text-[22px] font-display text-foreground leading-tight">
                🔥 {streakCount} jour{streakCount > 1 ? "s" : ""} consécutif{streakCount > 1 ? "s" : ""}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {weekCount}/7 cette semaine · Meilleure série : {bestStreak}
              </p>
            </div>
          ) : (
            <button
              onClick={() => navigate("/routine-player")}
              className="text-[13px] text-primary font-semibold"
            >
              Commence ta streak ce soir →
            </button>
          )}
        </motion.div>

        {/* Carte 2 — Phase cycle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#F8F6F2] rounded-2xl p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Cycle</p>
          {cyclePhase && cycleDay ? (
            <div>
              <p className="text-[20px] font-display text-foreground leading-tight">
                {cyclePhase} · Jour {cycleDay}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                {nextCycleEvent(cycleDay, cycleDuration)}
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              Renseigne ta date de règles dans ton profil pour voir ta phase
            </p>
          )}
        </motion.div>

        {/* Carte 3 — Météo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#F8F6F2] rounded-2xl p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Météo du jour</p>
          {liveWeather.locationName !== "..." ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[22px] font-display text-foreground">{liveWeather.temp ?? "—"}°</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Temp.</p>
              </div>
              <div>
                <p className="text-[22px] font-display text-foreground">{liveWeather.uv ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">UV</p>
              </div>
              <div>
                <p className="text-[22px] font-display text-foreground">{liveWeather.humidity ?? "—"}%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Humidité</p>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">Météo en cours de chargement…</p>
          )}
        </motion.div>

        {/* Carte 4 — Comparaison photos */}
        {skinPhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#F8F6F2] rounded-2xl p-4"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Évolution</p>
            {skinPhotos.length >= 2 ? (
              <div className="flex gap-3">
                {[skinPhotos[1], skinPhotos[0]].map((photo, i) => (
                  <div key={photo.date} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-muted/20">
                      {photo.publicUrl ? (
                        <img src={photo.publicUrl} alt={photo.date} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff size={18} className="text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {i === 0 ? "Avant" : "Aujourd'hui"}
                    </p>
                    {photo.analysis_json?.eclat_global != null && (
                      <p className="text-[11px] font-semibold text-foreground">
                        Éclat {photo.analysis_json.eclat_global}/10
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-muted/20">
                    {skinPhotos[0].publicUrl ? (
                      <img src={skinPhotos[0].publicUrl} alt={skinPhotos[0].date} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff size={18} className="text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Aujourd'hui</p>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-2 pt-4">
                  <p className="text-[12px] text-muted-foreground text-center leading-snug">
                    Reviens demain pour voir l'évolution
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
