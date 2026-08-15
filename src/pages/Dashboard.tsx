import { useNavigate } from "react-router-dom";
import { Sparkles, ImageOff, Plus, RefreshCw, Camera, ChevronRight, Calendar } from "lucide-react";
import { ProductPhoto } from "@/components/ProductPhoto";
import { ProductTypeIcon } from "@/components/ProductTypeIcon";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { calculateCyclePhase } from "@/utils/cycle";
import { PearlHero } from "@/components/PearlHero";
import { PageHeader } from "@/components/PageHeader";
import { motion } from "framer-motion";
import { AdviceCard, Conseil, pilierGroupFromPriority } from "@/components/AdviceCard";
import { BetaWelcomeModal } from "@/components/BetaWelcomeModal";

type RoutineLogRow = { date: string; morning_routine_done: boolean | null; evening_routine_done: boolean | null };
type SkinPhotoRow = { date: string; analysis_json: any; storage_path: string; publicUrl?: string };

// Doit rester synchro avec MAX_MANUAL_REGENS_PER_WEEK côté generate-weekly-advice (et WeeklyPlan.tsx).
const MAX_MANUAL_REGENS_PER_WEEK = 2;

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

// Formate une Date en YYYY-MM-DD à partir de ses composants LOCAUX (jamais toISOString,
// qui convertit en UTC et décale la date d'un jour pour tout fuseau en avance sur UTC —
// ex. Europe l'été — au moment où on repasse par une string calendaire).
const toLocalISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const todayLocalISO = (): string => toLocalISODate(new Date());

// Renvoie le lundi (YYYY-MM-DD) de la semaine d'une date donnee — doit rester cohérent
// avec getMonday() côté generate-weekly-advice (qui tourne en UTC serveur, donc sans ce
// piège de fuseau).
const getMonday = (dateStr: string): string => {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalISODate(d);
};

// generate-weekly-advice renvoie { error: "message propre" } en JSON — on l'extrait plutôt
// que d'afficher le JSON brut ou une exception générique (identique à WeeklyPlan.tsx).
const extractInvokeErrorMessage = async (error: any): Promise<string> => {
  const raw = error?.context
    ? await (error.context as Response).text().catch(() => error.message)
    : error?.message ?? "Erreur inconnue";
  try {
    return JSON.parse(raw)?.error ?? raw;
  } catch {
    return raw;
  }
};

const nextCycleEvent = (cycleDay: number, cycleDuration: number): string => {
  const ovDay = Math.max(1, cycleDuration - 14);
  const daysToOv = ovDay - cycleDay;
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
  const [routineTreated, setRoutineTreated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [lastPeriodDate, setLastPeriodDate] = useState<string>("");
  const [cycleDuration, setCycleDuration] = useState<number>(28);
  const [manualLocation, setManualLocationState] = useState<string | null>(
    () => localStorage.getItem("manualLocation")
  );
  const [streakCount, setStreakCount] = useState(0);
  const [streakLoaded, setStreakLoaded] = useState(false);
  const [advices, setAdvices] = useState<Conseil[]>([]);
  const [adviceGenerating, setAdviceGenerating] = useState(false);
  const [adviceError, setAdviceError] = useState(false);
  const [regensRemaining, setRegensRemaining] = useState<number | null>(null);
  const [adviceUpdating, setAdviceUpdating] = useState(false);
  const [adviceUpdateError, setAdviceUpdateError] = useState<string | null>(null);
  const [skinPhotos, setSkinPhotos] = useState<SkinPhotoRow[]>([]);
  const [weekPhotoTaken, setWeekPhotoTaken] = useState<boolean | null>(null);
  const autoGeneratedRef = useRef(false);
  const navigate = useNavigate();

  const { weather: liveWeather } = useWeatherData(manualLocation || undefined);

  // ── Routine produits — daily_routine_log en priorité, fallback user_products ─
  const fetchRoutineProducts = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const isMorning = new Date().getHours() < 15;
    const today = new Date().toISOString().split("T")[0];

    const { data: logData } = await (supabase as any)
      .from("daily_routine_log")
      .select("product_ids")
      .eq("user_id", session.user.id)
      .eq("date", today)
      .eq("period", isMorning ? "morning" : "evening")
      .maybeSingle();

    if (logData?.product_ids?.length > 0) {
      const { data: products } = await (supabase as any)
        .from("user_products")
        .select("id, product_name, brand, photo_url, product_type")
        .in("id", logData.product_ids);
      if (products) {
        const ordered = logData.product_ids
          .map((id: string) => products.find((p: any) => p.id === id))
          .filter(Boolean);
        setRoutineProducts(ordered);
        setRoutineTreated(true);
        return;
      }
    }

    setRoutineTreated(!!logData);
    if (!logData) {
      setRoutineProducts([]);
      return;
    }

    // Fallback (routine traitee mais vide) : produits quotidiens actifs
    const { data: fallback } = await (supabase as any)
      .from("user_products")
      .select("id, product_name, brand, photo_url, product_type")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .eq(isMorning ? "morning_use" : "evening_use", true)
      .eq("frequency", "daily")
      .limit(8);
    if (fallback) setRoutineProducts(fallback);
  }, []);

  useEffect(() => { fetchRoutineProducts(); }, [fetchRoutineProducts]);

  // ── Photo de la semaine prise ? ───────────────────────────────────────────
  const [photoPendingRetry, setPhotoPendingRetry] = useState(false);
  useEffect(() => {
    setPhotoPendingRetry(localStorage.getItem("nacre_photo_pending_retry") === "1");
  }, []);

  // ── Bienvenue bêta (une seule fois, juste après la fin de l'onboarding) ───
  const [showBetaWelcome, setShowBetaWelcome] = useState(false);
  useEffect(() => {
    setShowBetaWelcome(localStorage.getItem("nacre_show_beta_welcome") === "1");
  }, []);
  const dismissBetaWelcome = () => {
    localStorage.removeItem("nacre_show_beta_welcome");
    setShowBetaWelcome(false);
  };
  useEffect(() => {
    const checkWeekPhoto = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Lundi de la semaine ISO en cours
      const now = new Date();
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diff);
      const mondayStr = monday.toISOString().split("T")[0];

      const { data } = await (supabase as any)
        .from("skin_photos")
        .select("id")
        .eq("user_id", session.user.id)
        .gte("date", mondayStr)
        .limit(1);

      setWeekPhotoTaken((data?.length ?? 0) > 0);
    };
    checkWeekPhoto();
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
      if (data?.cycle_duration) setCycleDuration(data.cycle_duration);
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

      setStreakCount(streak);
      setStreakLoaded(true);
    };
    fetchStreak();
  }, []);

  // ── Conseils de la semaine (pilliers) ───────────────────────────────────────
  // Régénérés une fois par semaine (jamais chaque jour) — generate-weekly-advice gère
  // elle-même le cache hebdomadaire côté serveur, donc rappeler sans force ici ne
  // déclenche une vraie génération que si la semaine n'a encore rien produit.
  const fetchAdvice = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const weekStart = getMonday(todayLocalISO());

    const { data: existing } = await (supabase as any)
      .from("weekly_advice_log")
      .select("id, advice_title, advice_text, advice_tip, priority, advice_group")
      .eq("user_id", session.user.id)
      .eq("week_start", weekStart)
      .order("priority", { ascending: true });

    if (existing && existing.length > 0) {
      setAdvices(existing.map((c: any) => ({ ...c, advice_group: c.advice_group ?? pilierGroupFromPriority(c.priority) })));
      setAdviceError(false);
      return;
    }

    // Aucun conseil pour cette semaine → générer automatiquement (une seule fois)
    if (autoGeneratedRef.current) return;
    autoGeneratedRef.current = true;
    setAdviceGenerating(true);
    setAdviceError(false);
    try {
      const { error } = await supabase.functions.invoke("generate-weekly-advice", { body: {} });
      if (error) throw error;
      const { data: fresh } = await (supabase as any)
        .from("weekly_advice_log")
        .select("id, advice_title, advice_text, advice_tip, priority, advice_group")
        .eq("user_id", session.user.id)
        .eq("week_start", weekStart)
        .order("priority", { ascending: true });
      if (fresh && fresh.length > 0) {
        setAdvices(fresh.map((c: any) => ({ ...c, advice_group: c.advice_group ?? pilierGroupFromPriority(c.priority) })));
      } else {
        setAdviceError(true);
      }
    } catch (err) {
      console.error("[dashboard] weekly advice generation failed:", err);
      setAdviceError(true);
    } finally {
      setAdviceGenerating(false);
    }
  }, []);

  // Lit le compteur de mises à jour manuelles directement en base (identique à WeeklyPlan.tsx) —
  // utile même quand generate-weekly-advice n'a pas été rappelée (conseils déjà en cache).
  const fetchAdviceLimits = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const weekStart = getMonday(todayLocalISO());
    const { data } = await (supabase as any)
      .from("profiles")
      .select("weekly_advice_regen_count, weekly_advice_regen_week")
      .eq("id", session.user.id)
      .single();
    if (!data) return;
    const used = data.weekly_advice_regen_week === weekStart ? (data.weekly_advice_regen_count ?? 0) : 0;
    setRegensRemaining(Math.max(0, MAX_MANUAL_REGENS_PER_WEEK - used));
  }, []);

  useEffect(() => {
    fetchAdvice().then(fetchAdviceLimits);
  }, [fetchAdvice, fetchAdviceLimits]);

  const handleRetryAdvice = () => {
    autoGeneratedRef.current = false;
    fetchAdvice().then(fetchAdviceLimits);
  };

  // Mise à jour manuelle des conseils — plafonnée côté serveur (generate-weekly-advice),
  // même cap et même bouton que WeeklyPlan.tsx, mais accessible directement depuis le Dashboard.
  const handleUpdateAdvice = async () => {
    if (adviceUpdating || regensRemaining === 0) return;
    setAdviceUpdating(true);
    setAdviceUpdateError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { error } = await supabase.functions.invoke("generate-weekly-advice", { body: { force: true } });
      if (error) throw new Error(await extractInvokeErrorMessage(error));
      const weekStart = getMonday(todayLocalISO());
      const { data: fresh } = await (supabase as any)
        .from("weekly_advice_log")
        .select("id, advice_title, advice_text, advice_tip, priority, advice_group")
        .eq("user_id", session.user.id)
        .eq("week_start", weekStart)
        .order("priority", { ascending: true });
      if (fresh && fresh.length > 0) {
        setAdvices(fresh.map((c: any) => ({ ...c, advice_group: c.advice_group ?? pilierGroupFromPriority(c.priority) })));
        setAdviceError(false);
      }
      await fetchAdviceLimits();
    } catch (err) {
      console.error("[dashboard] advice update error:", err);
      setAdviceUpdateError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setAdviceUpdating(false);
    }
  };

  // Prochaine génération automatique = lundi de la semaine suivante (cache hebdomadaire
  // côté generate-weekly-advice, cf. §3 des notes de recherche).
  const nextAdviceUpdateLabel = (() => {
    const weekStart = getMonday(todayLocalISO());
    const next = new Date(weekStart + "T00:00:00");
    next.setDate(next.getDate() + 7);
    return next.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  })();

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
  const cycleCalc = lastPeriodDate ? calculateCyclePhase(lastPeriodDate, cycleDuration, 5) : null;
  const cyclePhase = cycleCalc?.phase ?? null;
  const cycleDay = cycleCalc?.day ?? null;

  // ── Skin score ────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const photoToday = skinPhotos.find(p => p.date === today);
  const photoYest = skinPhotos.find(p => p.date === yesterday)
    ?? (skinPhotos.length > 1 && skinPhotos[0].date !== today ? skinPhotos[1] : null)
    ?? (skinPhotos.length > 1 ? skinPhotos[1] : null);


  if (checkinStatus === "loading") return <DashboardSkeleton />;

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto bg-white">

      <PageHeader title={`Bonjour ${userName ?? ""}`} />

      {/* Invitation photo hebdo (banniere fine, disparait une fois la photo prise) */}
      {weekPhotoTaken === false && (
        <div className="px-5 pt-3">
          <button
            onClick={() => navigate(`/suivi/${today}`)}
            className="w-full flex items-center gap-3 py-2.5 text-left group"
          >
            <Camera size={16} strokeWidth={1.8} className="text-primary flex-shrink-0" />
            <p className="flex-1 text-[13px] text-foreground/80">
              <span className="font-semibold text-foreground">Photo de la semaine</span> — pour une analyse à jour
            </p>
            <ChevronRight size={16} className="text-muted-foreground/60 flex-shrink-0 group-active:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}
      {photoPendingRetry && (
        <div className="px-5 pt-3">
          <button
            onClick={() => {
              localStorage.removeItem("nacre_photo_pending_retry");
              setPhotoPendingRetry(false);
              navigate(`/suivi/${today}`);
            }}
            className="w-full flex items-center gap-3 py-2.5 px-3 rounded-2xl bg-amber-50 border border-amber-100 text-left group"
          >
            <Camera size={16} strokeWidth={1.8} className="text-amber-600 flex-shrink-0" />
            <p className="flex-1 text-[13px] text-amber-800">
              <span className="font-semibold">Ta photo n'a pas pu être analysée</span> — reprends-en une pour une analyse complète
            </p>
            <ChevronRight size={16} className="text-amber-600/60 flex-shrink-0 group-active:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* Hero */}
      <div className="px-5 pt-6 pb-3 bg-white">
        <div className="mb-3">
          <PearlHero
            hidePhotoButton
            firstName={userName ?? undefined}
            cyclePhase={cyclePhase as "Folliculaire" | "Ovulatoire" | "Lutéale" | "Menstruelle" | null}
            cycleDay={cycleDay}
            cycleDuration={cycleDuration}
            weather={{ uv_index: liveWeather.uv ?? 0 }}
            streakCount={streakCount}
          />
        </div>

        {/* Conseil du jour */}
        <div className="flex flex-col gap-2 mb-1">
          {advices.length > 0 ? (
            advices.map((conseil) => <AdviceCard key={conseil.id} conseil={conseil} />)
          ) : adviceGenerating ? (
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-border/10">
              <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
              <p className="text-sm text-muted-foreground">Préparation de votre conseil…</p>
            </div>
          ) : adviceError ? (
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-border/10">
              <Sparkles size={16} strokeWidth={1.5} className="text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground flex-1">
                Impossible de préparer votre conseil pour l'instant.
              </p>
              <button
                onClick={handleRetryAdvice}
                className="text-[11px] font-semibold text-primary shrink-0"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-border/10">
              <Sparkles size={16} strokeWidth={1.5} className="text-primary flex-shrink-0" />
              <p className="text-sm text-muted-foreground">Chargement de vos conseils…</p>
            </div>
          )}
          {advices.length > 0 && (
            <>
              <button
                onClick={() => navigate("/weekly-plan")}
                className="text-[11px] text-muted-foreground hover:underline underline-offset-2 text-right pr-1"
              >
                Voir le plan de la semaine →
              </button>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl bg-gradient-to-br from-primary/[0.06] via-primary/[0.03] to-transparent border border-primary/10 p-4 mt-1"
              >
                <div className="flex items-start gap-2.5 mb-3.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar size={14} className="text-primary" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[12.5px] font-semibold text-foreground leading-tight">
                      Actualisation automatique
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                      {nextAdviceUpdateLabel}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleUpdateAdvice}
                  disabled={adviceUpdating || regensRemaining === 0}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40"
                >
                  <RefreshCw size={12} className={adviceUpdating ? "animate-spin" : ""} />
                  {adviceUpdating
                    ? "Mise à jour..."
                    : regensRemaining === 0
                      ? "Limite atteinte"
                      : "Mettre à jour mes conseils"}
                </button>

                {regensRemaining !== null && (
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    {regensRemaining > 0
                      ? `${regensRemaining} mise${regensRemaining > 1 ? "s" : ""} à jour manuelle${regensRemaining > 1 ? "s" : ""} disponible${regensRemaining > 1 ? "s" : ""} cette semaine`
                      : "Prochaines mises à jour manuelles dès la semaine prochaine"}
                  </p>
                )}
                {adviceUpdateError && (
                  <p className="text-[10px] text-destructive text-center mt-1.5">{adviceUpdateError}</p>
                )}
              </motion.div>
            </>
          )}
        </div>

        {/* Routine du jour — rassemble aussi la streak (auparavant dupliquee comme carte
            "Routine" a part dans Mes metriques) */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {routineProducts.length > 0
                ? (new Date().getHours() < 15 ? "Routine du matin" : "Routine du soir")
                : "Ma routine"}
            </p>
            {streakLoaded && streakCount > 0 && (
              <p className="text-[11px] font-semibold text-foreground shrink-0">
                🔥 {streakCount} jour{streakCount > 1 ? "s" : ""} consécutif{streakCount > 1 ? "s" : ""}
              </p>
            )}
          </div>

          {!routineTreated && routineProducts.length > 0 ? (
            <div className="w-full py-4 rounded-2xl border border-dashed border-border/40 bg-muted/10 text-sm text-muted-foreground flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
              Routine en cours de préparation...
            </div>
          ) : routineProducts.length > 0 ? (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {routineProducts.map(p => (
                  <div key={p.id} className="flex flex-col items-center gap-1 shrink-0 w-14">
                    <div className="w-12 h-12 rounded-xl bg-muted/30 border border-border/40 overflow-hidden flex items-center justify-center">
                      <ProductTypeIcon type={p.product_type} size={28} />
                    </div>
                    <p className="text-[9px] text-muted-foreground text-center leading-tight truncate w-full">{p.product_name || p.brand}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate("/vanity")}
                className="w-full mt-3 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase transition active:scale-95"
              >
                Commencer la routine
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/vanity")}
              className="w-full py-4 rounded-2xl border border-dashed border-border/40 bg-muted/10 text-sm text-muted-foreground flex items-center justify-center gap-2 transition hover:bg-muted/20"
            >
              <Plus size={14} />
              Ajouter mes premiers produits
            </button>
          )}
        </div>
      </div>

      {/* ── Métriques ────────────────────────────────────────────────────── */}
      <div className="px-5 pb-6 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-2 pb-1">
          Mes métriques
        </p>

        {/* Carte 1 — Phase cycle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
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
            <button
              onClick={() => navigate("/profile")}
              className="text-[13px] text-primary font-semibold text-left"
            >
              Renseigne ta date de règles →
            </button>
          )}
        </motion.div>

        {/* Carte 2 — Météo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
            <div className="grid grid-cols-3 gap-2 text-center">
              {["Temp.", "UV", "Humidité"].map(label => (
                <div key={label}>
                  <div className="h-7 bg-[#EDE9E3] rounded-lg animate-pulse mb-1.5 mx-auto w-14" />
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Carte 3 — Comparaison photos (masquee en V0, jugee inutile sur le dashboard - backlog) */}
        {false && skinPhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
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

      <BetaWelcomeModal open={showBetaWelcome} onClose={dismissBetaWelcome} />
    </div>
  );
};

export default Dashboard;
