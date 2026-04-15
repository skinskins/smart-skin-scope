import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Sun, Flame, Fingerprint, CircleDot, Calendar, CloudSun, Heart, Moon, Wine, Dumbbell, FlaskConical, Thermometer, Bluetooth, BluetoothOff, Check, Stethoscope, ChevronRight, MapPin, Camera, Pencil, Lightbulb, ShieldAlert, Sparkles, GlassWater, FlaskRound, ThumbsUp, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import faceScan from "@/assets/face-scan.png";
import MetricCard from "@/components/MetricCard";
import SkinScoreRing from "@/components/SkinScoreRing";
import { useState, useEffect, useCallback } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useDiagnosisResult } from "@/hooks/useDiagnosisStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

type MetricTrend = "up" | "down" | "stable";
type TrendTone = "positive" | "neutral" | "negative";

const trendToneForMetric = (label: string, trend?: MetricTrend): TrendTone | undefined => {
  if (!trend) return undefined;
  if (trend === "stable") return "neutral";

  // Par défaut : "up" = positif. Exceptions métier :
  const improvesWhen: Record<string, Exclude<MetricTrend, "stable">> = {
    Rougeurs: "down", // moins de rougeurs = mieux
    Texture: "up", // plus de texture (lissage/qualité) = mieux
  };

  const positiveTrend = improvesWhen[label] ?? "up";
  return trend === positiveTrend ? "positive" : "negative";
};

const skinMetrics = [
  { label: "Hydratation", value: 72, color: "hsl(200, 60%, 55%)", icon: <Droplets size={18} />, trend: "up" as const, detail: "Estimation basée sur vos apports quotidiens et l'humidité ambiante." },
  { label: "Éclat", value: 65, color: "hsl(45, 80%, 65%)", icon: <Sun size={18} />, trend: "stable" as const, detail: "Calculé à partir du sommeil, des produits et de la luminosité du scan." },
  { label: "Rougeurs", value: 28, color: "hsl(0, 70%, 60%)", icon: <Flame size={18} />, trend: "down" as const, detail: "Plus bas = mieux. Basé sur l'analyse du scan et les facteurs d'inflammation." },
  { label: "Texture", value: 80, color: "hsl(280, 30%, 55%)", icon: <Fingerprint size={18} />, trend: "up" as const, detail: "Indice de lissage issu des scans et de l'utilisation de rétinol." },
  { label: "Sébum", value: 45, color: "hsl(35, 70%, 55%)", icon: <CircleDot size={18} />, trend: "stable" as const, detail: "Production de sébum en zone T. 50 = équilibré." }];

const defaultDailyLog = {
  weather: { temp: 24, humidity: 55, uv: 6, pollution: "Faible" },
  location: "Montreuil, 93",
  cyclePhase: "Folliculaire",
  heartRate: 72,
  stressLevel: 3,
  waterGlasses: 6,
  sleepHours: 7.5,
  alcohol: false,
  workoutIntensity: "Modéré"
};

const cyclePhases = ["Menstruation", "Folliculaire", "Ovulatoire", "Lutéal"];
const intensities = ["Aucun", "Léger", "Modéré", "Intense"];

const ALL_PRODUCTS = ["Nettoyant", "Lotion Tonique", "Sérum", "Hydratant", "SPF 50", "Contour yeux", "Rétinol", "Masque", "Huile de soin", "Exfoliant AHA/BHA", "Traitement local"];

const getDayLabel = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
};

const pastDays = [
  { label: getDayLabel(1), score: 71, hasDiag: true },
  { label: getDayLabel(2), score: 68, hasDiag: true },
  { label: getDayLabel(3), score: 65, hasDiag: false }];


// hasTodayDiag is now dynamic

const factorDetails: Record<string, { title: string; desc: string; }> = {
  temp: { title: "Température", desc: "Les hautes températures augmentent le sébum. Idéal : 18–22°C." },
  humidity: { title: "Humidité", desc: "Faible humidité = peau sèche. Haute = pores obstrués. Idéal : 40–60%." },
  uv: { title: "Indice UV", desc: "UV 6+ : réappliquer SPF toutes les 2h. Cause vieillissement et taches." },
  air: { title: "Qualité de l'air", desc: "La pollution pénètre les pores et cause stress oxydatif et teint terne." },
  location: { title: "Localisation", desc: "Votre position permet d'ajuster les données météo, UV et pollution en temps réel." },
  cycle: { title: "Phase du cycle", desc: "Lutéal = plus gras. Menstruation = sensible. Folliculaire = équilibré." },
  heartStress: { title: "Cœur & Stress", desc: "Le stress augmente le cortisol → plus de boutons. L'exercice améliore l'éclat." },
  water: { title: "Hydratation", desc: "6–8 verres/jour soutiennent la barrière cutanée." },
  sleep: { title: "Sommeil", desc: "La peau se répare pendant le sommeil profond. <6h = collagène altéré." },
  alcohol: { title: "Alcool", desc: "Déshydrate la peau, dilate les vaisseaux et réduit les vitamines A & C." },
  workout: { title: "Sport", desc: "L'exercice améliore la circulation. Sport sans nettoyage = boutons." }
};

const DEFAULT_UPDATED_AGO = 18 * 60 * 60 * 1000; // 18h in ms

const formatUpdatedAgo = (timestamp: number) => {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin}min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  return `il y a ${diffD}j`;
};

const Dashboard = () => {
  const [dailyLog, setDailyLog] = useState(() => {
    const saved = localStorage.getItem("dailyCheckinData");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultDailyLog, ...parsed };
      } catch { }
    }
    return defaultDailyLog;
  });
  const [manualLocation, setManualLocationState] = useState<string | null>(() => localStorage.getItem("manualLocation"));

  const setManualLocation = (loc: string | null) => {
    setManualLocationState(loc);
    if (loc) localStorage.setItem("manualLocation", loc);
    else localStorage.removeItem("manualLocation");
  };
  const { weather: liveWeather, loading: weatherLoading } = useWeatherData(manualLocation || undefined);
  const diagResult = useDiagnosisResult();
  const [baseAmProducts, setBaseAmProducts] = useState<string[]>(() => {
    const saved = localStorage.getItem("local_am_routine");
    return saved ? JSON.parse(saved) : ["Nettoyant", "Hydratant", "SPF 50"];
  });
  const [basePmProducts, setBasePmProducts] = useState<string[]>(() => {
    const saved = localStorage.getItem("local_pm_routine");
    return saved ? JSON.parse(saved) : ["Nettoyant", "Hydratant"];
  });
  const [amSelected, setAmSelected] = useState<string[]>([]);
  const [pmSelected, setPmSelected] = useState<string[]>([]);
  const [routineSetupOpen, setRoutineSetupOpen] = useState(false);
  const [tempAmProducts, setTempAmProducts] = useState<string[]>([]);
  const [tempPmProducts, setTempPmProducts] = useState<string[]>([]);
  const [customProductInput, setCustomProductInput] = useState("");
  const [setupTimeTab, setSetupTimeTab] = useState<"am" | "pm">("am");
  const [productTime, setProductTime] = useState<"am" | "pm">("am");
  const [productsSaved, setProductsSaved] = useState(false);
  const [productFeedback, setProductFeedback] = useState<{ message: string; tips: { text: string; source?: string }[]; positive: boolean } | null>(null);
  const [deviceConnected] = useState(false);
  const [factorOpen, setFactorOpen] = useState<string | null>(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<string | null>(null);
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(null);
  const [userCustomProducts, setUserCustomProducts] = useState<string[]>([]);

  // Check auth state and fetch remote daily checkin profile
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        if (session.user.user_metadata?.first_name) {
          setUserName(session.user.user_metadata.first_name);
        }

        // Fetch remote data to ensure persistence across devices
        // @ts-ignore
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data, error }) => {
            if (data && !error) {
              const profile = data as any;
              setDailyLog(prev => ({
                ...prev,
                heartRate: profile.heart_rate ?? prev.heartRate,
                sleepHours: profile.sleep_hours ?? prev.sleepHours,
                waterGlasses: profile.water_glasses ?? prev.waterGlasses,
                alcoholDrinks: profile.alcohol_drinks ?? prev.alcoholDrinks,
                cyclePhase: profile.cycle_phase ?? prev.cyclePhase,
                stressLevel: profile.stress_level ?? prev.stressLevel,
                foodQuality: profile.food_quality ?? prev.foodQuality
              }));

              if (profile.am_routine && Array.isArray(profile.am_routine)) setBaseAmProducts(profile.am_routine);
              if (profile.pm_routine && Array.isArray(profile.pm_routine)) setBasePmProducts(profile.pm_routine);

              const allUserRoutines = [...(profile.am_routine || []), ...(profile.pm_routine || [])];
              setUserCustomProducts(allUserRoutines.filter((p: string) => !ALL_PRODUCTS.includes(p)));

              setManualUpdates(prev => ({
                ...prev, heartStress: Date.now(), sleep: Date.now(), cycle: Date.now(), water: Date.now(), alcohol: Date.now()
              }));
            }
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.user_metadata?.first_name) {
        setUserName(session.user.user_metadata.first_name);
      } else {
        setUserName(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Track last update timestamps for manual factors (default: 18h ago)
  const [manualUpdates, setManualUpdates] = useState<Record<string, number>>(() => {
    const defaultTime = Date.now() - DEFAULT_UPDATED_AGO;
    return { heartStress: defaultTime, sleep: defaultTime, cycle: defaultTime, water: defaultTime, alcohol: defaultTime, workout: defaultTime };
  });

  // Temp edit values
  const [editValues, setEditValues] = useState({ heartRate: 72, stressLevel: 3, sleepHours: 7.5, location: defaultDailyLog.location });

  const markUpdated = useCallback((factorId: string) => {
    setManualUpdates(prev => ({ ...prev, [factorId]: Date.now() }));
  }, []);

  const hasTodayDiag = !!diagResult;
  const currentScore = diagResult?.globalScore ?? 74;

  const formatDiagDate = () => {
    if (!diagResult) return "Aucun diagnostic";
    const d = new Date(diagResult.date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `il y a ${diffMin}min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH}h`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  // Update dailyLog weather when live data arrives
  useEffect(() => {
    if (!weatherLoading && liveWeather.locationName !== "...") {
      setDailyLog((d) => ({ ...d, weather: liveWeather, location: liveWeather.locationName || d.location }));
    }
  }, [liveWeather, weatherLoading]);

  const currentProducts = productTime === "am" ? baseAmProducts : basePmProducts;
  const selected = productTime === "am" ? amSelected : pmSelected;
  const setSelected = productTime === "am" ? setAmSelected : setPmSelected;

  const toggleProduct = (p: string) => {
    setProductsSaved(false);
    setSelected((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const saveProducts = () => {
    setProductsSaved(true);
    const sel = productTime === "am" ? amSelected : pmSelected;
    const time = productTime;

    type Tip = { text: string; source?: string };
    const feedback: { message: string; tips: Tip[]; positive: boolean } = { message: "", tips: [], positive: true };

    const hasSPF = sel.includes("SPF 50");
    const hasHydratant = sel.includes("Hydratant");
    const hasNettoyant = sel.includes("Nettoyant");
    const hasRetinol = sel.includes("Rétinol");
    const hasSerum = sel.includes("Sérum");
    const hasContourYeux = sel.includes("Contour yeux");
    const hasLotion = sel.includes("Lotion Tonique");
    const hasMasque = sel.includes("Masque");

    const hydration = skinMetrics.find(m => m.label === "Hydratation")!;
    const redness = skinMetrics.find(m => m.label === "Rougeurs")!;
    const sebum = skinMetrics.find(m => m.label === "Sébum")!;
    const uv = dailyLog.weather.uv;
    const humidity = dailyLog.weather.humidity;

    if (time === "am") {
      if (!hasSPF && uv >= 3) {
        feedback.message = "⚠️ Protection solaire manquante";
        feedback.positive = false;
        feedback.tips.push({
          text: `UV à ${uv} aujourd'hui. 80% du vieillissement cutané est dû aux UV (photo-vieillissement). Un SPF 30+ réduit le risque de mélanome de 50%.`,
          source: "Journal of Clinical Oncology, 2011"
        });
      } else if (hasSPF && hasHydratant && hasNettoyant) {
        feedback.message = "Routine matinale exemplaire ! ☀️";
        feedback.positive = true;
        if (hasSerum) {
          feedback.tips.push({
            text: "L'application d'un sérum avant l'hydratant augmente l'absorption des actifs de 20 à 30% grâce aux molécules plus petites qui pénètrent mieux l'épiderme.",
            source: "British Journal of Dermatology"
          });
        }
      } else {
        feedback.message = "Routine enregistrée ✓";
        feedback.positive = true;
      }

      if (!hasHydratant && hydration.value < 70) {
        feedback.tips.push({
          text: "Hydratation cutanée basse. La perte insensible en eau (PIE) augmente de 25% sans hydratant, accélérant l'apparition de ridules.",
          source: "International Journal of Cosmetic Science"
        });
        feedback.positive = false;
      }

      if (!hasNettoyant) {
        feedback.tips.push({
          text: "Le nettoyage matinal élimine le sébum nocturne et optimise la pénétration des actifs suivants. Optez pour un nettoyant doux pH 5.5.",
          source: "Skin Research & Technology"
        });
      }

      if (hasSPF && uv >= 6) {
        feedback.tips.push({
          text: `UV élevé (${uv}). Réappliquez votre SPF toutes les 2h en exposition directe. Les UVA traversent les vitres et les nuages.`,
          source: "OMS – Recommandations UV"
        });
      }

      if (humidity < 35 && !hasSerum) {
        feedback.tips.push({
          text: "Air sec détecté. Un sérum à l'acide hyaluronique peut retenir jusqu'à 1000× son poids en eau et compenser la faible humidité ambiante.",
          source: "Journal of Drugs in Dermatology"
        });
      }

    } else {
      // PM routine
      if (hasRetinol && hasSPF) {
        feedback.message = "⚠️ Incompatibilité détectée";
        feedback.positive = false;
        feedback.tips.push({
          text: "Le SPF n'est pas nécessaire le soir. De plus, certains filtres UV peuvent interférer avec l'absorption du rétinol et réduire son efficacité.",
          source: "Dermatologic Therapy, 2006"
        });
      } else if (hasRetinol && hasNettoyant) {
        feedback.message = "Routine du soir optimale ! 🌙";
        feedback.positive = true;
        feedback.tips.push({
          text: "Le rétinol stimule le renouvellement cellulaire et la production de collagène. Études cliniques : réduction des rides de 44% après 12 semaines d'usage régulier.",
          source: "Archives of Dermatology, 2007"
        });
      } else {
        feedback.message = "Routine du soir enregistrée ✓";
        feedback.positive = true;
      }

      if (!hasNettoyant) {
        feedback.tips.push({
          text: "Le double nettoyage du soir retire les particules fines (PM2.5) et résidus de SPF qui obstruent les pores et causent un stress oxydatif cutané.",
          source: "Journal of Dermatological Science"
        });
        feedback.positive = false;
      }

      if (hasContourYeux) {
        feedback.tips.push({
          text: "La peau du contour des yeux est 10× plus fine que le reste du visage. L'application nocturne de peptides favorise la microcirculation et réduit les cernes de 35%.",
          source: "Clinical, Cosmetic & Investigational Dermatology"
        });
      }

      if (hasRetinol && !hasHydratant) {
        feedback.tips.push({
          text: "Le rétinol peut altérer la barrière cutanée. Appliquez toujours un hydratant par-dessus pour limiter l'irritation (méthode « sandwich »).",
          source: "Journal of the American Academy of Dermatology"
        });
        feedback.positive = false;
      }

      if (hasMasque) {
        feedback.tips.push({
          text: "Les masques de nuit à base de céramides restaurent la barrière cutanée. Idéal 2-3×/semaine pour une hydratation profonde sans surcharger la peau.",
          source: "Experimental Dermatology"
        });
      }
    }

    // Diagnostic-based contextual feedback
    if (redness.value > 30) {
      if (!hasLotion) {
        feedback.tips.push({
          text: "Rougeurs élevées détectées. La niacinamide (vitamine B3) à 4% réduit les rougeurs de 21% en 8 semaines et renforce la barrière cutanée.",
          source: "British Journal of Dermatology, 2000"
        });
      }
    }

    if (sebum.value > 60 && time === "am" && !hasLotion) {
      feedback.tips.push({
        text: "Production de sébum élevée. L'acide salicylique (BHA) régule la production de sébum et exfolie l'intérieur des pores, réduisant les imperfections de 52%.",
        source: "Journal of the European Academy of Dermatology"
      });
    }

    if (diagResult?.zones) {
      const alertZones = diagResult.zones.filter(z => z.status === "alert");
      if (alertZones.length > 0 && time === "pm") {
        feedback.tips.push({
          text: `Zone(s) en alerte : ${alertZones.map(z => z.label).join(", ")}. Ciblez ces zones avec un soin localisé (acide azélaïque, centella asiatica) pour accélérer la réparation tissulaire.`,
          source: "Phytotherapy Research"
        });
      }
    }

    if (feedback.tips.length === 0 && feedback.positive) {
      feedback.tips.push({
        text: "Routine bien équilibrée pour votre type de peau. La régularité est le facteur n°1 d'efficacité en skincare — continuez ainsi !",
        source: "American Academy of Dermatology"
      });
    }

    setProductFeedback(feedback);
    setTimeout(() => setProductFeedback(null), 8000);
  };

  const saveRoutineConfig = async () => {
    setBaseAmProducts(tempAmProducts);
    setBasePmProducts(tempPmProducts);
    localStorage.setItem("local_am_routine", JSON.stringify(tempAmProducts));
    localStorage.setItem("local_pm_routine", JSON.stringify(tempPmProducts));
    setRoutineSetupOpen(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        // @ts-ignore
        await supabase.from("profiles").update({
          am_routine: tempAmProducts,
          pm_routine: tempPmProducts
        }).eq("id", sessionData.session.user.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSetupProduct = (p: string) => {
    if (setupTimeTab === "am") {
      setTempAmProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    } else {
      setTempPmProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    }
  };

  const addCustomSetupProduct = () => {
    if (!customProductInput.trim()) return;
    const p = customProductInput.trim();
    if (setupTimeTab === "am" && !tempAmProducts.includes(p)) setTempAmProducts(prev => [...prev, p]);
    if (setupTimeTab === "pm" && !tempPmProducts.includes(p)) setTempPmProducts(prev => [...prev, p]);

    if (!ALL_PRODUCTS.includes(p) && !userCustomProducts.includes(p)) {
      setUserCustomProducts(prev => [...prev, p]);
    }

    setCustomProductInput("");
  };

  const openEditDialog = (id: string) => {
    setEditValues({ heartRate: dailyLog.heartRate, stressLevel: dailyLog.stressLevel, sleepHours: dailyLog.sleepHours, location: manualLocation || dailyLog.location });
    setEditingFactor(id);
  };

  const saveEditFactor = () => {
    if (!editingFactor) return;

    if (editingFactor === "location") {
      setManualLocation(editValues.location);
    } else {
      setDailyLog(d => ({ ...d, heartRate: editValues.heartRate, stressLevel: editValues.stressLevel, sleepHours: editValues.sleepHours }));
      markUpdated(editingFactor);
    }

    setEditingFactor(null);
  };

  const ManualLabel = ({ id }: { id: string }) => {
    if (deviceConnected) return null;
    return (
      <p className="text-[9px] text-muted-foreground/60">
        Manuel · <span className="text-primary/50">{formatUpdatedAgo(manualUpdates[id] ?? Date.now())}</span>
      </p>
    );
  };

  const FactorButton = ({ id, children }: { id: string; children: React.ReactNode; }) =>
    <button onClick={() => setFactorOpen(id)} className="text-left w-full">
      {children}
    </button>;


  return (
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
        <p className="text-[#AAAAAA] text-xs font-mono uppercase tracking-[0.1em]">Bonjour {userName ? userName : ""}✨</p>
        <h1 className="text-3xl font-display font-bold text-[#111111] mt-2">Votre peau aujourd'hui</h1>
      </motion.div>

      {/* Diagnostic CTA + Score combined panel */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
        className="bg-white border border-[#E5E5E5] p-8 mb-8 relative overflow-hidden">

        <div className="relative flex items-start gap-5">
          {/* Diagnostic photo + past days vertical */}
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <motion.div
              initial={hasTodayDiag ? { scale: 0.8, opacity: 0, rotateY: 90 } : { scale: 1, opacity: 1 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.3 }}
              className={`w-24 h-24 border flex items-center justify-center overflow-hidden ${hasTodayDiag ? 'border-[#111111]' : 'border-[#E5E5E5] bg-white'}`}
            >
              {hasTodayDiag ?
                <motion.img
                  src={faceScan}
                  alt="Dernier scan"
                  className="w-full h-full object-cover"
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
                /> :
                <div className="flex flex-col items-center gap-1.5 opacity-40">
                  <Camera size={24} className="text-[#AAAAAA]" />
                  <span className="text-[10px] text-[#AAAAAA] font-mono uppercase tracking-[0.1em]">Pas encore</span>
                </div>
              }
            </motion.div>
            {pastDays.length > 0 &&
              <div className="flex flex-col gap-1 w-full">
                {pastDays.map((day) =>
                  <button key={day.label}
                    className="flex items-center justify-between gap-2 border border-[#E5E5E5] px-2.5 py-1 transition-colors w-full"
                    onClick={() => {/* TODO: show past diagnostic */ }}>
                    <span className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.05em]">{day.label}</span>
                    <span className={`text-[11px] font-bold ${day.hasDiag ? 'text-[#111111]' : 'text-[#AAAAAA]'}`}>
                      {day.score}
                    </span>
                  </button>
                )}
              </div>
            }
          </div>

          {/* Score + info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col items-center gap-3">
              <div className="flex-shrink-0 cursor-pointer" onClick={() => setScoreOpen(true)}>
                <SkinScoreRing score={currentScore} size={130} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-[#111111]">Votre peau est <span className="font-bold underline">{currentScore >= 70 ? "belle" : currentScore >= 50 ? "correcte" : "à surveiller"}</span></p>
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em]">
                  <Calendar size={11} /><span>Dernier diag : {formatDiagDate()}</span>
                </div>
                <button onClick={() => setScoreOpen(true)} className="text-[11px] text-[#111111] font-bold uppercase tracking-[0.1em] border-b border-[#111111]">
                  Voir le détail
                </button>
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => navigate("/diagnosis")}
          className="relative mt-8 w-full flex items-center justify-between bg-[#111111] text-white px-6 py-4 hover:bg-black transition-colors">
          <div className="flex items-center gap-4">
            <Stethoscope size={20} />
            <div className="text-left">
              <p className="text-sm font-bold uppercase tracking-[0.05em]">Faire un diagnostic</p>
              <p className="text-[11px] opacity-60 font-mono tracking-[0.1em] uppercase">Analysez votre peau en 30s</p>
            </div>
          </div>
          <ChevronRight size={18} className="opacity-60" />
        </button>
      </motion.div>

      {/* Détail du score */}
      <Dialog open={scoreOpen} onOpenChange={setScoreOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Détail du score</DialogTitle>
            <DialogDescription>Comment votre score de {currentScore}/100 est calculé</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {skinMetrics.map((m) =>
              <div key={m.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">{m.icon}{m.label}</span>
                <span className="font-semibold text-foreground">{m.value}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Moyenne pondérée</span>
              <span className="font-semibold text-primary">{currentScore}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Score = moyenne pondérée. Rougeurs inversées (bas = mieux).</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conseils personnalisés */}
      <h2 className="text-xl font-display font-bold text-[#111111] mb-6 uppercase tracking-[0.05em]">
        Conseils du jour
      </h2>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="bg-card  p-4  mb-5 space-y-3">
        {(() => {
          const tips: { icon: React.ReactNode; text: string; priority: "high" | "medium" | "low"; ingredients?: string[] }[] = [];

          // Tips basés sur les métriques de peau
          const hydration = skinMetrics.find(m => m.label === "Hydratation")!;
          const redness = skinMetrics.find(m => m.label === "Rougeurs")!;
          const glow = skinMetrics.find(m => m.label === "Éclat")!;
          const sebum = skinMetrics.find(m => m.label === "Sébum")!;
          const texture = skinMetrics.find(m => m.label === "Texture")!;

          if (hydration.value < 70) tips.push({ icon: <GlassWater size={16} />, text: "Hydratation faible — pensez à boire davantage et appliquer un sérum hydratant.", priority: "high", ingredients: ["Acide hyaluronique", "Glycérine", "Céramides", "Aloe vera"] });
          if (redness.value > 35) tips.push({ icon: <ShieldAlert size={16} />, text: "Rougeurs élevées — évitez les produits agressifs et privilégiez des soins apaisants.", priority: "high", ingredients: ["Niacinamide", "Centella asiatica", "Bisabolol", "Avoine colloïdale"] });
          if (glow.value < 60) tips.push({ icon: <Sparkles size={16} />, text: "Éclat en berne — un sérum vitamine C le matin peut faire la différence.", priority: "medium", ingredients: ["Vitamine C (acide ascorbique)", "Alpha-arbutine", "Acide kojique"] });
          if (sebum.value > 60) tips.push({ icon: <CircleDot size={16} />, text: "Excès de sébum — utilisez un nettoyant doux et évitez les crèmes trop riches.", priority: "medium", ingredients: ["Niacinamide", "Acide salicylique (BHA)", "Zinc", "Argile verte"] });
          if (texture.value < 65) tips.push({ icon: <Fingerprint size={16} />, text: "Texture irrégulière — une exfoliation douce 2x/semaine peut aider.", priority: "medium", ingredients: ["Rétinol", "AHA (acide glycolique)", "PHA", "Bakuchiol"] });

          // Tips basés sur le diagnostic (zones)
          if (diagResult?.zones) {
            const alertZones = diagResult.zones.filter(z => z.status === "alert");
            const warningZones = diagResult.zones.filter(z => z.status === "warning");
            if (alertZones.length > 0) {
              tips.push({ icon: <Stethoscope size={16} className="text-destructive" />, text: `Diagnostic : zone${alertZones.length > 1 ? "s" : ""} ${alertZones.map(z => z.label).join(", ")} en alerte — consultez un dermatologue si persistant.`, priority: "high", ingredients: ["Niacinamide 10%", "Centella asiatica", "Panthénol"] });
            }
            if (warningZones.length > 0) {
              tips.push({ icon: <Stethoscope size={16} className="text-skin-glow" />, text: `Zone${warningZones.length > 1 ? "s" : ""} ${warningZones.map(z => z.label).join(", ")} à surveiller — adaptez votre routine sur ces zones.`, priority: "medium", ingredients: ["Acide azélaïque", "Niacinamide", "Extrait de réglisse"] });
            }
            // Low-scoring zones ingredient reco
            const lowZones = diagResult.zones.filter(z => z.score < 50);
            if (lowZones.length > 0 && !alertZones.length) {
              tips.push({ icon: <FlaskRound size={16} className="text-primary" />, text: `Score faible sur ${lowZones.map(z => z.label).join(", ")} — renforcez les soins ciblés sur ces zones.`, priority: "medium", ingredients: ["Sérum réparateur", "Huile de jojoba", "Vitamine E"] });
            }
          }

          // Tips basés sur les paramètres du jour
          if (dailyLog.weather.uv >= 6) tips.push({ icon: <Sun size={16} />, text: `UV à ${dailyLog.weather.uv} — réappliquez votre SPF toutes les 2h, surtout en extérieur.`, priority: "high" });
          if (dailyLog.weather.humidity < 40) tips.push({ icon: <Droplets size={16} />, text: "Air sec aujourd'hui — renforcez l'hydratation avec un brumisateur ou une crème riche.", priority: "medium", ingredients: ["Acide hyaluronique", "Squalane"] });
          if (dailyLog.weather.humidity > 75) tips.push({ icon: <Droplets size={16} />, text: "Forte humidité — allégez votre routine pour éviter les pores bouchés.", priority: "medium" });
          if (dailyLog.sleepHours < 7) tips.push({ icon: <Moon size={16} />, text: "Sommeil insuffisant — votre peau se régénère la nuit, essayez de dormir 7h+.", priority: "high", ingredients: ["Rétinol (soir)", "Peptides", "Bakuchiol"] });
          if (dailyLog.alcohol) tips.push({ icon: <Wine size={16} />, text: "Alcool détecté — hydratez-vous davantage pour compenser la déshydratation cutanée.", priority: "medium" });
          if (dailyLog.waterGlasses < 5) tips.push({ icon: <GlassWater size={16} />, text: `Seulement ${dailyLog.waterGlasses} verres d'eau — visez au moins 6 à 8 verres par jour.`, priority: "high" });
          if (dailyLog.cyclePhase === "Lutéal") tips.push({ icon: <Heart size={16} />, text: "Phase lutéale — votre peau peut être plus grasse, privilégiez un nettoyage doux.", priority: "low", ingredients: ["Acide salicylique", "Niacinamide", "Tea tree"] });
          if (dailyLog.cyclePhase === "Menstruation") tips.push({ icon: <Heart size={16} />, text: "Phase menstruelle — peau sensible, optez pour des soins doux et apaisants.", priority: "low", ingredients: ["Avoine", "Aloe vera", "Camomille"] });

          // Trier par priorité et limiter à 5
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const sorted = tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 5);

          if (sorted.length === 0) {
            sorted.push({ icon: <Sparkles size={16} className="text-primary" />, text: "Tout semble bien ! Continuez votre routine actuelle. 🎉", priority: "low" });
          }

          return sorted.map((tip, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
              className="flex flex-col gap-3 p-5 border border-[#E5E5E5] bg-white">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex-shrink-0 text-[#111111]">{tip.icon}</span>
                <p className="text-sm text-[#111111] leading-relaxed">{tip.text}</p>
              </div>
              {tip.ingredients && tip.ingredients.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-9">
                  {tip.ingredients.map(ing => (
                    <span key={ing} className="text-[10px] border border-[#111111] text-[#111111] px-2.5 py-1 font-mono uppercase tracking-[0.1em]">{ing}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ));
        })()}
      </motion.div>

      {/* Facteurs quotidiens */}
      <h2 className="text-xl font-display font-bold text-[#111111] mb-6 uppercase tracking-[0.05em]">Paramètres du jour</h2>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white border border-[#E5E5E5] p-6 mb-8">
        {/* Location row */}
        <button onClick={() => openEditDialog("location")} className="text-left w-full focus:outline-none">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E5E5E5] hover:bg-muted/10 p-2 transition-colors">
            <MapPin size={18} className="text-[#111111]" />
            <div>
              <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em]">Localisation</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-base font-bold text-[#111111]">{dailyLog.location}</p>
                <Pencil size={12} className="text-[#AAAAAA]/40" />
              </div>
            </div>
            <span className="ml-auto flex items-center gap-2 text-[10px] font-mono text-[#111111] font-bold uppercase tracking-[0.1em]">
              <span className="w-1.5 h-1.5 bg-[#111111] animate-pulse" />
              En direct
            </span>
          </div>
        </button>
        <div className="grid grid-cols-4 gap-4 text-center">
          {[
            { id: "temp", icon: <Thermometer size={18} />, val: `${dailyLog.weather.temp}°C`, sub: "Temp" },
            { id: "humidity", icon: <Droplets size={18} />, val: `${dailyLog.weather.humidity}%`, sub: "Humidité" },
            { id: "uv", icon: <Sun size={18} />, val: `${dailyLog.weather.uv}`, sub: "UV" },
            { id: "air", icon: <CloudSun size={18} />, val: dailyLog.weather.pollution, sub: "Air" }].
            map((item) =>
              <FactorButton key={item.id} id={item.id}>
                <div className="flex flex-col items-center gap-3 hover:bg-muted/10 p-3 transition-colors border border-transparent">
                  <div className="text-[#111111]">{item.icon}</div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#111111] leading-tight uppercase">{item.val}</p>
                    <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em]">{item.sub}</p>
                  </div>
                </div>
              </FactorButton>
            )}
        </div>
      </motion.div>

      {/* Appareil connecté + lifestyle factors */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white border border-[#E5E5E5] p-6 mb-8">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-4">
            {deviceConnected ?
              <Bluetooth size={18} className="text-[#111111]" /> :
              <BluetoothOff size={18} className="text-[#AAAAAA]" />
            }
            <div>
              <p className="text-sm font-bold text-[#111111] uppercase tracking-[0.05em]">
                {deviceConnected ? "Apple Watch connectée" : "Aucun appareil connecté"}
              </p>
              <p className="text-[11px] text-[#AAAAAA] font-mono uppercase tracking-[0.1em] mt-1">
                {deviceConnected ? "Sport, cycle, rythme cardiaque et sommeil synchronisés" : "Saisie manuelle"}
              </p>
            </div>
          </div>
          <button className="text-[11px] font-bold text-white px-4 py-2 bg-[#111111] uppercase tracking-[0.1em]">
            {deviceConnected ? "Réglages" : "Connecter"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FactorButton id="cycle">
            <div className="flex items-center gap-3 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5]">
              <FlaskConical size={18} className="text-[#111111]" />
              <div className="flex-1">
                <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em]">Cycle</p>
                <select value={dailyLog.cyclePhase} onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { setDailyLog((d) => ({ ...d, cyclePhase: e.target.value })); markUpdated("cycle"); }}
                  className="text-sm font-bold text-[#111111] bg-transparent border-none p-0 focus:outline-none w-full uppercase">
                  {cyclePhases.map((p) => <option key={p} className="bg-white">{p}</option>)}
                </select>
                <ManualLabel id="cycle" />
              </div>
            </div>
          </FactorButton>
          <button onClick={() => openEditDialog("heartStress")} className="text-left w-full">
            <div className="flex items-center gap-3 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5]">
              <Heart size={18} className="text-[#111111]" />
              <div className="flex-1">
                <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em]">Cœur / Stress</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#111111]">{dailyLog.heartRate} bpm · {dailyLog.stressLevel}/5</p>
                  {!deviceConnected && <Pencil size={12} className="text-[#AAAAAA]/40" />}
                </div>
                <ManualLabel id="heartStress" />
              </div>
            </div>
          </button>
          <FactorButton id="water">
            <div className="flex items-center gap-3 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5]">
              <Droplets size={18} className="text-[#111111]" />
              <div className="flex-1">
                <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em]">Eau</p>
                <div className="flex gap-1 mt-1">
                  {[...Array(8)].map((_, i) =>
                    <button key={i} onClick={(e) => { e.stopPropagation(); setDailyLog((d) => ({ ...d, waterGlasses: i + 1 })); markUpdated("water"); }}
                      className={`w-4 h-6 ${i < dailyLog.waterGlasses ? 'bg-[#111111]' : 'border border-[#E5E5E5]'}`} />
                  )}
                </div>
                <ManualLabel id="water" />
              </div>
            </div>
          </FactorButton>
          <button onClick={() => openEditDialog("sleep")} className="text-left w-full">
            <div className="flex items-center gap-3 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5]">
              <Moon size={18} className="text-[#111111]" />
              <div className="flex-1">
                <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em]">Sommeil</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-bold text-[#111111]">{dailyLog.sleepHours}h</p>
                  {!deviceConnected && <Pencil size={12} className="text-[#AAAAAA]/40" />}
                </div>
                <ManualLabel id="sleep" />
              </div>
            </div>
          </button>
          <FactorButton id="alcohol">
            <div className="flex items-center gap-3 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5]">
              <Wine size={18} className="text-[#111111]" />
              <div className="flex-1">
                <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em]">Alcool</p>
                <button onClick={(e) => { e.stopPropagation(); setDailyLog((d) => ({ ...d, alcohol: !d.alcohol })); markUpdated("alcohol"); }}
                  className={`text-sm font-bold uppercase mt-1 ${dailyLog.alcohol ? 'text-[#111111] underline' : 'text-[#AAAAAA]'}`}>
                  {dailyLog.alcohol ? "Oui" : "Non"}
                </button>
                <ManualLabel id="alcohol" />
              </div>
            </div>
          </FactorButton>
          <FactorButton id="workout">
            <div className="flex items-center gap-3 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5]">
              <Dumbbell size={18} className="text-[#111111]" />
              <div className="flex-1">
                <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em]">Sport</p>
                <select value={dailyLog.workoutIntensity} onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { setDailyLog((d) => ({ ...d, workoutIntensity: e.target.value })); markUpdated("workout"); }}
                  className="text-sm font-bold text-[#111111] bg-transparent border-none p-0 focus:outline-none w-full uppercase mt-1">
                  {intensities.map((i) => <option key={i} className="bg-white">{i}</option>)}
                </select>
                <ManualLabel id="workout" />
              </div>
            </div>
          </FactorButton>
        </div>
      </motion.div>

      {/* Dialogue facteur */}
      <Dialog open={!!factorOpen} onOpenChange={() => setFactorOpen(null)}>
        <DialogContent className="max-w-sm rounded-none border border-[#111111]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display uppercase tracking-[0.05em] text-[#111111]">{factorOpen ? factorDetails[factorOpen]?.title : ""}</DialogTitle>
            <DialogDescription className="text-sm text-[#111111] leading-relaxed mt-2">{factorOpen ? factorDetails[factorOpen]?.desc : ""}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Dialogue édition facteur manuel */}
      <Dialog open={!!editingFactor} onOpenChange={() => setEditingFactor(null)}>
        <DialogContent className="max-w-sm rounded-none border border-[#111111]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display uppercase tracking-[0.05em] text-[#111111]">
              {editingFactor === "heartStress" ? "Cœur & Stress" : editingFactor === "sleep" ? "Sommeil" : "Localisation"}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em] mt-2 italic">Modifiez vos données manuellement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editingFactor === "location" && (
              <div>
                <label className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em] mb-2 block font-bold">Ville ou code postal</label>
                <div className="flex gap-2">
                  <Input type="text" value={editValues.location} onChange={e => setEditValues(v => ({ ...v, location: e.target.value }))} placeholder="Ex: Paris, 75001" className="rounded-none border-[#E5E5E5] focus:border-[#111111] transition-colors" autoFocus />
                  <button onClick={() => { setManualLocation(null); setEditingFactor(null); }} className="px-4 border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white transition-colors" title="Me localiser automatiquement">
                    <MapPin size={18} />
                  </button>
                </div>
              </div>
            )}
            {editingFactor === "heartStress" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Rythme cardiaque (bpm)</label>
                  <Input type="number" value={editValues.heartRate} onChange={e => setEditValues(v => ({ ...v, heartRate: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em] mb-3 block font-bold">Niveau de stress (1-5)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setEditValues(v => ({ ...v, stressLevel: n }))}
                        className={`w-10 h-10 border text-sm font-bold transition-all ${editValues.stressLevel === n ? 'bg-[#111111] border-[#111111] text-white' : 'bg-white border-[#E5E5E5] text-[#AAAAAA]'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {editingFactor === "sleep" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Heures de sommeil</label>
                <Input type="number" step="0.5" value={editValues.sleepHours} onChange={e => setEditValues(v => ({ ...v, sleepHours: Number(e.target.value) }))} />
              </div>
            )}
            <button onClick={saveEditFactor}
              className="w-full py-4 bg-[#111111] text-white text-sm font-bold uppercase tracking-[0.1em] hover:bg-black transition-colors">
              Enregistrer
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogue Setup Routine */}
      <Dialog open={routineSetupOpen} onOpenChange={setRoutineSetupOpen}>
        <DialogContent className="max-w-sm rounded-2xl h-[85vh] flex flex-col p-4">
          <DialogHeader className="pt-2">
            <DialogTitle className="text-foreground">Ma Routine</DialogTitle>
            <DialogDescription>Quels produits utilisez-vous habituellement ?</DialogDescription>
          </DialogHeader>

          <div className="flex bg-muted  p-1 mb-2">
            <button onClick={() => setSetupTimeTab("am")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${setupTimeTab === "am" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
              ☀️ Matin
            </button>
            <button onClick={() => setSetupTimeTab("pm")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${setupTimeTab === "pm" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
              🌙 Soir
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 px-1 pb-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Produits standards</p>
              <div className="flex flex-col gap-1.5">
                {Array.from(new Set([...ALL_PRODUCTS, ...userCustomProducts])).map(p => {
                  const isActive = setupTimeTab === "am" ? tempAmProducts.includes(p) : tempPmProducts.includes(p);
                  const isCustom = !ALL_PRODUCTS.includes(p);
                  return (
                    <div key={p} className="flex gap-2">
                      <button onClick={() => toggleSetupProduct(p)} className={`flex-1 flex justify-between items-center px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${isActive ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-foreground/80 hover:bg-accent'}`}>
                        {p}
                        {isActive && <Check size={14} />}
                      </button>
                      {isCustom && (
                        <button onClick={() => {
                          setUserCustomProducts(prev => prev.filter(x => x !== p));
                          setTempAmProducts(prev => prev.filter(x => x !== p));
                          setTempPmProducts(prev => prev.filter(x => x !== p));
                        }} className="px-3 py-2.5 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 hover:bg-destructive/20 transition-colors">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ajouter un produit (ex: Crème VICHY)</p>
              <div className="flex gap-2">
                <Input value={customProductInput} onChange={e => setCustomProductInput(e.target.value)} placeholder="Nom du produit" className="text-sm rounded-xl" onKeyDown={e => { if (e.key === 'Enter') addCustomSetupProduct() }} />
                <button onClick={addCustomSetupProduct} className="bg-primary text-primary-foreground px-4 rounded-xl text-sm font-semibold hover:opacity-90 transition-all">
                  Ajouter
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button onClick={saveRoutineConfig} className="w-full py-3.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity">
              Valider ma configuration
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Produits utilisés */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-card  p-4  mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Ma Routine</p>
            <button onClick={() => {
              setTempAmProducts(baseAmProducts);
              setTempPmProducts(basePmProducts);
              setRoutineSetupOpen(true);
            }} className="p-1 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-primary">
              <Pencil size={14} />
            </button>
          </div>
          <div className="flex bg-muted rounded-full p-0.5">
            <button onClick={() => { setProductTime("am"); setProductsSaved(false); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${productTime === "am" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
              ☀️ Matin
            </button>
            <button onClick={() => { setProductTime("pm"); setProductsSaved(false); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${productTime === "pm" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
              🌙 Soir
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {currentProducts.map((p) =>
            <button key={p} onClick={() => toggleProduct(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selected.includes(p) ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`
              }>
              {selected.includes(p) && <Check size={10} className="inline mr-1" />}{p}
            </button>
          )}
        </div>
        <button onClick={saveProducts}
          className={`w-full py-2 rounded-xl text-xs font-semibold transition-all ${productsSaved ? 'bg-accent text-primary' : 'bg-primary text-primary-foreground'}`
          }>
          {productsSaved ? "✓ Routine réalisée" : "Routine réalisée"}
        </button>

        {/* Feedback popup */}
        <AnimatePresence>
          {productFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`mt-3 rounded-xl p-3 border ${productFeedback.positive
                ? "bg-primary/5 border-primary/15"
                : "bg-destructive/5 border-destructive/15"
                }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {productFeedback.positive
                  ? <ThumbsUp size={14} className="text-primary" />
                  : <ShieldAlert size={14} className="text-destructive" />
                }
                <p className={`text-xs font-semibold ${productFeedback.positive ? "text-primary" : "text-destructive"}`}>
                  {productFeedback.message}
                </p>
              </div>
              {productFeedback.tips.map((tip, i) => (
                <div key={i} className="ml-5 mb-1.5">
                  <p className="text-[11px] text-foreground/80 leading-relaxed">• {tip.text}</p>
                  {tip.source && (
                    <p className="text-[9px] text-muted-foreground/50 italic ml-2 mt-0.5">— {tip.source}</p>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Métriques peau */}
      <h2 className="text-lg font-display font-semibold text-foreground mb-3">Indicateurs de ma peau</h2>
      <div className="grid grid-cols-2 gap-3">
        {skinMetrics.map((metric, i) =>
          <motion.div key={metric.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
            <MetricCard {...metric} trendTone={trendToneForMetric(metric.label, metric.trend)} />
          </motion.div>
        )}
      </div>
    </div>);

};

export default Dashboard;