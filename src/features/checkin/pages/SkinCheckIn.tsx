import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, ImageIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────
type Phase = "daily" | "weekly" | "factors" | "photo";
type Trend = "moins" | "pareil" | "plus";

interface SymptomConfig {
  dbKey: string;
  dailyQ: string;
  weeklyQ: string;
}

// ─── Constants ────────────────────────────────────────────────────
const PROBLEM_CONFIG: Record<string, SymptomConfig> = {
  "Acné":           { dbKey: "acné",         dailyQ: "Depuis hier,\nton acné s'est…",          weeklyQ: "Depuis une semaine,\nton acné s'est…" },
  "Rougeurs":       { dbKey: "rougeurs",     dailyQ: "Depuis hier,\ntes rougeurs se sont…",     weeklyQ: "Depuis une semaine,\ntes rougeurs se sont…" },
  "Déshydratation": { dbKey: "sécheresse",   dailyQ: "Depuis hier,\nta sécheresse s'est…",      weeklyQ: "Depuis une semaine,\nta sécheresse s'est…" },
  "Sécheresse":     { dbKey: "sécheresse",   dailyQ: "Depuis hier,\nta sécheresse s'est…",      weeklyQ: "Depuis une semaine,\nta sécheresse s'est…" },
  "Taches":         { dbKey: "taches",       dailyQ: "Depuis hier,\ntes taches se sont…",        weeklyQ: "Depuis une semaine,\ntes taches se sont…" },
  "Points noirs":   { dbKey: "points_noirs", dailyQ: "Depuis hier,\ntes points noirs se sont…",  weeklyQ: "Depuis une semaine,\ntes points noirs se sont…" },
  "Rides":          { dbKey: "rides",        dailyQ: "Depuis hier,\ntes rides se sont…",          weeklyQ: "Depuis une semaine,\ntes rides se sont…" },
  "Cernes":         { dbKey: "cernes",       dailyQ: "Depuis hier,\ntes cernes se sont…",         weeklyQ: "Depuis une semaine,\ntes cernes se sont…" },
  "Eczéma":         { dbKey: "eczéma",       dailyQ: "Depuis hier,\nton eczéma s'est…",           weeklyQ: "Depuis une semaine,\nton eczéma s'est…" },
};

const DEFAULT_SYMPTOMS: SymptomConfig[] = [
  { dbKey: "acné",       dailyQ: "Depuis hier,\nton acné s'est…",       weeklyQ: "Depuis une semaine,\nton acné s'est…" },
  { dbKey: "rougeurs",   dailyQ: "Depuis hier,\ntes rougeurs se sont…",  weeklyQ: "Depuis une semaine,\ntes rougeurs se sont…" },
  { dbKey: "sécheresse", dailyQ: "Depuis hier,\nta sécheresse s'est…",   weeklyQ: "Depuis une semaine,\nta sécheresse s'est…" },
];

const TREND_BTNS: { value: Trend; label: string; icon: string }[] = [
  { value: "moins",  label: "Amélioré(e)", icon: "↓" },
  { value: "pareil", label: "Pareil(le)",  icon: "→" },
  { value: "plus",   label: "Empiré(e)",   icon: "↑" },
];

const ZONES = [
  { key: "menton",         label: "Menton" },
  { key: "front",          label: "Front" },
  { key: "joues",          label: "Joues" },
  { key: "contour_bouche", label: "Contour bouche" },
  { key: "tempes",         label: "Tempes" },
];

// Factor tags — multi-select, "what went wrong today?"
const FACTOR_TAGS = [
  { key: "hormonal", label: "Cycle hormonal" },
  { key: "alcohol",  label: "Alcool" },
  { key: "hydration",label: "Hydratation" },
  { key: "food",     label: "Alimentation grasse / sucrée" },
  { key: "routine",  label: "Routine non faite" },
  { key: "product",  label: "Changement produit / soin" },
  { key: "stress",   label: "Stress" },
  { key: "sleep",    label: "Sommeil court" },
  { key: "other",    label: "Autre" },
];

const PHASES_ORDER: Phase[] = ["daily", "weekly", "factors", "photo"];

const today = new Date().toISOString().split("T")[0];

// ─── Helpers ──────────────────────────────────────────────────────
function calcCyclePhase(lastPeriodDate: string, cycleDuration = 28): string {
  const days = Math.floor((Date.now() - new Date(lastPeriodDate).getTime()) / 86400000);
  const day = (days % cycleDuration) + 1;
  if (day <= 5)  return "Menstruation";
  if (day <= 13) return "Folliculaire";
  if (day <= 16) return "Ovulatoire";
  return "Lutéal";
}

// Map selected tags → daily_checkins + routine_logs values.
// Selected = "went wrong" (max negative value).
// Not selected = neutral/normal.
function buildCheckinPayload(tags: string[], autoPhase: string | null) {
  const s = new Set(tags);
  return {
    checkin: {
      stress_level:           s.has("stress")    ? 10 : 5,
      sleep_hours:            s.has("sleep")     ? 0  : 7,
      alcohol_drinks:         s.has("alcohol")   ? 1  : 0,
      water_glasses:          s.has("hydration") ? 4  : 8,
      food_quality:           s.has("food")      ? "Grasses / Sucrée" : "Équilibrée",
      product_change:         s.has("product"),
      professional_treatment: s.has("product"),
      cycle_phase:            s.has("hormonal")  ? "Menstruation" : autoPhase,
    },
    routine: {
      morning_routine_done: !s.has("routine"),
      makeup_removed:       !s.has("routine"),
    },
  };
}

// ─── Animation variants ───────────────────────────────────────────
const slide = {
  enter:  (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
};

// ─── Main component ───────────────────────────────────────────────
export default function SkinCheckIn() {
  const navigate   = useNavigate();
  const cameraRef  = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Init data
  const [symptoms, setSymptoms] = useState<SymptomConfig[]>([]);
  const [autoPhase, setAutoPhase] = useState<string | null>(null);
  const [ready, setReady]       = useState(false);

  // Navigation
  const [phase, setPhase]       = useState<Phase>("daily");
  const [subIndex, setSubIndex] = useState(0);
  const [dir, setDir]           = useState(1);

  // Per-symptom state — reset on each advance
  const [trend, setTrend] = useState<Trend | null>(null);
  const [zones, setZones] = useState<string[]>([]);

  // Factor tags — multi-select
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Photo
  const [uploading, setUploading] = useState(false);

  // ── Init ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/checkin-advice", { replace: true }); return; }

      // Gate: already checked in today (daily symptoms)?
      const { data: existing } = await (supabase as any)
        .from("symptom_tracking")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .eq("period", "daily")
        .limit(1);
      if (existing?.length) { navigate("/checkin-advice", { replace: true }); return; }

      // Load profile
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("skin_problems, last_period_date, cycle_duration")
        .eq("id", session.user.id)
        .single();

      // Build symptom list
      const problems: string[] = profile?.skin_problems ?? [];
      const seen = new Set<string>();
      const built: SymptomConfig[] = [];
      for (const p of problems) {
        const c = PROBLEM_CONFIG[p];
        if (c && !seen.has(c.dbKey)) { seen.add(c.dbKey); built.push(c); }
      }
      setSymptoms(built.length ? built : DEFAULT_SYMPTOMS);

      // Auto-calculate cycle phase for factors screen
      if (profile?.last_period_date) {
        setAutoPhase(calcCyclePhase(profile.last_period_date, profile.cycle_duration ?? 28));
      }

      setReady(true);
    };
    init();
  }, [navigate]);

  // ── Save symptom row ─────────────────────────────────────────────
  const saveSymptom = async (cfg: SymptomConfig, t: Trend, zone: string | null, period: "daily" | "weekly") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await (supabase as any).from("symptom_tracking").upsert(
      { user_id: session.user.id, date: today, symptom: cfg.dbKey, trend: t, zone, period },
      { onConflict: "user_id,date,symptom,period" }
    );
  };

  // ── Advance sub-screen ───────────────────────────────────────────
  const advance = () => {
    setDir(1);
    setTrend(null);
    setZones([]);
    if (subIndex < symptoms.length - 1) {
      setSubIndex(s => s + 1);
    } else {
      setSubIndex(0);
      setPhase(prev => prev === "daily" ? "weekly" : "factors");
    }
  };

  // ── Trend click ──────────────────────────────────────────────────
  const handleTrendClick = (t: Trend) => {
    setTrend(t);
    if (t !== "plus") {
      setTimeout(() => {
        saveSymptom(symptoms[subIndex], t, null, phase === "daily" ? "daily" : "weekly");
        advance();
      }, 160);
    }
  };

  const toggleZone = (key: string) =>
    setZones(prev => prev.includes(key) ? prev.filter(z => z !== key) : [...prev, key]);

  const handleZoneNext = () => {
    saveSymptom(symptoms[subIndex], "plus", zones[0] ?? null, phase === "daily" ? "daily" : "weekly");
    advance();
  };

  // ── Toggle a factor tag ──────────────────────────────────────────
  const toggleTag = (key: string) =>
    setSelectedTags(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  // ── Save factors (tag → DB values) ──────────────────────────────
  const handleSaveFactors = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { checkin, routine } = buildCheckinPayload(selectedTags, autoPhase);
      await Promise.all([
        (supabase as any).from("daily_checkins").upsert(
          { user_id: session.user.id, date: today, ...checkin },
          { onConflict: "user_id,date" }
        ),
        (supabase as any).from("routine_logs").upsert(
          { user_id: session.user.id, date: today, ...routine },
          { onConflict: "user_id,date" }
        ),
      ]);
    }
    setDir(1);
    setPhase("photo");
  };

  // ── Photo ────────────────────────────────────────────────────────
  const handlePhoto = async (file?: File) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (file && session) {
      setUploading(true);
      try {
        const path = `${session.user.id}/${today}.jpg`;
        const { error } = await supabase.storage
          .from("skin-photos")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (!error) {
          await (supabase as any).from("skin_photos").upsert(
            { user_id: session.user.id, date: today, storage_path: path },
            { onConflict: "user_id,date" }
          );
        }
      } catch (e) {
        console.error("[SkinCheckIn] photo:", e);
      } finally {
        setUploading(false);
      }
    }
    navigate("/checkin-advice", { replace: true });
  };

  const skipAll = () => {
    sessionStorage.setItem("skinCheckinSkippedDate", today);
    navigate("/checkin-advice", { replace: true });
  };

  // ── Loading ──────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const phaseIdx       = PHASES_ORDER.indexOf(phase);
  const isSymptomPhase = phase === "daily" || phase === "weekly";
  const cur            = symptoms[subIndex];
  const animKey        = `${phase}-${subIndex}`;

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">

      {/* ── Header: 4 progress dots ── */}
      <div className="flex items-center justify-between px-6 pt-12 pb-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          {PHASES_ORDER.map((p, i) => (
            <div
              key={p}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i < phaseIdx   ? "bg-[#111111] w-4" :
                i === phaseIdx ? "bg-[#111111] w-8" :
                                 "bg-[#E5E5E5] w-4"
              }`}
            />
          ))}
          {isSymptomPhase && symptoms.length > 1 && (
            <span className="ml-1 text-[10px] font-mono font-bold text-[#AAAAAA] tracking-widest">
              {subIndex + 1}/{symptoms.length}
            </span>
          )}
        </div>
        {isSymptomPhase && (
          <button
            onClick={skipAll}
            className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-widest hover:text-[#111111] transition-colors"
          >
            Passer
          </button>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>

          {/* ── Phases 1 & 2: symptom sub-screens ── */}
          {isSymptomPhase && (
            <motion.div
              key={animKey}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", duration: 0.28 }}
              className="absolute inset-0 overflow-y-auto px-8 pt-2 pb-8"
            >
              <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-widest mb-6">
                {phase === "daily" ? "Depuis hier" : "Depuis une semaine"}
              </p>

              <h1 className="text-4xl font-display font-black text-[#111111] uppercase tracking-tight leading-tight mb-10 whitespace-pre-line">
                {phase === "daily" ? cur.dailyQ : cur.weeklyQ}
              </h1>

              <div className="space-y-3">
                {TREND_BTNS.map(({ value, label, icon }) => {
                  const active = trend === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleTrendClick(value)}
                      className={`w-full py-5 border transition-all flex items-center justify-between px-6 ${
                        active
                          ? "bg-[#111111] text-white border-[#111111]"
                          : "border-[#E5E5E5] bg-white hover:bg-[#111111] hover:text-white hover:border-[#111111]"
                      }`}
                    >
                      <span className={`text-sm font-mono font-bold uppercase tracking-[0.1em] transition-colors ${active ? "text-white" : "text-[#111111]"}`}>
                        {label}
                      </span>
                      <span className={`text-lg transition-colors ${active ? "text-white" : "text-[#111111]"}`}>
                        {icon}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Zone picker — inline, only when "Empiré(e)" */}
              <AnimatePresence>
                {trend === "plus" && (
                  <motion.div
                    key="zones"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-7 pt-6 border-t border-[#E5E5E5]">
                      <p className="text-[10px] font-mono font-bold text-[#888888] uppercase tracking-widest mb-4">
                        Sur quelle(s) zone(s) ?
                      </p>
                      <div className="flex flex-wrap gap-2 mb-8">
                        {ZONES.map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => toggleZone(key)}
                            className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-[0.05em] border transition-all ${
                              zones.includes(key)
                                ? "bg-[#111111] text-white border-[#111111]"
                                : "bg-white text-[#888888] border-[#E5E5E5] hover:border-[#111111]"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleZoneNext}
                        className="w-full py-4 bg-[#111111] text-white text-sm font-mono font-bold uppercase tracking-[0.1em] hover:bg-black transition-colors"
                      >
                        Suivant →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Phase 3: factor tags ── */}
          {phase === "factors" && (
            <motion.div
              key="factors"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", duration: 0.28 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <div className="px-8 pt-2 pb-4">
                <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-widest mb-6">
                  Facteurs
                </p>
                <h1 className="text-3xl font-display font-black text-[#111111] uppercase tracking-tight leading-tight mb-3">
                  Quel(s) facteur(s)<br />ont pu causer<br />ce changement ?
                </h1>
                <p className="text-xs font-mono text-[#AAAAAA] mb-10">
                  Sélectionne tout ce qui s'applique. Le reste sera considéré normal.
                </p>

                <div className="flex flex-wrap gap-3">
                  {FACTOR_TAGS.map(({ key, label }) => {
                    const active = selectedTags.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleTag(key)}
                        className={`px-5 py-3 text-sm font-mono font-bold uppercase tracking-[0.05em] border transition-all ${
                          active
                            ? "bg-[#111111] text-white border-[#111111]"
                            : "bg-white text-[#888888] border-[#E5E5E5] hover:border-[#111111] hover:text-[#111111]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sticky save */}
              <div className="sticky bottom-0 px-8 pb-8 pt-4 bg-white border-t border-[#E5E5E5]">
                <button
                  onClick={handleSaveFactors}
                  className="w-full py-4 bg-[#111111] text-white text-sm font-mono font-bold uppercase tracking-[0.1em] hover:bg-black transition-colors"
                >
                  Enregistrer →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Phase 4: photo ── */}
          {phase === "photo" && (
            <motion.div
              key="photo"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", duration: 0.28 }}
              className="absolute inset-0 flex flex-col justify-center px-8 pb-16"
            >
              <div className="text-5xl mb-6">📸</div>
              <h1 className="text-4xl font-display font-black text-[#111111] uppercase tracking-tight leading-tight mb-3">
                Tu veux prendre<br />une photo ?
              </h1>
              <p className="text-sm text-[#888888] font-mono mb-12">
                Pour suivre visuellement l'évolution de ta peau ✨
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => cameraRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-5 bg-[#111111] text-white flex items-center justify-between px-6 hover:bg-black transition-colors disabled:opacity-50"
                >
                  <span className="text-sm font-mono font-bold uppercase tracking-[0.1em]">Prendre une photo</span>
                  <Camera size={18} />
                </button>

                <button
                  onClick={() => galleryRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-5 border border-[#111111] bg-white text-[#111111] flex items-center justify-between px-6 hover:bg-[#111111] hover:text-white transition-colors disabled:opacity-50"
                >
                  <span className="text-sm font-mono font-bold uppercase tracking-[0.1em]">Depuis la galerie</span>
                  <ImageIcon size={18} />
                </button>

                <button
                  onClick={() => handlePhoto()}
                  disabled={uploading}
                  className="w-full pt-5 pb-2 text-xs font-mono font-bold text-[#AAAAAA] uppercase tracking-widest hover:text-[#111111] transition-colors"
                >
                  {uploading ? "Envoi en cours..." : "Passer"}
                </button>
              </div>

              <input
                ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0])}
              />
              <input
                ref={galleryRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0])}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
