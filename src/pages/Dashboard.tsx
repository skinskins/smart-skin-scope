import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Sun, Flame, Fingerprint, CircleDot, Calendar, CloudSun, Heart, Moon, Wine, Dumbbell, FlaskConical, Thermometer, Bluetooth, BluetoothOff, Check, Stethoscope, ChevronRight, MapPin, Camera, Pencil, Lightbulb, ShieldAlert, Sparkles, GlassWater, FlaskRound, ThumbsUp, X, User, Activity, TrendingUp, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import faceScan from "@/assets/face-scan.png";
import MetricCard from "@/components/MetricCard";
import SkinScoreRing from "@/components/SkinScoreRing";
import { useState, useEffect, useCallback, useRef } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useDiagnosisResult } from "@/hooks/useDiagnosisStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import DailyCheckinModal from "@/components/DailyCheckinModal";
import AdviceStack from "@/components/AdviceStack";
import { calculateCyclePhase } from "@/utils/cycle";
import { getActiveAdvice, Context, SKIN_TYPE_MAP, AdviceItem } from "@/utils/advice";
import axios from "axios";
import { classifyStravaIntensity } from "@/data/stravaIntensity";
import StravaConnect from "./StravaConnect";
import { useMemo } from "react";


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
  cyclePhase: "" as string,
  heartRate: 72,
  stressLevel: null as number | null,
  waterGlasses: null as number | null,
  sleepHours: null as number | null,
  alcoholDrinks: null as number | null,
  cycleDuration: 28,
  periodDuration: 5,
  makeupRemoved: null as boolean | null,
  didSport: null as string | null,
  stravaData: null as any,
  foodQuality: "" as string,
  symptoms: {} as Record<string, string>,
  symptomZones: {} as Record<string, string | null>,
  checkinDate: "" as string
};

const SYMPTOMS_CONFIG = [
  { id: "acné", label: "Acné", icon: <CircleDot size={16} strokeWidth={1.5} />, problem: "Acné" },
  { id: "rougeurs", label: "Rougeurs", icon: <Flame size={16} strokeWidth={1.5} />, problem: "Rougeurs" },
  { id: "sécheresse", label: "Sécheresse", icon: <Droplets size={16} strokeWidth={1.5} />, problem: "Déshydratation" },
  { id: "taches", label: "Taches", icon: <Sun size={16} strokeWidth={1.5} />, problem: "Taches" },
  { id: "points_noirs", label: "Points noirs", icon: <Fingerprint size={16} strokeWidth={1.5} />, problem: "Points noirs" },
  { id: "rides", label: "Rides", icon: <Activity size={16} strokeWidth={1.5} />, problem: "Rides" },
  { id: "cernes", label: "Cernes", icon: <Moon size={16} strokeWidth={1.5} />, problem: "Cernes" },
  { id: "eczéma", label: "Eczéma", icon: <Waves size={16} strokeWidth={1.5} />, problem: "Eczéma" },
];


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
  const [userConcerns, setUserConcerns] = useState<string[]>([]);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [isFetchingCheckin, setIsFetchingCheckin] = useState(true);

  const [dailyLog, setDailyLog] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem("dailyCheckinData");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.checkinDate === today) {
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing saved dailyCheckinData", e);
      }
    }
    return { ...defaultDailyLog, checkinDate: today };
  });

  const today = new Date().toISOString().split('T')[0];
  const relevantSymptoms = SYMPTOMS_CONFIG.filter(s => userConcerns.length === 0 || userConcerns.includes(s.problem));
  const isComplete = 
    relevantSymptoms.every(s => dailyLog.symptoms?.[s.id] !== undefined) &&
    dailyLog.cyclePhase !== "" &&
    dailyLog.cyclePhase !== null;

  const hasCheckedInToday = isComplete;

  useEffect(() => {
    const hasDismissed = sessionStorage.getItem("dailyCheckinDismissed");
    const isFirstTime = !localStorage.getItem("hasSeenFirstLogin");
    
    if (!isComplete && !hasDismissed && !isFirstTime && !isFetchingCheckin) {
      // Small delay to let the page load
      const timer = setTimeout(() => setShowCheckinModal(true), 1500);
      return () => clearTimeout(timer);
    }

    // If it is the first time, mark it so the next time the modal can show
    if (isFirstTime) {
      localStorage.setItem("hasSeenFirstLogin", "true");
    }
  }, [isComplete, isFetchingCheckin]);

  useEffect(() => {
    if (!hasCheckedInToday && !isFetchingCheckin) {
      setTimeout(() => {
        document.getElementById('suivi-bio')?.scrollIntoView({ behavior: 'smooth' });
      }, 800);
    }
  }, [isFetchingCheckin]);

  const [manualLocation, setManualLocationState] = useState<string | null>(() => localStorage.getItem("manualLocation"));

  const setManualLocation = (loc: string | null) => {
    setManualLocationState(loc);
    if (loc) localStorage.setItem("manualLocation", loc);
    else localStorage.removeItem("manualLocation");
  };
  const { weather: liveWeather, loading: weatherLoading } = useWeatherData(manualLocation || undefined);
  const diagResult = useDiagnosisResult();
  const [deviceConnected] = useState(false);
  const [factorOpen, setFactorOpen] = useState<string | null>(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<string | null>(null);
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(null);
  const [skinType, setSkinType] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSkinType, setEditSkinType] = useState("");
  const [selectedTip, setSelectedTip] = useState<AdviceItem | null>(null);
  const bioTrackingRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<any>(null); 

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

  // Consolidated data fetch
  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsFetchingCheckin(false);
        return;
      }

      if (session.user.user_metadata?.first_name) {
        setUserName(session.user.user_metadata.first_name);
      }

      const today = new Date().toISOString().split("T")[0];

      try {
        // Parallel fetch for better performance
        const [profileRes, checkinRes, symptomsRes] = await Promise.all([
          (supabase as any).from('profiles').select('*').eq('id', session.user.id).single(),
          (supabase as any).from("daily_checkins").select("*").eq("user_id", session.user.id).eq("date", today).maybeSingle(),
          (supabase as any).from("symptom_tracking").select("symptom, zone, trend").eq("user_id", session.user.id).eq("date", today)
        ]);

        let mergedLog = { ...dailyLog };

        // 1. Process Profile (Long-term data)
        if (profileRes.data) {
          const profile = profileRes.data;
          setSkinType(profile.skin_type || null);
          if (profile.skin_problems) setUserConcerns(profile.skin_problems);
          
          mergedLog = {
            ...mergedLog,
            location: profile.manual_location || mergedLog.location,
            cycleDuration: profile.cycle_duration || mergedLog.cycleDuration,
            periodDuration: profile.period_duration || mergedLog.periodDuration,
            lastPeriodDate: profile.last_period_date || mergedLog.lastPeriodDate,
          };
          if (profile.manual_location) setManualLocationState(profile.manual_location);
        }

        // 2. Process Daily Check-in
        if (checkinRes.data) {
          const checkin = checkinRes.data;
          mergedLog = {
            ...mergedLog,
            sleepHours: checkin.sleep_hours ?? mergedLog.sleepHours,
            waterGlasses: checkin.water_glasses ?? mergedLog.waterGlasses,
            alcoholDrinks: checkin.alcohol_drinks ?? mergedLog.alcoholDrinks,
            stressLevel: checkin.stress_level ?? mergedLog.stressLevel,
            foodQuality: checkin.food_quality ?? mergedLog.foodQuality,
            didSport: checkin.sport_intensity ?? (checkin.did_sport ? "Modéré" : "Non"),
            makeupRemoved: checkin.makeup_removed ?? mergedLog.makeupRemoved,
            cyclePhase: checkin.cycle_phase ?? mergedLog.cyclePhase,
            checkinDate: today
          };
        }

        // 3. Process Symptoms
        if (symptomsRes.data) {
          const zonesMap: Record<string, string> = {};
          const trendsMap: Record<string, string> = {};
          symptomsRes.data.forEach((z: any) => {
            if (z.zone) zonesMap[z.symptom] = z.zone;
            if (z.trend) trendsMap[z.symptom] = z.trend;
          });
          mergedLog = {
            ...mergedLog,
            symptomZones: zonesMap,
            symptoms: { ...(mergedLog.symptoms || {}), ...trendsMap }
          };
        }

        setDailyLog(mergedLog);
        localStorage.setItem("dailyCheckinData", JSON.stringify(mergedLog));

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setIsFetchingCheckin(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Fetch yesterday's routine logs for G8 triggers (separate as it's for logic, not main UI state)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        (supabase as any).from("routine_logs")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("date", yesterdayStr)
          .maybeSingle()
          .then(({ data }: any) => {
            if (data) setYesterdayLog(data);
          });
      }
    });
  }, []);

  const [yesterdayLog, setYesterdayLog] = useState<any>(null);

  useEffect(() => {
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
    return { stress: defaultTime, sleep: defaultTime, cycle: defaultTime, water: defaultTime, alcohol: defaultTime, sport: defaultTime };
  });



  const [editValue, setEditValue] = useState<any>(null);
  const [locationInput, setLocationInput] = useState("");
  const [makeupStep, setMakeupStep] = useState(1);
  const [wearingMakeup, setWearingMakeup] = useState<boolean | null>(null);
  const [woreMakeup, setWoreMakeup] = useState<boolean | null>(null);

  const saveEdit = async () => {
    if (!editingFactor) return;
    let newLog = { ...dailyLog };
    let syncValue = editValue;

    if (editingFactor === 'location') { syncValue = locationInput; newLog.location = locationInput; setManualLocation(locationInput); }
    else if (editingFactor === 'sleep') newLog.sleepHours = editValue;
    else if (editingFactor === 'stress') newLog.stressLevel = editValue;
    else if (editingFactor === 'water') newLog.waterGlasses = editValue;
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
    localStorage.setItem("dailyCheckinData", JSON.stringify(newLog));
    markUpdated(editingFactor);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const today = new Date().toISOString().split("T")[0];
      
      // Update profile only for relevant long-term fields
      const profileUpdates: any = {};
      if (editingFactor === 'location') profileUpdates.manual_location = newLog.location;
      if (editingFactor === 'cycle') {
        profileUpdates.cycle_phase = newLog.cyclePhase;
        profileUpdates.last_period_date = newLog.lastPeriodDate;
        profileUpdates.cycle_duration = newLog.cycleDuration;
        profileUpdates.period_duration = newLog.periodDuration;
      }
      
      if (Object.keys(profileUpdates).length > 0) {
        // @ts-ignore
        await (supabase as any).from("profiles").update(profileUpdates).eq("id", session.user.id);
      }

      // Selective update for daily check-ins to prevent overwriting other fields
      const checkinUpdates: any = {
        user_id: session.user.id,
        date: today
      };

      if (editingFactor === 'sleep') checkinUpdates.sleep_hours = newLog.sleepHours;
      if (editingFactor === 'stress') checkinUpdates.stress_level = newLog.stressLevel;
      if (editingFactor === 'water') checkinUpdates.water_glasses = newLog.waterGlasses;
      if (editingFactor === 'alcohol') checkinUpdates.alcohol_drinks = newLog.alcoholDrinks;
      if (editingFactor === 'alimentation') checkinUpdates.food_quality = newLog.foodQuality;
      if (editingFactor === 'makeup') checkinUpdates.makeup_removed = newLog.makeupRemoved;
      if (editingFactor === 'sport') {
        checkinUpdates.did_sport = newLog.didSport !== "Non";
        checkinUpdates.sport_intensity = newLog.didSport;
      }
      if (editingFactor === 'cycle') checkinUpdates.cycle_phase = newLog.cyclePhase;

      // Use upsert but only with the fields we want to change
      // Note: In Supabase, if you provide only some columns in upsert, 
      // you must be careful about defaults. However, we already fetched everything.
      // To be ultra safe, we use upsert with ONLY what's needed.
      await (supabase as any).from("daily_checkins").upsert(checkinUpdates, { onConflict: "user_id,date" });
    }

    setEditingFactor(null);
  };

  const cycleTrend = (symptomId: string) => {
    const nextMap: Record<string, string> = {
      pareil: "plus",
      plus: "moins",
      moins: "pareil"
    };

    setDailyLog(prev => {
      const current = prev.symptoms?.[symptomId] || "pareil";
      const next = nextMap[current];
      const updatedSymptoms = {
        ...(prev.symptoms || {}),
        [symptomId]: next
      };

      const newLog = {
        ...prev,
        symptoms: updatedSymptoms
      };

      localStorage.setItem("dailyCheckinData", JSON.stringify(newLog));
      markUpdated('symptoms');

      // Async background sync
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          const today = new Date().toISOString().split("T")[0];
          (supabase as any).from("symptom_tracking").upsert({
            user_id: session.user.id,
            date: today,
            symptom: symptomId,
            trend: next,
            zone: null
          }, { onConflict: "user_id,date,symptom" });
        }
      });

      return newLog;
    });
  };

  const markUpdated = useCallback((factorId: string) => {
    setManualUpdates(prev => ({ ...prev, [factorId]: Date.now() }));
    const today = new Date().toISOString().split('T')[0];
    setDailyLog(prev => {
        const updated = { ...prev, checkinDate: today };
        localStorage.setItem("dailyCheckinData", JSON.stringify(updated));
        localStorage.setItem("lastCheckinDate", today);
        return updated;
    });
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







  const openEditDialog = (id: string) => {
    setEditValues({ 
      heartRate: dailyLog.heartRate ?? 72, 
      stressLevel: dailyLog.stressLevel ?? 3, 
      sleepHours: dailyLog.sleepHours ?? 7.5, 
      location: manualLocation || dailyLog.location || "Paris" 
    });
    setEditingFactor(id);
  };

  const saveProfile = async () => {
    if (!editName && !editSkinType) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const updates: any = {};
        if (editName) updates.first_name = editName;
        if (editSkinType) updates.skin_type = editSkinType;

        await (supabase as any).from("profiles").update(updates).eq("id", session.user.id);

        if (editName) {
          await supabase.auth.updateUser({ data: { first_name: editName } });
          setUserName(editName);
        }
        if (editSkinType) setSkinType(editSkinType);
      }
    } catch (error) {
      console.error(error);
    }
    setProfileOpen(false);
  };


  const ManualLabel = ({ id }: { id: string }) => {
    if (deviceConnected) return null;
    return (
      <p className="text-[11px] text-muted-foreground">
        Manuel · <span className="text-primary/70">{formatUpdatedAgo(manualUpdates[id] ?? Date.now())}</span>
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



      {/* Conseils personnalisés */}
      <h2 className="text-xl font-display font-bold text-[#111111] mb-6 uppercase tracking-[0.05em]">
        Conseils du jour
      </h2>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="space-y-4 mb-10">
        {(() => {
          const skinTypeKey = SKIN_TYPE_MAP[skinType || ""] ?? "normal";

          const ctx: Context = {
            skinType: skinTypeKey,
            uvIndex: Math.floor(dailyLog.weather?.uv ?? 0),
            tempC: dailyLog.weather?.temp ?? 20,
            humidity: dailyLog.weather?.humidity ?? 50,
            aqi: dailyLog.weather?.aqiScore ?? 25,
            sleepHours: dailyLog.sleepHours ?? 0,
            stressLevel: dailyLog.stressLevel !== null ? dailyLog.stressLevel * 2 : 0,
            alcoholLastNight: dailyLog.alcoholDrinks ?? 0,
            removedMakeupLastNight: dailyLog.makeupRemoved ?? false,
            didSportToday: dailyLog.didSport !== "" && dailyLog.didSport !== "Non",
            cycleDay: dailyLog.lastPeriodDate ? calculateCyclePhase(dailyLog.lastPeriodDate, dailyLog.cycleDuration, dailyLog.periodDuration).day : null,
            cyclePhase: dailyLog.lastPeriodDate ? calculateCyclePhase(dailyLog.lastPeriodDate, dailyLog.cycleDuration, dailyLog.periodDuration).phase : "",
            symptoms: dailyLog.symptoms,
            symptomZones: dailyLog.symptomZones,
            morningRoutineDone: yesterdayLog?.morning_routine_done ?? false,
            eveningRoutineDone: yesterdayLog?.evening_routine_done ?? false,
            makeupRemoved: yesterdayLog?.makeup_removed ?? false,
            spfApplied: yesterdayLog?.spf_applied ?? false
          };


          const adviceList = getActiveAdvice(ctx);

          // Integrate Diagnostic alerts if they exist
          if (diagResult?.zones) {
            const alertZones = diagResult.zones.filter(z => z.status === "alert");
            const warningZones = diagResult.zones.filter(z => z.status === "warning");

            if (alertZones.length > 0) {
              adviceList.unshift({
                iconStr: "🩺",
                title: "Alerte Diagnostic",
                text: `Zone${alertZones.length > 1 ? "s" : ""} ${alertZones.map(z => z.label).join(", ")} en alerte — consultez un dermatologue si persistant.`,
                tip: "Utilisez des soins apaisants et évitez les actifs irritants sur ces zones.",
                group: "g3",
                priority: "high",
                ingredients: ["Niacinamide 10%", "Centella asiatica", "Panthénol"]
              });
            } else if (warningZones.length > 0) {
              adviceList.push({
                iconStr: "🩺",
                title: "Zones à surveiller",
                text: `Zone${warningZones.length > 1 ? "s" : ""} ${warningZones.map(z => z.label).join(", ")} à surveiller — adaptez votre routine sur ces zones.`,
                tip: "Privilégiez des soins ciblés pour stabiliser ces zones.",
                group: "g1",
                priority: "medium",
                ingredients: ["Acide azélaïque", "Niacinamide", "Extrait de réglisse"]
              });
            }
          }

          if (!hasCheckedInToday) {
            return (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-6 p-10 premium-card border-none bg-white/60">
                <div className="flex items-start gap-6">
                  <span className="mt-1 flex-shrink-0 text-primary animate-pulse"><Stethoscope size={24} strokeWidth={1.5} /></span>
                  <div className="flex-1">
                    <p className="text-base font-display text-foreground italic mb-2">Check-in requis</p>
                    <p className="text-[13px] text-foreground/60 leading-relaxed italic mb-6">Veuillez compléter votre suivi biologique pour recevoir vos conseils personnalisés du jour.</p>
                    <button
                      onClick={() => setShowCheckinModal(true)}
                      className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] border-b border-primary/20 pb-1 hover:border-primary transition-all"
                    >
                      Démarrer le check-in quotidien →
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          }

          if (adviceList.length === 0) {
            return (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-4 p-6 premium-card border-none bg-white/40">
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex-shrink-0 text-primary transition-colors"><Sparkles size={16} strokeWidth={1.5} /></span>
                  <p className="text-sm text-foreground/80 leading-relaxed font-medium">Tout semble bien ! Continuez votre routine actuelle. 🎉</p>
                </div>
              </motion.div>
            );
          }

          return (
            <AdviceStack 
              adviceList={adviceList} 
              onSelectAdvice={(advice) => setSelectedTip(advice)} 
            />
          );
        })()}
      </motion.div>

      {/* Détail du conseil */}


      <Dialog open={!!selectedTip} onOpenChange={() => setSelectedTip(null)}>
        <DialogContent className="max-w-sm rounded-[32px] border-none premium-shadow p-8">
          <DialogHeader className="mb-8">
            <div className="text-5xl mb-6">{selectedTip?.iconStr}</div>
            <DialogTitle className="text-2xl font-display text-foreground italic">{selectedTip?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-8">
            <p className="text-sm text-foreground/80 leading-relaxed italic">{selectedTip?.text}</p>

            {selectedTip?.ingredients && selectedTip.ingredients.length > 0 && (
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Ingrédients cibles</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTip.ingredients.map(ing => (
                    <span key={ing} className="px-4 py-2 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full border border-primary/10 italic">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedTip?.tip && (
              <div className="flex gap-4 p-6 bg-primary/5 rounded-[32px] border border-primary/10">
                <div className="bg-white rounded-full p-2 text-primary shadow-sm h-fit"><Lightbulb size={14} strokeWidth={2.5} /></div>
                <p className="text-[12px] font-bold text-primary/80">{selectedTip.tip}</p>
              </div>
            )}

            <button
              onClick={() => setSelectedTip(null)}
              className="w-full h-16 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all mt-6"
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
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Position actuelle</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-foreground">{dailyLog.location || "Paris"}</p>
                <Pencil size={14} strokeWidth={1.5} className="text-muted-foreground/50" />
              </div>
            </div>
            <span className="ml-auto flex items-center gap-2 text-[11px] font-bold text-primary uppercase tracking-widest"><span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />Actuellement</span>
          </div>
        </button>
        <div className="flex gap-x-12 gap-y-10 px-4">
          {[
            { id: "temp", icon: <Thermometer size={16} />, val: `${dailyLog.weather?.temp ?? 20}°C`, sub: "Température" },
            { id: "humidity", icon: <Droplets size={16} />, val: `${dailyLog.weather?.humidity ?? 50}%`, sub: "Humidité" },
            { id: "uv", icon: <Sun size={16} />, val: dailyLog.weather?.uv ?? 0, sub: "Index UV" },
            { id: "air", icon: <CloudSun size={16} />, val: dailyLog.weather?.pollution ?? "Bon", sub: "Qualité Air" }
          ].map((item) => (
            <div key={item.id} className="flex flex-col items-center text-center gap-3">
              <div className="text-muted-foreground/60">{item.icon}</div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-foreground">{item.val}</p>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>


      {/* Section de Suivi (Observations + Biologique) */}
      <div id="suivi-bio">
        {/* Observations quotidiennes */}
        <h2 className="text-lg font-display text-foreground mb-10 text-center">Observations quotidiennes</h2>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="premium-card p-10 mb-20 bg-white/60">
          <div className="grid grid-cols-1 gap-10">
            {SYMPTOMS_CONFIG
              .filter(s => userConcerns.length === 0 || userConcerns.includes(s.problem))
              .map((config) => {
                const value = dailyLog.symptoms?.[config.id];
                const trendLabel = value === "moins" ? "Amélioration" : value === "plus" ? "Poussée" : (value === "pareil" ? "Stable" : "N/A");
                const trendIcon = value === "moins" ? "↓" : value === "plus" ? "↑" : (value === "pareil" ? "→" : "?");
                const trendColor = value === "moins" ? "text-primary" : value === "plus" ? "text-[#C08484]" : (value === "pareil" ? "text-muted-foreground/40" : "text-muted-foreground/20");

                return (
                  <div
                    key={config.id}
                    onClick={() => cycleTrend(config.id)}
                    className="flex items-center justify-between group cursor-pointer hover:bg-white/40 p-4 -mx-4 rounded-[24px] transition-all active:scale-[0.98] border border-transparent hover:border-border/20"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full border border-border/40 bg-muted/5 flex items-center justify-center text-primary/60 group-hover:bg-white transition-all">
                        {config.icon}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{config.label}</p>
                        <p className="text-base font-bold text-foreground tracking-tight">{trendLabel}</p>
                      </div>
                    </div>
                    <div
                      className={`w-12 h-12 flex items-center justify-center rounded-full border border-border/20 group-hover:border-primary/40 transition-all text-xl font-display ${trendColor} italic bg-white/40 shadow-sm group-hover:premium-shadow`}
                      title="Changer l'état"
                    >
                      {trendIcon}
                    </div>
                  </div>
                );
              })}
          </div>
        </motion.div>

        {/* Suivi Biologique */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mb-10">
          <div className="flex flex-col items-center mb-10">
            <h2 className="text-lg font-display text-foreground mb-4">Suivi biologique</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('cycle'); setEditValue(dailyLog.cyclePhase || ""); }}>
              <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Calendar size={18} strokeWidth={1.5} /></div><Pencil size={14} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" /></div>
              <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Cycle</p><p className="text-sm font-bold text-foreground">{dailyLog.cyclePhase || "N/A"}</p></div>
            </div>
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('stress'); setEditValue(dailyLog.stressLevel ?? 3); }}>
              <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Heart size={18} strokeWidth={1.5} /></div><Pencil size={14} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" /></div>
              <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Stress</p><p className="text-sm font-bold text-foreground">{dailyLog.stressLevel !== null ? `${dailyLog.stressLevel}/5` : "N/A"}</p></div>
            </div>
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('makeup'); setEditValue(dailyLog.makeupRemoved ?? false); setMakeupStep(1); }}>
              <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Sparkles size={18} strokeWidth={1.5} /></div><Pencil size={14} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" /></div>
              <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Peau</p><p className="text-sm font-bold text-foreground">{dailyLog.makeupRemoved !== null ? (dailyLog.makeupRemoved ? "Nette" : "Maquillée") : "N/A"}</p></div>
            </div>
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('alcohol'); setEditValue(dailyLog.alcoholDrinks ?? 0); }}>
              <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Wine size={18} strokeWidth={1.5} /></div><Pencil size={14} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" /></div>
              <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Alcool</p><p className="text-sm font-bold text-foreground">{dailyLog.alcoholDrinks !== undefined && dailyLog.alcoholDrinks !== null ? (dailyLog.alcoholDrinks > 0 ? `${dailyLog.alcoholDrinks} u.` : "Aucun") : "N/A"}</p></div>
            </div>
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('sleep'); setEditValue(dailyLog.sleepHours ?? 8); }}>
              <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Moon size={18} strokeWidth={1.5} /></div><Pencil size={14} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" /></div>
              <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Sommeil</p><p className="text-sm font-bold text-foreground">{dailyLog.sleepHours !== null ? `${dailyLog.sleepHours}h` : "N/A"}</p></div>
            </div>
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('sport'); setEditValue(dailyLog.didSport || "Non"); }}>
              <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Dumbbell size={18} strokeWidth={1.5} /></div><Pencil size={14} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" /></div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Activité</p>
                <p className="text-sm font-bold text-foreground">{dailyLog.didSport !== null && dailyLog.didSport !== "" ? dailyLog.didSport : "N/A"}</p>
                {dailyLog.stravaData && dailyLog.didSport !== "Non" && (
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono font-bold text-[#FC4C02] uppercase tracking-[0.05em]">
                    <span className="w-1.5 h-1.5 bg-[#FC4C02] rounded-full animate-pulse" />
                    Synchro : {dailyLog.stravaData.sport}
                  </div>
                )}
              </div>
            </div>
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('water'); setEditValue(dailyLog.waterGlasses ?? 4); }}>
              <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><GlassWater size={18} strokeWidth={1.5} /></div><Pencil size={14} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" /></div>
              <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Eau</p><p className="text-sm font-bold text-foreground">{dailyLog.waterGlasses !== null ? `${dailyLog.waterGlasses} verres` : "N/A"}</p></div>
            </div>
            <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('alimentation'); setEditValue(dailyLog.foodQuality || "Équilibrée"); }}>
              <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><FlaskRound size={18} strokeWidth={1.5} /></div><Pencil size={14} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" /></div>
              <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Alimentation</p><p className="text-sm font-bold text-foreground">{dailyLog.foodQuality || "N/A"}</p></div>
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
              {editingFactor === 'water' && (<div className="space-y-8"><div className="flex flex-col items-center gap-2 py-4"><span className="text-5xl font-display text-primary">{editValue}</span><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 italic">Verres d'eau</span></div><div className="px-1"><Slider value={[editValue || 8]} min={0} max={16} step={1} onValueChange={(v) => setEditValue(v[0])} /></div></div>)}
              {editingFactor === 'alimentation' && (<div className="space-y-4"><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block">Qualité des repas</label><div className="grid grid-cols-1 gap-3">{["Équilibrée", "Grasses / Sucrées", "Riches en sel", "Transformés"].map(lvl => (<button key={lvl} onClick={() => setEditValue(lvl)} className={`py-4 px-6 border rounded-2xl transition-all text-xs font-bold ${editValue === lvl ? 'bg-primary text-primary-foreground border-primary shadow-lg' : 'bg-muted/10 border-transparent text-foreground/60'}`}>{lvl}</button>))}</div></div>)}
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
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Cycle</label>
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
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Règles</label>
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
              {editingFactor === 'makeup' && (
                <div className="space-y-8">
                  {makeupStep === 1 ? (
                    <div className="space-y-8">
                      <p className="text-sm font-medium text-foreground tracking-tight italic text-center">Étiez-vous maquillé(e) aujourd'hui ?</p>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => { setWearingMakeup(true); setMakeupStep(2); }} 
                          className={`py-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${wearingMakeup === true ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}
                        >
                          Oui
                        </button>
                        <button 
                          onClick={() => { setWearingMakeup(false); setEditValue(true); }} 
                          className={`py-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${wearingMakeup === false ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}
                        >
                          Non
                        </button>
                      </div>
                      <p className="text-[11px] text-center text-muted-foreground italic px-4 leading-relaxed">Si vous ne portiez pas de maquillage, votre peau est considérée comme propre par défaut.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <p className="text-sm font-medium text-foreground tracking-tight italic text-center">Avez-vous nettoyé votre peau ce soir ?</p>
                      <div className="flex flex-col gap-3">
                        <button 
                          onClick={() => setEditValue(true)} 
                          className={`py-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${editValue === true ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}
                        >
                          Oui, peau propre
                        </button>
                        <button 
                          onClick={() => setEditValue(false)} 
                          className={`py-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${editValue === false ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}
                        >
                          Non, pas encore
                        </button>
                      </div>
                      <button onClick={() => { setMakeupStep(1); setWearingMakeup(null); }} className="w-full text-[11px] font-bold text-muted-foreground uppercase text-center mt-4 underline underline-offset-4 hover:opacity-100 transition-opacity">Retour</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={saveEdit} className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow">Enregistrer</button>
          </DialogContent>
        </Dialog>
      </div>
      <DailyCheckinModal 
        open={showCheckinModal}
        onClose={() => {
          setShowCheckinModal(false);
          sessionStorage.setItem("dailyCheckinDismissed", "true");
        }}
        initialLog={dailyLog}
        userConcerns={userConcerns}
        onSave={async (updatedLog) => {
          setDailyLog(updatedLog);
          localStorage.setItem("dailyCheckinData", JSON.stringify(updatedLog));
          
          // Force sync
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const today = new Date().toISOString().split("T")[0];
            
            // Sync factors
            await (supabase as any).from("daily_checkins").upsert({
              user_id: session.user.id,
              date: today,
              sleep_hours: updatedLog.sleepHours,
              stress_level: updatedLog.stressLevel,
              water_glasses: updatedLog.waterGlasses,
              food_quality: updatedLog.foodQuality,
              alcohol_drinks: updatedLog.alcoholDrinks,
              did_sport: updatedLog.didSport !== "Non",
              sport_intensity: updatedLog.didSport,
              makeup_removed: updatedLog.makeupRemoved,
              cycle_phase: updatedLog.cyclePhase
            }, { onConflict: "user_id,date" });

            // Sync symptoms
            for (const [symptomId, trend] of Object.entries(updatedLog.symptoms || {})) {
               await (supabase as any).from("symptom_tracking").upsert({
                user_id: session.user.id,
                date: today,
                symptom: symptomId,
                trend: trend,
                zone: null
              }, { onConflict: "user_id,date,symptom" });
            }
          }
        }}
      />
    </div>
  );
};

export default Dashboard;
