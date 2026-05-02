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
import { Slider } from "@/components/ui/slider";
import { calculateCyclePhase } from "@/utils/cycle";
import axios from "axios";
import { classifyStravaIntensity } from "@/data/stravaIntensity";
import StravaConnect from "./StravaConnect";

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
  { label: "Hydratation", value: 72, color: "#C4846A", icon: <Droplets size={18} strokeWidth={1.5} />, trend: "up" as const, detail: "Estimation par rapport à l'indice d'hydratation de référence." },
  { label: "Éclat", value: 65, color: "#8A9E89", icon: <Sun size={18} strokeWidth={1.5} />, trend: "stable" as const, detail: "Indice de réflectivité cutanée calculé par photométrie." },
  { label: "Rougeurs", value: 28, color: "#C08484", icon: <Flame size={18} strokeWidth={1.5} />, trend: "down" as const, detail: "Concentration de micro-inflammation détectée." },
  { label: "Texture", value: 80, color: "#9A9590", icon: <Fingerprint size={18} strokeWidth={1.5} />, trend: "up" as const, detail: "Indice de lissage et régularité du grain de peau." },
  { label: "Sébum", value: 45, color: "#A89A82", icon: <CircleDot size={18} strokeWidth={1.5} />, trend: "stable" as const, detail: "Niveau de lipides de surface (Zone T)." }];

const defaultDailyLog = {
  weather: { temp: 24, humidity: 55, uv: 6, pollution: "Faible" },
  location: "Montreuil, 93",
  lastPeriodDate: "" as string,
  cyclePhase: "Folliculaire",
  heartRate: 72,
  stressLevel: 3,
  waterGlasses: 6,
  sleepHours: 7.5,
  alcohol: false,
  workoutIntensity: "Modéré",
  cycleDuration: 28,
  periodDuration: 5,
  makeupRemoved: true,
  didSport: "Non",
  stravaData: null as any,
  foodQuality: "Équilibrée",
};


const cyclePhases = ["Menstruation", "Folliculaire", "Ovulatoire", "Lutéal"];
const workoutIntensities = ["Non", "Léger", "Modéré", "Intense"];
const STRESS_LABELS = ["", "Zen", "Calme", "Modéré", "Élevé", "Extrême"];

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
  const [selectedTip, setSelectedTip] = useState<{ icon: React.ReactNode; text: string; priority: string; ingredients?: string[] } | null>(null);
  
  const [isStravaLoading, setIsStravaLoading] = useState(false);

  useEffect(() => {
    const fetchStravaActivities = async () => {
        const athleteId = localStorage.getItem("athleteId");
        if (!athleteId) return;

        setIsStravaLoading(true);
        try {
            const res = await axios.get(`https://smart-skin-scope.onrender.com/activities?athleteId=${athleteId}`);
            const activities = res.data;

            if (activities && activities.length > 0) {
                const now = new Date();
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);

                const recentActivities = activities.filter((a: any) => {
                    const date = new Date(a.start_date);
                    return date >= yesterday;
                });

                if (recentActivities.length > 0) {
                    const latest = recentActivities[0];
                    const result = classifyStravaIntensity(latest, 48);

                    const intensityMap: Record<string, string> = {
                        "none": "Non",
                        "light": "Léger",
                        "moderate": "Modéré",
                        "intense": "Intense"
                    };

                    const mappedIntensity = intensityMap[result.level] || "Non";

                    setDailyLog(prev => {
                        const updated = {
                            ...prev,
                            didSport: mappedIntensity,
                            stravaData: {
                                sport: result.sport,
                                label: result.label,
                                duration: result.durationMin
                            }
                        };
                        localStorage.setItem("dailyCheckinData", JSON.stringify(updated));
                        return updated;
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching strava activities", error);
        } finally {
            setIsStravaLoading(false);
        }
    };
    fetchStravaActivities();
  }, []);

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
                lastPeriodDate: profile.last_period_date ?? prev.lastPeriodDate,
                cyclePhase: profile.cycle_phase ?? prev.cyclePhase,
                cycleDuration: profile.cycle_duration ?? prev.cycleDuration,
                periodDuration: profile.period_duration ?? prev.periodDuration,
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
  
  const [editValue, setEditValue] = useState<any>(null);
  const [locationInput, setLocationInput] = useState("");
  const [makeupStep, setMakeupStep] = useState(1);
  const [woreMakeup, setWoreMakeup] = useState<boolean | null>(null);

  const saveEdit = async () => {
        if (!editingFactor) return;
        let newLog = { ...dailyLog };
        let syncValue = editValue;
        
        if (editingFactor === 'location') { syncValue = locationInput; newLog.location = locationInput; setManualLocation(locationInput); }
        else if (editingFactor === 'sleep') newLog.sleepHours = editValue;
        else if (editingFactor === 'stress') newLog.stressLevel = editValue;
        else if (editingFactor === 'water') newLog.waterGlasses = editValue === "Trop" ? 12 : (editValue === "Suffisamment" ? 8 : 4);
        else if (editingFactor === 'alcohol') newLog.alcoholDrinks = editValue;
        else if (editingFactor === 'sport') newLog.didSport = editValue;
        else if (editingFactor === 'cycle') {
            if (typeof editValue === 'object' && editValue !== null) {
                newLog.cyclePhase = editValue.phase;
                newLog.cycleDuration = editValue.cycleDuration;
                newLog.periodDuration = editValue.periodDuration;
            } else {
                newLog.cyclePhase = editValue;
            }
        }
        else if (editingFactor === 'makeup') { newLog.makeupRemoved = editValue; }
        else if (editingFactor === 'alimentation') newLog.foodQuality = editValue;

        setDailyLog(newLog);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const updates: any = {};
            if (editingFactor === 'sleep') updates.sleep_hours = syncValue;
            if (editingFactor === 'stress') updates.stress_level = syncValue;
            if (editingFactor === 'water') updates.water_glasses = newLog.waterGlasses;
            if (editingFactor === 'alcohol') updates.alcohol_drinks = syncValue;
            if (editingFactor === 'sport') updates.did_sport = syncValue;
            if (editingFactor === 'makeup') updates.makeup_removed = syncValue;
            if (editingFactor === 'alimentation') updates.food_quality = syncValue;
            if (editingFactor === 'location') updates.manual_location = syncValue;
            if (editingFactor === 'cycle') {
                updates.cycle_phase = typeof syncValue === 'string' ? syncValue : syncValue.phase;
                if (typeof syncValue === 'object' && syncValue.date) updates.last_period_date = syncValue.date;
                updates.cycle_duration = syncValue.cycleDuration ?? newLog.cycleDuration;
                updates.period_duration = syncValue.periodDuration ?? newLog.periodDuration;
            }
            await (supabase as any).from("profiles").update(updates).eq("id", session.user.id);
        }
        
        setEditingFactor(null);
  };

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
    <div className="min-h-screen pb-24 px-5 pt-10 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
        <p className="text-primary text-[11px] font-medium uppercase tracking-[0.2em] mb-3">Bonjour {userName ? userName : ""} ✨</p>
        <h1 className="text-3xl font-display text-foreground leading-tight">Votre peau aujourd'hui</h1>
      </motion.div>

      {/* Diagnostic CTA + Score combined panel */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
        className="premium-card p-8 mb-8 relative overflow-hidden">

        <div className="relative flex items-start gap-5">
          {/* Diagnostic photo + past days vertical */}
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <motion.div
              initial={hasTodayDiag ? { scale: 0.8, opacity: 0, rotateY: 90 } : { scale: 1, opacity: 1 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.3 }}
              className={`w-24 h-24 rounded-2xl border flex items-center justify-center overflow-hidden premium-shadow ${hasTodayDiag ? 'border-foreground/20' : 'border-border bg-background/50'}`}
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
                <div className="flex flex-col items-center gap-1.5 opacity-30">
                  <Camera size={24} strokeWidth={1.5} className="text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.05em]">Pas encore</span>
                </div>
              }
            </motion.div>
            {pastDays.length > 0 &&
              <div className="flex flex-col gap-1.5 w-full">
                {pastDays.map((day) =>
                  <button key={day.label}
                    className="flex items-center justify-between gap-2 border border-border/60 bg-background/30 rounded-lg px-2.5 py-1.5 transition-colors w-full group/day"
                    onClick={() => {/* TODO: show past diagnostic */ }}>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{day.label}</span>
                    <span className={`text-[11px] font-bold ${day.hasDiag ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      {day.score}
                    </span>
                  </button>
                )}
              </div>
            }
          </div>

          {/* Score + info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col items-center gap-4">
              <div className="flex-shrink-0 cursor-pointer transition-transform hover:scale-105" onClick={() => setScoreOpen(true)}>
                <SkinScoreRing score={currentScore} size={130} />
              </div>
              <div className="text-center space-y-3">
                <p className="text-sm text-foreground/80">Votre peau est <span className="font-semibold text-primary">{currentScore >= 70 ? "belle" : currentScore >= 50 ? "correcte" : "à surveiller"}</span></p>
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <Calendar size={11} strokeWidth={1.5} /><span>Dernier diag : {formatDiagDate()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => navigate("/diagnosis")}
          className="relative mt-10 w-full flex items-center justify-between bg-primary text-primary-foreground rounded-full px-8 py-5 hover:bg-primary/90 transition-all premium-shadow active:scale-[0.98]">
          <div className="flex items-center gap-4">
            <Stethoscope size={20} strokeWidth={1.5} />
            <div className="text-left">
              <p className="text-sm font-bold uppercase tracking-widest">Faire un diagnostic</p>
              <p className="text-[10px] opacity-70 font-medium tracking-wide uppercase">Analyse instantanée</p>
            </div>
          </div>
          <ChevronRight size={18} className="opacity-70" />
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
        className="space-y-4 mb-10">
        {(() => {
          const tips: { icon: React.ReactNode; text: string; priority: "high" | "medium" | "low"; ingredients?: string[] }[] = [];

          // Tips logic is fine as remains unchanged
          const hydration = skinMetrics.find(m => m.label === "Hydratation")!;
          const redness = skinMetrics.find(m => m.label === "Rougeurs")!;
          const glow = skinMetrics.find(m => m.label === "Éclat")!;
          const sebum = skinMetrics.find(m => m.label === "Sébum")!;
          const texture = skinMetrics.find(m => m.label === "Texture")!;

          if (hydration.value < 70) tips.push({ icon: <GlassWater size={16} strokeWidth={1.5} />, text: "Hydratation faible — pensez à boire davantage et appliquer un sérum hydratant.", priority: "high", ingredients: ["Acide hyaluronique", "Glycérine", "Céramides", "Aloe vera"] });
          if (redness.value > 35) tips.push({ icon: <ShieldAlert size={16} strokeWidth={1.5} />, text: "Rougeurs élevées — évitez les produits agressifs et privilégiez des soins apaisants.", priority: "high", ingredients: ["Niacinamide", "Centella asiatica", "Bisabolol", "Avoine colloïdale"] });
          if (glow.value < 60) tips.push({ icon: <Sparkles size={16} strokeWidth={1.5} />, text: "Éclat en berne — un sérum vitamine C le matin peut faire la différence.", priority: "medium", ingredients: ["Vitamine C (acide ascorbique)", "Alpha-arbutine", "Acide kojique"] });
          if (sebum.value > 60) tips.push({ icon: <CircleDot size={16} strokeWidth={1.5} />, text: "Excès de sébum — utilisez un nettoyant doux et évitez les crèmes trop riches.", priority: "medium", ingredients: ["Niacinamide", "Acide salicylique (BHA)", "Zinc", "Argile verte"] });
          if (texture.value < 65) tips.push({ icon: <Fingerprint size={16} strokeWidth={1.5} />, text: "Texture irrégulière — une exfoliation douce 2x/semaine peut aider.", priority: "medium", ingredients: ["Rétinol", "AHA (acide glycolique)", "PHA", "Bakuchiol"] });

          if (diagResult?.zones) {
            const alertZones = diagResult.zones.filter(z => z.status === "alert");
            const warningZones = diagResult.zones.filter(z => z.status === "warning");
            if (alertZones.length > 0) {
              tips.push({ icon: <Stethoscope size={16} strokeWidth={1.5} className="text-destructive" />, text: `Diagnostic : zone${alertZones.length > 1 ? "s" : ""} ${alertZones.map(z => z.label).join(", ")} en alerte — consultez un dermatologue si persistant.`, priority: "high", ingredients: ["Niacinamide 10%", "Centella asiatica", "Panthénol"] });
            }
            if (warningZones.length > 0) {
              tips.push({ icon: <Stethoscope size={16} strokeWidth={1.5} className="text-primary" />, text: `Zone${warningZones.length > 1 ? "s" : ""} ${warningZones.map(z => z.label).join(", ")} à surveiller — adaptez votre routine sur ces zones.`, priority: "medium", ingredients: ["Acide azélaïque", "Niacinamide", "Extrait de réglisse"] });
            }
          }

          if (dailyLog.weather.uv >= 6) tips.push({ icon: <Sun size={16} strokeWidth={1.5} />, text: `UV à ${dailyLog.weather.uv} — réappliquez votre SPF toutes les 2h, surtout en extérieur.`, priority: "high" });
          if (dailyLog.weather.humidity < 40) tips.push({ icon: <Droplets size={16} strokeWidth={1.5} />, text: "Air sec aujourd'hui — renforcez l'hydratation avec un brumisateur ou une crème riche.", priority: "medium", ingredients: ["Acide hyaluronique", "Squalane"] });
          if (dailyLog.sleepHours < 7) tips.push({ icon: <Moon size={16} strokeWidth={1.5} />, text: "Sommeil insuffisant — votre peau se régénère la nuit, essayez de dormir 7h+.", priority: "high", ingredients: ["Rétinol (soir)", "Peptides", "Bakuchiol"] });

          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const sorted = tips.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]).slice(0, 5);

          if (sorted.length === 0) {
            sorted.push({ icon: <Sparkles size={16} strokeWidth={1.5} className="text-primary" />, text: "Tout semble bien ! Continuez votre routine actuelle. 🎉", priority: "low" });
          }

          return sorted.map((tip, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
              onClick={() => setSelectedTip(tip)}
              className="flex flex-col gap-4 p-6 premium-card border-none group transition-all hover:bg-white/40 cursor-pointer active:scale-[0.98]">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex-shrink-0 text-primary transition-colors">{tip.icon}</span>
                <p className="text-sm text-foreground/80 leading-relaxed font-medium line-clamp-2">{tip.text}</p>
              </div>
            </motion.div>
          ));
        })()}
      </motion.div>

      {/* Détail du conseil */}
      <Dialog open={!!selectedTip} onOpenChange={() => setSelectedTip(null)}>
        <DialogContent className="max-w-sm rounded-[32px] border-none premium-shadow p-8">
          <DialogHeader className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              {selectedTip?.icon}
            </div>
            <DialogTitle className="text-xl font-display text-foreground leading-tight">Conseil personnalisé</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-foreground/80 leading-relaxed">{selectedTip?.text}</p>
            
            {selectedTip?.ingredients && selectedTip.ingredients.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ingrédients recommandés</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTip.ingredients.map(ing => (
                    <span key={ing} className="text-[10px] border border-primary/20 text-primary px-3 py-1.5 rounded-full font-medium bg-primary/5 italic">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={() => setSelectedTip(null)}
              className="w-full py-4 bg-primary text-primary-foreground rounded-full text-xs font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all mt-4"
            >
              Compris
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analyses environnantes (formerly Paramètres du jour) */}
      <h2 className="text-lg font-display text-foreground mb-10 text-center">Analyses environnantes</h2>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="premium-card p-10 mb-8">
        <button onClick={() => { setEditingFactor('location'); setEditValue(dailyLog.location || "Paris"); setLocationInput(dailyLog.location || "Paris"); }} className="text-left w-full group mb-10 pb-10 border-b border-border/40">
            <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full border border-border/60 bg-muted/20 flex items-center justify-center text-primary group-hover:bg-white transition-all"><MapPin size={22} strokeWidth={1.5} /></div>
                <div className="flex-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Position actuelle</p>
                    <div className="flex items-center gap-2">
                        <p className="text-xl font-bold text-foreground">{dailyLog.location || "Paris"}</p>
                        <Pencil size={12} strokeWidth={1.5} className="text-muted-foreground/30" />
                    </div>
                </div>
                <span className="ml-auto flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest"><span className="w-2 h-2 bg-primary rounded-full animate-pulse" />Live</span>
            </div>
        </button>
        <div className="grid grid-cols-2 gap-x-12 gap-y-10 px-4">
            {[
                { id: "temp", icon: <Thermometer size={16} />, val: `${dailyLog.weather?.temp ?? 20}°C`, sub: "Température" },
                { id: "humidity", icon: <Droplets size={16} />, val: `${dailyLog.weather?.humidity ?? 50}%`, sub: "Humidité" },
                { id: "uv", icon: <Sun size={16} />, val: dailyLog.weather?.uv ?? 0, sub: "Index UV" },
                { id: "air", icon: <CloudSun size={16} />, val: dailyLog.weather?.pollution ?? "Bon", sub: "Qualité Air" }
            ].map((item) => (
                <div key={item.id} className="flex flex-col items-center text-center gap-3">
                    <div className="text-muted-foreground opacity-40">{item.icon}</div>
                    <div className="space-y-1.5">
                        <p className="text-sm font-bold text-foreground">{item.val}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">{item.sub}</p>
                    </div>
                </div>
            ))}
        </div>
      </motion.div>

      {/* Suivi Biologique */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="mb-10">
        <div className="flex flex-col items-center mb-10">
            <h2 className="text-lg font-display text-foreground mb-4">Suivi biologique</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('cycle'); setEditValue(dailyLog.cyclePhase || "Aucun"); }}>
                <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Calendar size={18} strokeWidth={1.5} /></div><Pencil size={10} strokeWidth={1.5} className="text-muted-foreground/30 group-hover:text-primary transition-colors" /></div>
                <div><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Cycle</p><p className="text-sm font-bold text-foreground">{dailyLog.cyclePhase || "N/A"}</p></div>
            </div>
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('stress'); setEditValue(dailyLog.stressLevel ?? 3); }}>
                <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Heart size={18} strokeWidth={1.5} /></div><Pencil size={10} strokeWidth={1.5} className="text-muted-foreground/30 group-hover:text-primary transition-colors" /></div>
                <div><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Stress</p><p className="text-sm font-bold text-foreground">{dailyLog.stressLevel !== undefined ? `${dailyLog.stressLevel}/5` : "N/A"}</p></div>
            </div>
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('makeup'); setEditValue(dailyLog.makeupRemoved ?? false); setMakeupStep(1); }}>
                <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Sparkles size={18} strokeWidth={1.5} /></div><Pencil size={10} strokeWidth={1.5} className="text-muted-foreground/30 group-hover:text-primary transition-colors" /></div>
                <div><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Peau</p><p className="text-sm font-bold text-foreground">{dailyLog.makeupRemoved !== undefined ? (dailyLog.makeupRemoved ? "Nette" : "Maquillée") : "N/A"}</p></div>
            </div>
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('alcohol'); setEditValue(dailyLog.alcoholDrinks ?? 0); }}>
                <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Wine size={18} strokeWidth={1.5} /></div><Pencil size={10} strokeWidth={1.5} className="text-muted-foreground/30 group-hover:text-primary transition-colors" /></div>
                <div><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Alcool</p><p className="text-sm font-bold text-foreground">{dailyLog.alcoholDrinks > 0 ? `${dailyLog.alcoholDrinks} u.` : "Aucun"}</p></div>
            </div>
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('sleep'); setEditValue(dailyLog.sleepHours ?? 8); }}>
                <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Moon size={18} strokeWidth={1.5} /></div><Pencil size={10} strokeWidth={1.5} className="text-muted-foreground/30 group-hover:text-primary transition-colors" /></div>
                <div><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Sommeil</p><p className="text-sm font-bold text-foreground">{dailyLog.sleepHours ? `${dailyLog.sleepHours}h` : "N/A"}</p></div>
            </div>
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('sport'); setEditValue(dailyLog.didSport || "Non"); }}>
                <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Dumbbell size={18} strokeWidth={1.5} /></div><Pencil size={10} strokeWidth={1.5} className="text-muted-foreground/30 group-hover:text-primary transition-colors" /></div>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Activité</p>
                  <p className="text-sm font-bold text-foreground">{dailyLog.didSport || "Non"}</p>
                  {dailyLog.stravaData && dailyLog.didSport !== "Non" && (
                    <div className="flex items-center gap-1.5 mt-2 text-[8px] font-mono font-bold text-[#FC4C02] uppercase tracking-[0.05em]">
                        <span className="w-1.5 h-1.5 bg-[#FC4C02] rounded-full animate-pulse" />
                        Synchro : {dailyLog.stravaData.sport}
                    </div>
                  )}
                </div>
            </div>
        </div>
      </motion.div>


      {/* Dialogue facteur */}
      <Dialog open={!!factorOpen} onOpenChange={() => setFactorOpen(null)}>
        <DialogContent className="max-w-sm rounded-3xl border border-border/40 bg-background premium-shadow">
          <DialogHeader>
            <DialogTitle className="text-xl font-display text-foreground">{factorOpen ? factorDetails[factorOpen]?.title : ""}</DialogTitle>
            <DialogDescription className="text-sm text-foreground/70 leading-relaxed mt-2">{factorOpen ? factorDetails[factorOpen]?.desc : ""}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Dialogue édition facteur manuel */}
      <Dialog open={!!editingFactor} onOpenChange={() => setEditingFactor(null)}>
        <DialogContent className="max-w-sm rounded-[40px] border border-border/40 bg-background premium-shadow">
            <DialogHeader>
                <DialogTitle className="text-xl font-display text-foreground">{editingFactor?.toUpperCase()}</DialogTitle>
            </DialogHeader>
            <div className="py-6">
                {editingFactor === 'location' && (<div className="space-y-4"><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ville :</label><Input value={locationInput} onChange={(e) => setLocationInput(e.target.value)} placeholder="Ex: Paris" className="flex-1 rounded-full" /></div>)}
                {editingFactor === 'sleep' && (<div className="space-y-6"><div className="flex justify-between items-end mb-4"><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Durée</label><span className="text-4xl font-display text-foreground">{editValue}h</span></div><div className="px-1"><Slider value={[editValue || 8]} min={0} max={15} step={0.5} onValueChange={(v) => setEditValue(v[0])} /></div></div>)}
                {editingFactor === 'stress' && (<div className="space-y-8"><div className="flex flex-col items-center gap-2 py-4"><span className="text-5xl font-display text-primary">{editValue}</span><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 italic">{STRESS_LABELS[editValue] || ""}</span></div><div className="flex justify-between gap-1">{[1, 2, 3, 4, 5].map(v => (<button key={v} onClick={() => setEditValue(v)} className={`w-12 h-12 rounded-full border text-sm font-bold transition-all ${editValue === v ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-background border-border text-muted-foreground'}`}>{v}</button>))}</div></div>)}
                {editingFactor === 'cycle' && (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block px-1">
                                    Date des dernières règles
                                </label>
                                <Input 
                                    type="date" 
                                    value={dailyLog.lastPeriodDate || ""} 
                                    onChange={(e) => {
                                        const date = e.target.value;
                                        const calc = calculateCyclePhase(date, dailyLog.cycleDuration, dailyLog.periodDuration);
                                        setDailyLog(prev => ({ 
                                            ...prev, 
                                            lastPeriodDate: date,
                                            cyclePhase: calc.phase
                                        }));
                                        setEditValue({ phase: calc.phase, cycleDuration: dailyLog.cycleDuration, periodDuration: dailyLog.periodDuration, date: date });
                                    }}
                                    className="rounded-2xl h-14 bg-muted/10 border-transparent focus:border-primary/20 transition-all font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Cycle</label>
                                        <span className="text-[11px] font-bold text-primary">{dailyLog.cycleDuration}j</span>
                                    </div>
                                    <Slider 
                                        value={[dailyLog.cycleDuration || 28]} 
                                        min={20} 
                                        max={40} 
                                        step={1} 
                                        onValueChange={(v) => {
                                            const dur = v[0];
                                            const calc = calculateCyclePhase(dailyLog.lastPeriodDate, dur, dailyLog.periodDuration);
                                            setDailyLog(prev => ({ ...prev, cycleDuration: dur, cyclePhase: calc.phase }));
                                            setEditValue({ phase: calc.phase, cycleDuration: dur, periodDuration: dailyLog.periodDuration });
                                        }} 
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Règles</label>
                                        <span className="text-[11px] font-bold text-primary">{dailyLog.periodDuration}j</span>
                                    </div>
                                    <Slider 
                                        value={[dailyLog.periodDuration || 5]} 
                                        min={2} 
                                        max={10} 
                                        step={1} 
                                        onValueChange={(v) => {
                                            const dur = v[0];
                                            const calc = calculateCyclePhase(dailyLog.lastPeriodDate, dailyLog.cycleDuration, dur);
                                            setDailyLog(prev => ({ ...prev, periodDuration: dur, cyclePhase: calc.phase }));
                                            setEditValue({ phase: calc.phase, cycleDuration: dailyLog.cycleDuration, periodDuration: dur });
                                        }} 
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {["Je ne sais pas", "Aucun"].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            setDailyLog(prev => ({ 
                                                ...prev, 
                                                lastPeriodDate: "",
                                                cyclePhase: opt
                                            }));
                                            setEditValue(opt);
                                        }}
                                        className={`flex-1 py-3 h-12 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${dailyLog.cyclePhase === opt ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="premium-card p-6 bg-primary/5 border-primary/10">
                            {(() => {
                                const calc = calculateCyclePhase(dailyLog.lastPeriodDate, dailyLog.cycleDuration, dailyLog.periodDuration);
                                if (calc.message) {
                                    return <p className="text-[11px] font-bold text-primary/60 uppercase tracking-widest text-center italic">{calc.message}</p>;
                                }
                                return (
                                    <div className="text-center space-y-2">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Phase Actuelle</p>
                                        <p className="text-2xl font-display text-primary">{calc.phase}</p>
                                        <p className="text-[11px] font-bold text-primary/40 uppercase tracking-widest italic">Jour {calc.day} sur {dailyLog.cycleDuration}</p>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
                {editingFactor === 'alcohol' && (<div className="space-y-8"><div className="grid grid-cols-2 gap-4"><button onClick={() => setEditValue(editValue > 0 ? editValue : 1)} className={`py-4 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${editValue > 0 ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}>Oui</button><button onClick={() => setEditValue(0)} className={`py-4 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${editValue === 0 ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}>Non</button></div>{editValue > 0 && (<div className="space-y-6"><div className="flex justify-between items-end"><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60">Quantité</label><span className="text-3xl font-display text-foreground">{editValue}</span></div><div className="px-1"><Slider value={[editValue]} min={1} max={10} step={1} onValueChange={(v) => setEditValue(v[0])} /></div></div>)}</div>)}
                {editingFactor === 'sport' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            {workoutIntensities.map((i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setEditValue(i)} 
                                    className={`py-4 border rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${editValue === i ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                        <div className="pt-4 border-t border-border/40 space-y-4">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 text-center">Optimiser avec Strava</p>
                            {dailyLog.stravaData && !isStravaLoading && (
                                <p className="text-[10px] font-bold text-[#FC4C02] uppercase tracking-widest mb-3 text-center">
                                    Dernière activité : {dailyLog.stravaData.sport} ({dailyLog.stravaData.duration} min)
                                </p>
                            )}
                            <div className="flex justify-center">
                                <StravaConnect compact />
                            </div>
                            {isStravaLoading && (
                                <p className="text-[10px] font-bold text-muted-foreground animate-pulse uppercase tracking-widest mt-2 text-center">
                                    Synchronisation...
                                </p>
                            )}
                        </div>
                    </div>
                )}
                {editingFactor === 'makeup' && (<div className="space-y-6">{makeupStep === 1 ? (<div className="space-y-8"><p className="text-sm font-medium text-foreground tracking-tight italic text-center">Étiez-vous maquillé(e) ?</p><div className="grid grid-cols-2 gap-4"><button onClick={() => setMakeupStep(2)} className="py-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all bg-muted/10 border-transparent text-foreground/60">Oui</button><button onClick={() => { setEditValue(true); saveEdit(); }} className="py-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all bg-muted/10 border-transparent text-foreground/60">Non</button></div></div>) : (<div className="space-y-8"><p className="text-sm font-medium text-foreground tracking-tight italic text-center">Nettoyé ce soir ?</p><div className="flex flex-col gap-3"><button onClick={() => setEditValue(true)} className={`py-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${editValue === true ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}>Oui, complet</button><button onClick={() => setEditValue(false)} className={`py-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${editValue === false ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}>Non</button></div><button onClick={() => setMakeupStep(1)} className="w-full text-[9px] font-bold text-muted-foreground uppercase text-center mt-4">Retour</button></div>)}</div>)}
            </div>
            <button onClick={saveEdit} className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow">Enregistrer</button>
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
        className="premium-card p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-foreground/80 tracking-wide">Routine en cours</p>
            <button onClick={() => {
              setTempAmProducts(baseAmProducts);
              setTempPmProducts(basePmProducts);
              setRoutineSetupOpen(true);
            }} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors">
              <Pencil size={12} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex bg-muted/40 rounded-full p-1 border border-border/20">
            <button onClick={() => { setProductTime("am"); setProductsSaved(false); }}
              className={`px-5 py-1.5 rounded-full text-[10px] font-bold transition-all ${productTime === "am" ? 'bg-primary text-primary-foreground premium-shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              Matin
            </button>
            <button onClick={() => { setProductTime("pm"); setProductsSaved(false); }}
              className={`px-5 py-1.5 rounded-full text-[10px] font-bold transition-all ${productTime === "pm" ? 'bg-primary text-primary-foreground premium-shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              Soir
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 mb-6">
          {currentProducts.map((p) =>
            <button key={p} onClick={() => toggleProduct(p)}
              className={`px-4 py-2 rounded-full text-[11px] font-semibold transition-all border ${selected.includes(p) ? 'bg-primary border-primary text-primary-foreground premium-shadow' : 'bg-background/40 border-border text-muted-foreground hover:border-primary/40'}`
              }>
              {selected.includes(p) && <Check size={10} strokeWidth={2.5} className="inline mr-1.5" />}{p}
            </button>
          )}
        </div>
        <button onClick={saveProducts}
          className={`w-full py-4 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${productsSaved ? 'bg-accent/10 text-accent-foreground border border-accent/20' : 'bg-primary text-primary-foreground premium-shadow hover:opacity-90'}`
          }>
          {productsSaved ? "Routine enregistrée ✓" : "Valider mes soins"}
        </button>

        {/* Feedback popup */}
        <AnimatePresence>
          {productFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className={`mt-6 rounded-2xl p-5 border ${productFeedback.positive
                ? "bg-primary/5 border-primary/20"
                : "bg-destructive/5 border-destructive/20"
                }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {productFeedback.positive
                  ? <ThumbsUp size={16} strokeWidth={1.5} className="text-primary" />
                  : <ShieldAlert size={16} strokeWidth={1.5} className="text-destructive" />
                }
                <p className={`text-sm font-semibold ${productFeedback.positive ? "text-primary" : "text-destructive"}`}>
                  {productFeedback.message}
                </p>
              </div>
              {productFeedback.tips.map((tip, i) => (
                <div key={i} className="ml-7 mb-3 last:mb-0">
                  <p className="text-xs text-foreground/70 leading-relaxed">• {tip.text}</p>
                  {tip.source && (
                    <p className="text-[9px] text-muted-foreground/40 italic mt-1 font-medium">— {tip.source}</p>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Métriques peau */}
      <h2 className="text-lg font-display text-foreground mb-8 text-center mt-12">Analyse de surface</h2>
      <div className="grid grid-cols-2 gap-4">
        {skinMetrics.map((metric, i) =>
          <motion.div key={metric.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
            <MetricCard {...metric} trendTone={trendToneForMetric(metric.label, metric.trend)} />
          </motion.div>
        )}
      </div>
    </div>);

};

export default Dashboard;