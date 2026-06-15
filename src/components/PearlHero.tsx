import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────────

type CyclePhase = "Folliculaire" | "Ovulatoire" | "Lutéale" | "Menstruelle";

interface DailyCheckin {
  stress_level?: "low" | "high";
  sleep_hours?: number;
  alcohol_drinks?: number;
  food_quality?: "good" | "bad";
}

interface WeatherData {
  uv_index: number;
  aqi_score?: number;
}

interface PearlHeroProps {
  firstName?: string;
  cyclePhase: CyclePhase;
  cycleDay: number;
  cycleDuration?: number;
  weather?: WeatherData;
  checkin?: DailyCheckin;
  streakCount?: number;
  onPearlPress?: () => void;
  hideTitle?: boolean;
  hidePhotoButton?: boolean;
}

// ─── Pearl config per phase ──────────────────────────────────────────────────

const PEARL_CONFIG: Record<CyclePhase, {
  name: string;
  label: string;
  subtitle: string;
  gradient: string;
  pulseColor: string;
  detailGradient: string;
  blob1: string;
  blob2: string;
  conseil: string;
}> = {
  Folliculaire: {
    name: "Perle douce",
    label: "Folliculaire",
    subtitle: "Peau stable et réceptive",
    gradient: "linear-gradient(145deg, #B8D4E8 0%, #7EB3D4 45%, #4A8AB8 100%)",
    pulseColor: "#7EB3D4",
    detailGradient: "linear-gradient(160deg, #7EB3D4 0%, #4A8AB8 55%, #2E6A98 100%)",
    blob1: "#A8C8E0",
    blob2: "#5A9BC4",
    conseil: "Ta peau est stable et réceptive. Bonne période pour tester un masque hydratant ce soir.",
  },
  Ovulatoire: {
    name: "Perle lumineuse",
    label: "Ovulatoire",
    subtitle: "Ta peau est au sommet",
    gradient: "linear-gradient(145deg, #F5E6A3 0%, #F0C060 45%, #E89020 100%)",
    pulseColor: "#F0C060",
    detailGradient: "linear-gradient(160deg, #F0C060 0%, #E89020 55%, #C87010 100%)",
    blob1: "#F5D070",
    blob2: "#E89020",
    conseil: "Ta peau est au top de son éclat. Applique le SPF avant 9h — UV attendus en hausse.",
  },
  Lutéale: {
    name: "Perle terne",
    label: "Lutéale",
    subtitle: "Simplifie ta routine",
    gradient: "linear-gradient(145deg, #C4A882 0%, #A07850 45%, #785030 100%)",
    pulseColor: "#A07850",
    detailGradient: "linear-gradient(160deg, #A07850 0%, #785030 55%, #584018 100%)",
    blob1: "#B89060",
    blob2: "#785030",
    conseil: "Ta peau entre dans une période plus sensible. Évite les actifs forts et simplifie ta routine.",
  },
  Menstruelle: {
    name: "Perle fragile",
    label: "Menstruelle",
    subtitle: "Seulement les essentiels",
    gradient: "linear-gradient(145deg, #E8A4A8 0%, #D06070 45%, #A83050 100%)",
    pulseColor: "#D06070",
    detailGradient: "linear-gradient(160deg, #D06070 0%, #A83050 55%, #802038 100%)",
    blob1: "#E08090",
    blob2: "#A83050",
    conseil: "Peau au plus fragile. Uniquement cleanser doux, hydratant et SPF — pas besoin d'en faire plus.",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUVLevel(uv: number): "normal" | "critical" {
  return uv >= 6 ? "critical" : "normal";
}

function getActiveFactors(checkin?: DailyCheckin): string[] {
  if (!checkin) return [];
  const factors: string[] = [];
  if (checkin.stress_level === "high") factors.push("Stress élevé");
  if (checkin.sleep_hours !== undefined && checkin.sleep_hours < 6) factors.push("Mauvaise nuit");
  if (checkin.alcohol_drinks !== undefined && checkin.alcohol_drinks > 0) factors.push("Alcool");
  if (checkin.food_quality === "bad") factors.push("Sucré / gras");
  return factors;
}

function buildConseil(
  base: string,
  uvCritical: boolean,
  factors: string[],
  phase: CyclePhase
): string {
  const hasFac = factors.length > 0;
  if (uvCritical && hasFac) {
    const risk = phase === "Lutéale" || phase === "Menstruelle" ? "triple" : "double";
    return `UV critiques + ${factors.length} facteur${factors.length > 1 ? "s" : ""} actif${factors.length > 1 ? "s" : ""} — ${risk} risque. Réduis au minimum et reste à l'ombre.`;
  }
  if (uvCritical) return base.replace(/\.$/, "") + ". UV critiques — SPF 50 et réapplication à 13h.";
  if (hasFac) return base.replace(/\.$/, "") + `. ${factors.length} facteur${factors.length > 1 ? "s" : ""} noté${factors.length > 1 ? "s" : ""} — surveille ta peau demain.`;
  return base;
}

// ─── Main PearlHero component ─────────────────────────────────────────────────

export function PearlHero({
  firstName = "Amira",
  cyclePhase,
  cycleDay,
  cycleDuration = 28,
  weather,
  checkin,
  streakCount = 0,
  onPearlPress,
  hideTitle = false,
  hidePhotoButton = false,
}: PearlHeroProps) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [camUploading, setCamUploading] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const handlePhotoUpload = async (file: File) => {
    setCamUploading(true);
    setCamError(null);
    console.log("[PhotoUpload/Pearl] fichier:", file.name, file.size + " bytes", file.type);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setCamUploading(false); return; }
    const today = new Date().toISOString().split("T")[0];
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${session.user.id}/${today}.${ext}`;
    console.log("[PhotoUpload/Pearl] path bucket:", path);
    const { error: storageError } = await supabase.storage
      .from("skin-photos")
      .upload(path, file, { upsert: true });
    console.log("[PhotoUpload/Pearl] storage.upload →", storageError ? `ERREUR: ${storageError.message}` : "OK");
    if (storageError) {
      setCamError(storageError.message);
      setCamUploading(false);
      return;
    }
    const { error: dbError } = await (supabase as any).from("skin_photos").upsert(
      { user_id: session.user.id, date: today, storage_path: path },
      { onConflict: "user_id,date" }
    );
    console.log("[PhotoUpload/Pearl] skin_photos.upsert →", dbError ? `ERREUR: ${JSON.stringify(dbError)}` : "OK");
    if (dbError) {
      setCamError(dbError.message ?? "Erreur base de données");
      setCamUploading(false);
      return;
    }
    setPhotoUploaded(true);
    setCamUploading(false);
  };

  const cfg = PEARL_CONFIG[cyclePhase];
  const uvCritical = getUVLevel(weather?.uv_index ?? 0) === "critical";
  const factors = getActiveFactors(checkin);
  const hasFac = factors.length > 0;
  const todayLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const handlePress = () => {
    onPearlPress?.();
    const today = new Date().toISOString().split("T")[0];
    navigate(`/suivi/${today}`);
  };

  if (!mounted) return null;

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 36,
        overflow: "hidden",
        position: "relative",
        minHeight: 280,
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22 }}
      >
            {/* Pearl */}
            <div style={{ padding: "20px 20px 4px", textAlign: "center" }}>
              <motion.div
                onClick={handlePress}
                whileTap={{ scale: 0.94 }}
                style={{
                  width: 130, height: 130,
                  borderRadius: "50%",
                  margin: "0 auto 12px",
                  cursor: "pointer",
                  position: "relative",
                }}
                aria-label="Voir le détail du jour"
                role="button"
              >
                {/* Pulse ring */}
                <motion.div
                  animate={{ scale: [1, 1.22], opacity: [0.32, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    inset: -8,
                    borderRadius: "50%",
                    background: uvCritical ? "#E06010" : hasFac ? "#7040C0" : cfg.pulseColor,
                    pointerEvents: "none",
                  }}
                />

                  {/* Pearl layers */}
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", position: "relative" }}>
                    {/* Layer 1 — cycle */}
                    <div
                      style={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        background: cfg.gradient,
                      }}
                    />
                    {/* Layer 2 — UV (top-right blob) */}
                    <motion.div
                      animate={{ opacity: uvCritical ? 1 : 0 }}
                      transition={{ duration: 0.45 }}
                      style={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        background: "radial-gradient(circle at 82% 18%, rgba(224,100,10,0.78) 0%, rgba(200,70,0,0.38) 38%, transparent 62%)",
                      }}
                    />
                    {/* Layer 3 — factors (bottom-left blob) */}
                    <motion.div
                      animate={{ opacity: hasFac ? 1 : 0 }}
                      transition={{ duration: 0.45 }}
                      style={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        background: "radial-gradient(circle at 20% 78%, rgba(110,60,180,0.75) 0%, rgba(80,40,150,0.35) 38%, transparent 62%)",
                      }}
                    />
                  </div>
                </motion.div>

              {!hideTitle && (
                <>
                  <p className="text-xl font-bold text-foreground" style={{ margin: "0 0 2px" }}>
                    {cfg.name}
                  </p>
                  <p className="text-sm text-muted-foreground" style={{ margin: "0 0 4px" }}>
                    {cfg.subtitle}
                  </p>
                </>
              )}

              {!hidePhotoButton && (
                photoUploaded ? (
                  <div className="flex items-center gap-2 text-sm text-primary mt-2">
                    <Check size={15} />
                    <span>Photo enregistrée</span>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground border border-border rounded-full px-4 py-2 mt-2 mx-auto cursor-pointer">
                    {camUploading ? (
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <>
                        <Camera size={16} />
                        Prendre une photo
                        {camError && <span className="text-destructive text-xs ml-1">{camError}</span>}
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                    />
                  </label>
                )
              )}
            </div>


          </motion.div>
    </div>
  );
}
