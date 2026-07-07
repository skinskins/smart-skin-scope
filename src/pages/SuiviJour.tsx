import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWeatherData } from "@/hooks/useWeatherData";
import { RoutineCard } from "@/components/RoutineCard";
import type { RoutineProduct } from "@/hooks/useRoutineProducts";

const PHASE_TO_PEARL: Record<string, string> = {
  "Folliculaire": "Perle douce",
  "Ovulatoire":   "Perle lumineuse",
  "Lutéale":      "Perle terne",
  "Menstruelle":  "Perle fragile",
};

const PEARL_GRADIENT: Record<string, { gradient: string; pulseColor: string }> = {
  "Folliculaire":  { gradient: "linear-gradient(145deg, #B8D4E8 0%, #7EB3D4 45%, #4A8AB8 100%)", pulseColor: "#7EB3D4" },
  "Ovulatoire":    { gradient: "linear-gradient(145deg, #F5E6A3 0%, #F0C060 45%, #E89020 100%)", pulseColor: "#F0C060" },
  "Lutéale":       { gradient: "linear-gradient(145deg, #C4A882 0%, #A07850 45%, #785030 100%)", pulseColor: "#A07850" },
  "Menstruelle":   { gradient: "linear-gradient(145deg, #E8A4A8 0%, #D06070 45%, #A83050 100%)", pulseColor: "#D06070" },
};

const PEARL_SUBTITLES: Record<string, string> = {
  "Perle lumineuse": "Votre peau est au top",
  "Perle douce":     "Votre peau est équilibrée",
  "Perle terne":     "Votre peau a besoin de douceur",
  "Perle fragile":   "La douceur et la simplicité sont de mise aujourd'hui",
};

const getPearlForDate = (
  dateStr: string,
  lastPeriodDate: string,
  cycleDuration: number,
  periodDuration: number
): { pearlName: string | null; phase: string | null; cycleDay: number | null } => {
  if (!lastPeriodDate) return { pearlName: null, phase: null, cycleDay: null };
  const periodStart = new Date(lastPeriodDate); periodStart.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);             target.setHours(0, 0, 0, 0);
  if (target < periodStart) return { pearlName: null, phase: null, cycleDay: null };
  const diffDays = Math.floor((target.getTime() - periodStart.getTime()) / 86400000);
  const day = (diffDays % cycleDuration) + 1;
  let phase: string;
  if (day <= periodDuration)                              phase = "Menstruelle";
  else if (day <= Math.floor(cycleDuration / 2) - 1)     phase = "Folliculaire";
  else if (day <= Math.floor(cycleDuration / 2) + 2)     phase = "Ovulatoire";
  else                                                    phase = "Lutéale";
  return { pearlName: PHASE_TO_PEARL[phase] ?? null, phase, cycleDay: day };
};

const SuiviJour = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { weather: liveWeather } = useWeatherData();

  const [lastPeriodDate, setLastPeriodDate] = useState<string>("");
  const [cycleDuration, setCycleDuration] = useState<number>(28);
  const [periodDuration, setPeriodDuration] = useState<number>(5);
  const [userId, setUserId] = useState<string | null>(null);
  const [skinPhotoUrl, setSkinPhotoUrl] = useState<string | null>(null);
  const [skinAnalysis, setSkinAnalysis] = useState<any>(null);
  const [weather, setWeather] = useState<{ temp: number; uv: number; pollution: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedProducts, setLoggedProducts] = useState<RoutineProduct[]>([]);
  const [inciMessageFromLog, setInciMessageFromLog] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !date) { setLoading(false); return; }
      const uid = session.user.id;
      setUserId(uid);

      const [profileRes, photoRes, weatherRes, routineLogRes] = await Promise.all([
        (supabase as any).from("profiles")
          .select("last_period_date, cycle_duration, period_duration")
          .eq("id", uid).single(),
        (supabase as any).from("skin_photos")
          .select("storage_path, analysis_json").eq("user_id", uid).eq("date", date).maybeSingle(),
        (supabase as any).from("daily_weather")
          .select("temp, uv, pollution").eq("user_id", uid).eq("date", date).maybeSingle(),
        (supabase as any).from("daily_routine_log")
          .select("product_ids, inci_message, period")
          .eq("user_id", uid).eq("date", date),
      ]);

      if (profileRes.data) {
        if (profileRes.data.last_period_date) setLastPeriodDate(profileRes.data.last_period_date);
        if (profileRes.data.cycle_duration)   setCycleDuration(profileRes.data.cycle_duration);
        if (profileRes.data.period_duration)  setPeriodDuration(profileRes.data.period_duration);
      }

      if (photoRes.data?.analysis_json) setSkinAnalysis(photoRes.data.analysis_json);
      if (photoRes.data?.storage_path) {
        const { data: signed } = await supabase.storage
          .from("skin-photos")
          .createSignedUrl(photoRes.data.storage_path, 3600);
        if (signed?.signedUrl) setSkinPhotoUrl(signed.signedUrl);
      }

      if (weatherRes.data) setWeather(weatherRes.data);

      const allProductIds: string[] = (routineLogRes.data ?? [])
        .flatMap((r: any) => r.product_ids ?? []);
      const inciMsg: string | null = (routineLogRes.data ?? [])
        .find((r: any) => r.inci_message)?.inci_message ?? null;
      setInciMessageFromLog(inciMsg);

      if (allProductIds.length > 0) {
        const { data: products } = await (supabase as any)
          .from("user_products")
          .select("id, product_name, brand, product_type, photo_url")
          .in("id", allProductIds);
        setLoggedProducts((products ?? []).map((p: any) => ({
          id: p.id,
          product_name: p.product_name,
          brand: p.brand,
          product_type: p.product_type ?? null,
          photo_url: p.photo_url ?? null,
          frequency: null,
        })));
      }
      setLoading(false);
    };
    fetchAll();
  }, [date]);

  const handlePhotoUpload = async (file: File) => {
    if (!date || !userId) return;
    setUploading(true);
    setUploadError(null);
    console.log("[PhotoUpload] fichier:", file.name, file.size + " bytes", file.type);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${date}.${ext}`;
    console.log("[PhotoUpload] path bucket:", path);
    const { error: storageError } = await supabase.storage
      .from("skin-photos")
      .upload(path, file, { upsert: true });
    console.log("[PhotoUpload] storage.upload →", storageError ? `ERREUR: ${storageError.message}` : "OK");
    if (storageError) {
      setUploadError(storageError.message);
      setUploading(false);
      return;
    }
    const { error: dbError } = await (supabase as any).from("skin_photos").upsert(
      { user_id: userId, date, storage_path: path },
      { onConflict: "user_id,date" }
    );
    console.log("[PhotoUpload] skin_photos.upsert →", dbError ? `ERREUR: ${JSON.stringify(dbError)}` : "OK");
    if (dbError) {
      setUploadError(dbError.message ?? "Erreur base de données");
      setUploading(false);
      return;
    }
    const { data: signed } = await supabase.storage.from("skin-photos").createSignedUrl(path, 3600);
    console.log("[PhotoUpload] createSignedUrl →", signed?.signedUrl ? "OK" : "URL manquante");
    if (signed?.signedUrl) setSkinPhotoUrl(signed.signedUrl);

    // ── Analyse IA de la photo (compression + skin-analysis) ──────────────
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 1200;
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/jpeg", 0.8).split(",")[1]);
        };
        img.onerror = reject;
        img.src = url;
      });

      const { data: analysisData } = await supabase.functions.invoke("skin-analysis", {
        body: { user_id: userId, imageBase64: base64 },
      });

      if (analysisData?.rejected) {
        setUploadError(analysisData.reason ?? "Photo non exploitable — reprends une photo bien éclairée, de face.");
        setUploading(false);
        return;
      }

      // Régénérer les conseils de la semaine à partir de la nouvelle analyse
      if (analysisData?.analysis) {
        setSkinAnalysis(analysisData.analysis);
        supabase.functions.invoke("generate-weekly-advice", {
          body: { user_id: userId },
        }).catch((e) => console.warn("generate-weekly-advice:", e));
      }
    } catch (e) {
      console.warn("[PhotoUpload] analyse échouée:", e);
    }

    setUploading(false);
  };

  const today = new Date().toISOString().split("T")[0];
  const isToday = date === today;
  const displayWeather = weather
    ?? (isToday && liveWeather.pollution !== "..."
        ? { temp: liveWeather.temp, uv: liveWeather.uv, pollution: liveWeather.pollution }
        : null);

  const dateLabel = date
    ? new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "";

  const { pearlName, phase, cycleDay } = date
    ? getPearlForDate(date, lastPeriodDate, cycleDuration, periodDuration)
    : { pearlName: null, phase: null, cycleDay: null };

  const pearlGradient = phase ? (PEARL_GRADIENT[phase] ?? null) : null;
  const uvCritical = (displayWeather?.uv ?? 0) >= 6;

  const productsByType = loggedProducts.reduce<Record<string, RoutineProduct[]>>((acc, p) => {
    const key = p.product_type ?? "Autre";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto">

      <PageHeader title={dateLabel} onBack={() => navigate(-1)} />

      <div className="px-5">

        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-16 animate-pulse">Chargement…</p>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Perle */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
                {/* Pulse ring */}
                <motion.div
                  animate={{ scale: [1, 1.22], opacity: [0.32, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
                  style={{
                    position: "absolute", inset: -8, borderRadius: "50%",
                    background: uvCritical ? "#E06010" : (pearlGradient?.pulseColor ?? "#ccc"),
                    pointerEvents: "none",
                  }}
                />
                {/* Pearl layers */}
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", position: "relative" }}>
                  {/* Layer 1 — cycle */}
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: pearlGradient?.gradient ?? "#E0D8D0" }} />
                  {/* Layer 2 — UV */}
                  <motion.div
                    animate={{ opacity: uvCritical ? 1 : 0 }}
                    transition={{ duration: 0.45 }}
                    style={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      background: "radial-gradient(circle at 82% 18%, rgba(224,100,10,0.78) 0%, rgba(200,70,0,0.38) 38%, transparent 62%)",
                    }}
                  />
                  {/* Layer 3 — facteurs (pas de données checkin sur cette page) */}
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", opacity: 0,
                    background: "radial-gradient(circle at 20% 78%, rgba(110,60,180,0.75) 0%, rgba(80,40,150,0.35) 38%, transparent 62%)",
                  }} />
                </div>
              </div>
              <p className="text-base font-bold text-foreground">
                {pearlName ?? "Perle absente"}
              </p>
              {pearlName && (
                <p className="text-sm text-muted-foreground leading-snug">
                  {PEARL_SUBTITLES[pearlName]}
                </p>
              )}
            </div>

            {/* Photo peau */}
            {skinPhotoUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-border/40">
                  <img src={skinPhotoUrl} alt="Photo peau" className="w-full object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <p className="text-white text-sm font-medium">Analyse de votre peau en cours…</p>
                    </div>
                  )}
                </div>
                {skinAnalysis && (
                  <div className="space-y-3">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {skinAnalysis.type_peau_detecte && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-primary/10 text-primary">{skinAnalysis.type_peau_detecte}</span>
                      )}
                      {skinAnalysis.carnation_detectee && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-muted/30 text-foreground/70">{skinAnalysis.carnation_detectee}</span>
                      )}
                      {skinAnalysis.eclat_global != null && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-muted/30 text-foreground/70">Éclat {skinAnalysis.eclat_global}/10</span>
                      )}
                    </div>
                    {/* Scores */}
                    <div className="bg-white rounded-2xl p-4 border border-border/40 space-y-3">
                      {[
                        { label: "Hydratation", value: skinAnalysis.hydratation?.score, max: 4, color: "bg-blue-400" },
                        { label: "Érythème", value: skinAnalysis.erytheme?.score, max: 4, color: "bg-red-400" },
                        { label: "Sébum zone T", value: skinAnalysis.sebum?.zone_t, max: 5, color: "bg-yellow-400" },
                        { label: "Acné", value: skinAnalysis.acne?.score, max: 4, color: "bg-orange-400" },
                      ].filter(s => s.value != null).map(s => (
                        <div key={s.label}>
                          <div className="flex justify-between mb-1">
                            <span className="text-[11px] font-semibold text-foreground">{s.label}</span>
                            <span className="text-[11px] text-muted-foreground">{s.value}/{s.max}</span>
                          </div>
                          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                            <div className={`h-full ${s.color} rounded-full`} style={{ width: `${(s.value / s.max) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Observations */}
                    {skinAnalysis.observations_libres && (
                      <div className="bg-muted/5 rounded-2xl p-4 border border-border/20">
                        <p className="text-[11px] text-foreground/70 leading-relaxed italic">{skinAnalysis.observations_libres}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <label className="block cursor-pointer">
                <div className="w-full h-[200px] bg-muted/20 rounded-2xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-3 hover:bg-muted/30 transition-colors">
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <>
                      <Camera size={28} strokeWidth={1.5} className="text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Ajouter une photo</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                />
              </label>
            )}
            {uploadError && (
              <p className="text-xs text-red-500 text-center mt-2 px-2">{uploadError}</p>
            )}

            {/* Cartes contextuelles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="premium-card p-4 flex flex-col gap-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cycle</p>
                <p className="text-sm font-bold text-foreground">{phase ?? "–"}</p>
                {cycleDay && (
                  <p className="text-[10px] text-muted-foreground">Jour {cycleDay} sur {cycleDuration}</p>
                )}
              </div>
              <div className="premium-card p-4 flex flex-col gap-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Qualité d'air</p>
                <p className="text-sm font-bold text-foreground">{displayWeather?.pollution ?? "–"}</p>
                {displayWeather && (
                  <p className="text-[10px] text-muted-foreground">Indice UV à {displayWeather.uv}</p>
                )}
              </div>
            </div>

            {/* Message INCI */}
            {inciMessageFromLog && (
              <div className="premium-card p-4">
                <p className="text-sm text-muted-foreground leading-snug">{inciMessageFromLog}</p>
              </div>
            )}

            {/* Produits utilisés */}
            {loggedProducts.length > 0 && (
              <div>
                <p className="text-base font-display font-bold text-foreground mb-4">
                  {loggedProducts.length} produit{loggedProducts.length > 1 ? "s" : ""} utilisé{loggedProducts.length > 1 ? "s" : ""}
                </p>
                <div className="space-y-5">
                  {Object.entries(productsByType).map(([type, items]) => (
                    <div key={type}>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                        {type}
                      </p>
                      <RoutineCard products={items} showPhotos />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loggedProducts.length === 0 && !skinPhotoUrl && !weather && (
              <p className="text-center text-sm text-muted-foreground italic py-8">
                Pas de données pour ce jour
              </p>
            )}

          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SuiviJour;
