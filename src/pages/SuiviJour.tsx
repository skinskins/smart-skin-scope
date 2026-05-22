import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ImageOff, Camera } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWeatherData } from "@/hooks/useWeatherData";
import pearlLumineuse from "@/assets/pearls/Pearl-lumineuse.svg";
import pearlDouce     from "@/assets/pearls/Pearl-douce.svg";
import pearlTerne     from "@/assets/pearls/Pearl-terne.svg";
import pearlFragile   from "@/assets/pearls/Pearl-fragile.svg";
import pearlAbsente   from "@/assets/pearls/Pearl-absente.svg";

const PHASE_TO_PEARL: Record<string, string> = {
  "Folliculaire": "Perle douce",
  "Ovulatoire":   "Perle lumineuse",
  "Lutéal":       "Perle terne",
  "Menstruation": "Perle fragile",
};

const PEARL_SVG: Record<string, string> = {
  "Perle lumineuse": pearlLumineuse,
  "Perle douce":     pearlDouce,
  "Perle terne":     pearlTerne,
  "Perle fragile":   pearlFragile,
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
  if (day <= periodDuration)                              phase = "Menstruation";
  else if (day <= Math.floor(cycleDuration / 2) - 1)     phase = "Folliculaire";
  else if (day <= Math.floor(cycleDuration / 2) + 2)     phase = "Ovulatoire";
  else                                                    phase = "Lutéal";
  return { pearlName: PHASE_TO_PEARL[phase] ?? null, phase, cycleDay: day };
};

type Product = { id: string; product_name: string; brand: string; photo_url: string | null; product_type: string | null };

const SuiviJour = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { weather: liveWeather } = useWeatherData();

  const [lastPeriodDate, setLastPeriodDate] = useState<string>("");
  const [cycleDuration, setCycleDuration] = useState<number>(28);
  const [periodDuration, setPeriodDuration] = useState<number>(5);
  const [userId, setUserId] = useState<string | null>(null);
  const [skinPhotoUrl, setSkinPhotoUrl] = useState<string | null>(null);
  const [weather, setWeather] = useState<{ temp: number; uv: number; pollution: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !date) { setLoading(false); return; }
      const uid = session.user.id;
      setUserId(uid);

      const [profileRes, photoRes, weatherRes, productsRes] = await Promise.all([
        (supabase as any).from("profiles")
          .select("last_period_date, cycle_duration, period_duration")
          .eq("id", uid).single(),
        (supabase as any).from("skin_photos")
          .select("storage_path").eq("user_id", uid).eq("date", date).maybeSingle(),
        (supabase as any).from("daily_weather")
          .select("temp, uv, pollution").eq("user_id", uid).eq("date", date).maybeSingle(),
        (supabase as any).from("user_products")
          .select("id, product_name, brand, photo_url, product_type")
          .eq("user_id", uid).eq("is_active", true),
      ]);

      if (profileRes.data) {
        if (profileRes.data.last_period_date) setLastPeriodDate(profileRes.data.last_period_date);
        if (profileRes.data.cycle_duration)   setCycleDuration(profileRes.data.cycle_duration);
        if (profileRes.data.period_duration)  setPeriodDuration(profileRes.data.period_duration);
      }

      if (photoRes.data?.storage_path) {
        const { data: signed } = await supabase.storage
          .from("skin-photos")
          .createSignedUrl(photoRes.data.storage_path, 3600);
        if (signed?.signedUrl) setSkinPhotoUrl(signed.signedUrl);
      }

      if (weatherRes.data) setWeather(weatherRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      setLoading(false);
    };
    fetchAll();
  }, [date]);

  const handlePhotoUpload = async (file: File) => {
    if (!date || !userId) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${date}.${ext}`;
    const { error } = await supabase.storage.from("skin-photos").upload(path, file, { upsert: true });
    if (!error) {
      await (supabase as any).from("skin_photos").upsert(
        { user_id: userId, date, storage_path: path },
        { onConflict: "user_id,date" }
      );
      const { data: signed } = await supabase.storage.from("skin-photos").createSignedUrl(path, 3600);
      if (signed?.signedUrl) setSkinPhotoUrl(signed.signedUrl);
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

  const productsByType = products.reduce<Record<string, Product[]>>((acc, p) => {
    const key = p.product_type ?? "Autre";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto">

      {/* Header */}
      <div className="px-5 pt-10 pb-4 flex items-center gap-4">
        <button onClick={() => navigate("/suivi")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={16} strokeWidth={1.5} />
          Retour
        </button>
      </div>

      <div className="px-5">
        <h1 className="text-2xl font-display text-foreground mb-6 capitalize">{dateLabel}</h1>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-16 animate-pulse">Chargement…</p>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Perle */}
            <div className="flex flex-col items-center gap-2 text-center">
              <img
                src={pearlName ? (PEARL_SVG[pearlName] ?? pearlAbsente) : pearlAbsente}
                alt={pearlName ?? "Perle absente"}
                className="w-16 h-16 object-contain"
              />
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
              <div className="rounded-2xl overflow-hidden border border-border/40">
                <img src={skinPhotoUrl} alt="Photo peau" className="w-full object-cover" />
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

            {/* Produits utilisés */}
            {products.length > 0 && (
              <div>
                <p className="text-base font-display font-bold text-foreground mb-4">
                  {products.length} produit{products.length > 1 ? "s" : ""} utilisé{products.length > 1 ? "s" : ""}
                </p>
                <div className="space-y-5">
                  {Object.entries(productsByType).map(([type, items]) => (
                    <div key={type}>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                        {type}
                      </p>
                      <div className="space-y-2">
                        {items.map(p => (
                          <div key={p.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-border/40">
                            <div className="w-12 h-12 bg-muted/30 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                              {p.photo_url
                                ? <img src={p.photo_url} alt={p.product_name} className="w-full h-full object-contain" />
                                : <ImageOff size={16} className="text-muted-foreground/40" />
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{p.product_name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{p.brand}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {products.length === 0 && !skinPhotoUrl && !weather && (
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
