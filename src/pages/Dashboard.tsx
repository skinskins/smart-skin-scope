import { useNavigate } from "react-router-dom";
import { Sparkles, ImageOff, Plus, RefreshCw, Camera, ChevronRight, ChevronLeft, Calendar, Sun, Moon, Droplets, CloudSun, Activity } from "lucide-react";
import { ProductPhoto } from "@/components/ProductPhoto";
import { ProductTypeIcon } from "@/components/ProductTypeIcon";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { calculateCyclePhase } from "@/utils/cycle";
import { PearlHero } from "@/components/PearlHero";
import { PageHeader } from "@/components/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { AdviceCard, Conseil, pilierGroupFromPriority } from "@/components/AdviceCard";
import { BetaWelcomeModal } from "@/components/BetaWelcomeModal";
import RoutineLoadingMessage, { ADVICE_LOADING_MESSAGES, ADVICE_BUTTON_MESSAGES, RotatingLabel } from "@/components/RoutineLoadingMessage";

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
  const [routineCurating, setRoutineCurating] = useState(false);
  const autoCurationTriggeredRef = useRef(false);
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

  // ── Pile de conseils — la carte du dessus se glisse au doigt (drag), les suivantes
  // depassent derriere en eventail. adviceDirection pilote le sens des transitions
  // d'entree/sortie ; adviceDragTilt fait pencher la carte pendant le glissement.
  const [adviceStackOffset, setAdviceStackOffset] = useState(0);
  const [adviceDirection, setAdviceDirection] = useState<1 | -1>(1);
  const [adviceDragTilt, setAdviceDragTilt] = useState(0);
  const stackedAdvices = advices.length > 0
    ? advices.map((_, i) => advices[(i + adviceStackOffset) % advices.length])
    : [];
  const cycleAdviceStack = (dir: 1 | -1) => {
    if (advices.length === 0) return;
    setAdviceDirection(dir);
    setAdviceStackOffset(o => (o + dir + advices.length) % advices.length);
  };

  const { weather: liveWeather } = useWeatherData(manualLocation || undefined);

  // Hydrate routineProducts a partir d'une liste ordonnee de product_id (routine curee).
  const hydrateRoutineProducts = useCallback(async (productIds: string[]) => {
    if (productIds.length === 0) { setRoutineProducts([]); return; }
    const { data: products } = await (supabase as any)
      .from("user_products")
      .select("id, product_name, brand, photo_url, product_type")
      .in("id", productIds);
    if (!products) { setRoutineProducts([]); return; }
    const ordered = productIds
      .map((id: string) => products.find((p: any) => p.id === id))
      .filter(Boolean);
    setRoutineProducts(ordered);
  }, []);

  // ── Routine produits — daily_routine_log en priorité, curation automatique sinon ─────
  // Meme logique que la page Vanity : la routine affichee est celle decidee par
  // inci-analysis (pertinence au profil), jamais un fallback "tout l'inventaire". Si
  // aucune curation n'existe encore pour aujourd'hui (typiquement juste apres
  // l'onboarding), on la genere directement ici sans obliger a passer par Mes Produits.
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

    if (logData) {
      // Curation deja faite pour ce moment — y compris "0 produit pertinent", un resultat
      // legitime qu'on ne remplace plus par l'inventaire brut.
      await hydrateRoutineProducts(logData.product_ids ?? []);
      return;
    }

    setRoutineProducts([]);

    if (autoCurationTriggeredRef.current) return;

    // Rien a curer si aucun produit quotidien actif (nouvelle utilisatrice sans produits).
    const { count } = await (supabase as any)
      .from("user_products")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .eq("frequency", "daily");
    if (!count) return;

    autoCurationTriggeredRef.current = true;
    setRoutineCurating(true);
    try {
      const [morningRes, eveningRes] = await Promise.all([
        supabase.functions.invoke("inci-analysis", { body: { user_id: session.user.id, period: "morning" } }),
        supabase.functions.invoke("inci-analysis", { body: { user_id: session.user.id, period: "evening" } }),
      ]);
      const currentRes = isMorning ? morningRes : eveningRes;
      const ids = (currentRes.data?.routine ?? []).map((p: any) => p.product_id);
      await hydrateRoutineProducts(ids);
    } catch (err) {
      console.error("[dashboard] curation automatique routine:", err);
    } finally {
      setRoutineCurating(false);
    }
  }, [hydrateRoutineProducts]);

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

      // Lundi de la semaine en cours, en date locale (jamais toISOString — decale d'un
      // jour pour tout fuseau en avance sur UTC, cf. helpers en tete de fichier).
      const mondayStr = getMonday(todayLocalISO());

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
        <div className="flex flex-col gap-2 mb-7">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} strokeWidth={2.2} className="text-primary/70" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Conseils de la semaine
              </p>
            </div>
            {advices.length > 0 && (
              <button
                onClick={() => navigate("/weekly-plan")}
                className="text-[11px] text-muted-foreground hover:underline underline-offset-2"
              >
                Voir le plan →
              </button>
            )}
          </div>

          {advices.length > 0 ? (
            <>
              <div className="relative">
                {/* Aperçu tronqué des cartes suivantes — vrai contenu (icône, catégorie,
                    début du titre), pas juste une forme décorative — effet eventail */}
                {stackedAdvices[2] && (
                  <div className="absolute inset-x-7 top-3 h-14 rounded-[20px] overflow-hidden -z-10 -rotate-2 opacity-55 pointer-events-none">
                    <AdviceCard conseil={stackedAdvices[2]} />
                  </div>
                )}
                {stackedAdvices[1] && (
                  <div className="absolute inset-x-4 top-1.5 h-14 rounded-[20px] overflow-hidden -z-10 rotate-1 opacity-80 pointer-events-none">
                    <AdviceCard conseil={stackedAdvices[1]} />
                  </div>
                )}
                <AnimatePresence mode="popLayout" custom={adviceDirection}>
                  <motion.div
                    key={stackedAdvices[0]?.id}
                    custom={adviceDirection}
                    drag={advices.length > 1 ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.75}
                    onDrag={(_, info) => setAdviceDragTilt(Math.max(-9, Math.min(9, info.offset.x / 9)))}
                    onDragEnd={(_, info) => {
                      setAdviceDragTilt(0);
                      const swiped = Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 500;
                      if (swiped) cycleAdviceStack(info.offset.x < 0 ? 1 : -1);
                    }}
                    variants={{
                      enter: (dir: 1 | -1) => ({ opacity: 0, x: dir * 40, rotate: 0, scale: 0.95 }),
                      center: { opacity: 1, x: 0, rotate: adviceDragTilt, scale: 1 },
                      exit: (dir: 1 | -1) => ({ opacity: 0, x: dir * -320, rotate: dir * -16, scale: 0.96 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    whileTap={{ scale: 0.98 }}
                    className={advices.length > 1 ? "cursor-grab active:cursor-grabbing" : undefined}
                  >
                    <AdviceCard conseil={stackedAdvices[0]} />
                  </motion.div>
                </AnimatePresence>

                {advices.length > 1 && (
                  <>
                    <button
                      onClick={() => cycleAdviceStack(-1)}
                      aria-label="Conseil précédent"
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-7 h-7 rounded-full bg-primary premium-shadow flex items-center justify-center text-primary-foreground transition active:scale-95"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => cycleAdviceStack(1)}
                      aria-label="Conseil suivant"
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 w-7 h-7 rounded-full bg-primary premium-shadow flex items-center justify-center text-primary-foreground transition active:scale-95"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>

              {advices.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-1.5">
                  {advices.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setAdviceStackOffset(i)}
                      aria-label={`Voir le conseil ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        i === adviceStackOffset ? "w-4 bg-primary" : "w-1.5 bg-primary/20"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : adviceGenerating ? (
            <div className="bg-white rounded-2xl p-4 border border-border/10">
              <RoutineLoadingMessage messages={ADVICE_LOADING_MESSAGES} />
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
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mt-2"
              >
                <div className="flex items-center gap-1.5 mb-2 px-0.5">
                  <Calendar size={11} className="text-muted-foreground/70" strokeWidth={2} />
                  <p className="text-[10.5px] text-muted-foreground/80 capitalize">
                    Actualisation automatique {nextAdviceUpdateLabel}
                  </p>
                </div>

                <button
                  onClick={handleUpdateAdvice}
                  disabled={adviceUpdating || regensRemaining === 0}
                  className={`w-full py-2.5 rounded-xl text-[11px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition active:scale-95 ${
                    regensRemaining === 0
                      ? "bg-muted/50 text-muted-foreground border border-border/40 cursor-not-allowed"
                      : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                  }`}
                >
                  <RefreshCw size={12} className={adviceUpdating ? "animate-spin" : ""} />
                  {adviceUpdating ? (
                    <RotatingLabel messages={ADVICE_BUTTON_MESSAGES} />
                  ) : regensRemaining === 0 ? (
                    "Limite atteinte pour cette semaine"
                  ) : (
                    "Mettre à jour mes conseils"
                  )}
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
          )}
        </div>

        {/* Routine du jour — rassemble aussi la streak (auparavant dupliquee comme carte
            "Routine" a part dans Mes metriques) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {new Date().getHours() < 15
                ? <Sun size={12} strokeWidth={2.2} className="text-primary/70" />
                : <Moon size={12} strokeWidth={2.2} className="text-primary/70" />}
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {routineProducts.length > 0
                  ? (new Date().getHours() < 15 ? "Routine du matin" : "Routine du soir")
                  : "Ma routine"}
              </p>
            </div>
            {streakLoaded && streakCount > 0 && (
              <p className="text-[11px] font-semibold text-foreground shrink-0">
                🔥 {streakCount} jour{streakCount > 1 ? "s" : ""} consécutif{streakCount > 1 ? "s" : ""}
              </p>
            )}
          </div>

          {routineCurating ? (
            <div className="w-full py-4 rounded-2xl border border-dashed border-border/40 bg-muted/10">
              <RoutineLoadingMessage />
            </div>
          ) : routineProducts.length > 0 ? (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {routineProducts.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 22 }}
                    className="flex flex-col items-center gap-1 shrink-0 w-14"
                  >
                    <div className="w-12 h-12 rounded-xl bg-muted/30 border border-border/40 overflow-hidden flex items-center justify-center">
                      <ProductTypeIcon type={p.product_type} size={28} />
                    </div>
                    <p className="text-[9px] text-muted-foreground text-center leading-tight truncate w-full">{p.product_name || p.brand}</p>
                  </motion.div>
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

      {/* ── Métriques — panneau teinté distinct pour créer une rupture visuelle avec la
          section du dessus (effet "page dans la page") ─────────────────────────── */}
      <div className="rounded-t-[28px] bg-[#FBF9F5] px-5 pt-5 pb-8">
        <div className="flex items-center gap-1.5 mb-3">
          <Activity size={12} strokeWidth={2.2} className="text-primary/70" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Mes métriques
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Carte 1 — Phase cycle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="relative overflow-hidden rounded-2xl bg-white p-4 premium-shadow"
          >
            <div className="absolute -top-5 -right-5 w-16 h-16 rounded-full bg-primary/[0.05] blur-lg" />
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mb-2.5">
                <Droplets size={13} className="text-primary" strokeWidth={2} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Cycle</p>
              {cyclePhase && cycleDay ? (
                <div>
                  <p className="text-[16px] font-display text-foreground leading-tight">
                    {cyclePhase}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    Jour {cycleDay} · {nextCycleEvent(cycleDay, cycleDuration)}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => navigate("/profile")}
                  className="text-[12px] text-primary font-semibold text-left leading-snug"
                >
                  Renseigne ta date de règles →
                </button>
              )}
            </div>
          </motion.div>

          {/* Carte 2 — Météo */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl bg-white p-4 premium-shadow"
          >
            <div className="absolute -top-5 -right-5 w-16 h-16 rounded-full bg-primary/[0.05] blur-lg" />
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mb-2.5">
                <CloudSun size={13} className="text-primary" strokeWidth={2} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Météo</p>
              {liveWeather.locationName !== "..." ? (
                <div>
                  <p className="text-[16px] font-display text-foreground leading-tight">
                    {liveWeather.temp ?? "—"}°
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    UV {liveWeather.uv ?? "—"} · {liveWeather.humidity ?? "—"}% hum.
                  </p>
                </div>
              ) : (
                <div className="h-7 bg-[#EDE9E3] rounded-lg animate-pulse w-14 mt-0.5" />
              )}
            </div>
          </motion.div>
        </div>

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
