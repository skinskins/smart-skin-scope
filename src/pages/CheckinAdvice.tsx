import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft, Info, CheckCircle2, FlaskRound, Sun, Droplets, CloudSun, Moon,
    Wine, Dumbbell, Heart, FlaskConical, Pencil, Sparkles, Thermometer, MapPin,
    Stethoscope, Lightbulb, BluetoothOff, Bluetooth, Check, ChevronRight,
    Salad, Waves, ShieldCheck, LogOut, Calendar, User, AlertCircle
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import skincareMatrix from "@/data/skincare_matrix_v3.json";
import SkinScoreRing from "@/components/SkinScoreRing";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useWeatherData } from "@/hooks/useWeatherData";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────
interface AdviceItem {
    iconStr: string;
    title: string;
    text: string;
    tip: string;
    group: "g1" | "g2" | "g3" | "g4";
    priority: "high" | "medium" | "low";
    ingredients?: string[];
    spfData?: any;
}

interface Context {
    skinType: string;
    uvIndex: number;
    tempC: number;
    humidity: number;
    aqi: number;
    sleepHours: number;
    stressLevel: number;
    alcoholLastNight: number;
    removedMakeupLastNight: boolean;
    didSportToday: boolean;
    cycleDay: number | null;
}

// ─── Moteur de matching ──────────────────────────────────────
type TriggerCondition = boolean | { gte?: number; lte?: number };

function evaluateTrigger(ctx: Context, trigger: Record<string, TriggerCondition>): boolean {
    for (const [key, cond] of Object.entries(trigger)) {
        const val = ctx[key as keyof Context];

        if (typeof cond === "boolean") {
            if (val !== cond) return false;
        } else if (typeof cond === "object" && cond !== null) {
            const numVal = val as number;
            if (numVal === null || numVal === undefined) return false;
            const triggerObj = cond as { gte?: number; lte?: number };
            if (triggerObj.gte !== undefined && numVal < triggerObj.gte) return false;
            if (triggerObj.lte !== undefined && numVal > triggerObj.lte) return false;
        }
    }
    return true;
}

function getActiveAdvice(ctx: Context): AdviceItem[] {
    const results: AdviceItem[] = [];
    const skinType = ctx.skinType as "dry" | "oily" | "combo" | "normal";

    const processGroup = (groupKey: "g1" | "g2" | "g3" | "g4", priority: "high" | "medium" | "low") => {
        // @ts-ignore
        const group = skincareMatrix.groups[groupKey];
        if (!group) return;

        for (const scenario of group.scenarios) {
            if (evaluateTrigger(ctx, scenario.trigger as Record<string, TriggerCondition>)) {
                // @ts-ignore
                const spec = scenario.advice[skinType] as { title: string; body: string; tip: string; ingredients?: string[] };
                if (spec) {
                    results.push({
                        iconStr: scenario.icon,
                        title: spec.title,
                        text: spec.body,
                        tip: spec.tip,
                        group: groupKey,
                        priority: priority,
                        ingredients: spec.ingredients || [],
                        // @ts-ignore
                        spfData: scenario.spfData
                    });
                }
            }
        }
    };

    processGroup("g3", "high");
    processGroup("g4", "high");
    processGroup("g1", "medium");
    processGroup("g2", "low");

    return results.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
    }).slice(0, 5);
}

const SKIN_TYPE_MAP: Record<string, string> = {
    "Sensible": "dry",
    "Sèche": "dry",
    "Grasse": "oily",
    "Mixte": "combo",
    "Normale": "normal",
};

const cyclePhases = ["Aucun", "Autre", "Je ne sais pas", "Menstruation", "Folliculaire", "Ovulatoire", "Lutéal"];
const workoutIntensities = ["Non", "Léger", "Modéré", "Intense"];
const STRESS_LABELS = ["", "Zen", "Calme", "Modéré", "Élevé", "Extrême"];

const SKIN_TYPES = ["Sèche", "Grasse", "Mixte", "Normale", "Sensible", "Acnéique"];
const SKIN_CONCERNS = ["Acné", "Rougeurs", "Taches brunes", "Points noirs", "Déshydratation", "Rides fixes", "Cernes / Poches", "Eczéma", "Rosacée", "Sensibilité extrême"];
const SKIN_GOALS = ["Hydratation", "Anti-âge", "Éclat / Glow", "Anti-imperfections", "Apaiser", "Réduire les taches", "Resserrer les pores", "Anti-cernes"];

const FactorButton = ({ icon, label, value, onClick }: { icon: React.ReactNode, label: string, value: string | number, onClick: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 hover:bg-accent/50 rounded-2xl p-3 transition-all border border-transparent hover:border-primary/20">
        <div className="p-2  bg-muted/50 text-primary">
            {icon}
        </div>
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <span className="text-sm font-bold text-foreground">{value}</span>
    </button>
);

const CheckinAdvice = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isOnboarding = location.state?.isOnboarding;
    const firstName = location.state?.firstName || "";

    const [isSuccessStep, setIsSuccessStep] = useState(isOnboarding);

    // Clear onboarding state from location history so it doesn't reappear on reload
    useEffect(() => {
        if (isOnboarding) {
            navigate(location.pathname, { replace: true, state: { ...location.state, isOnboarding: false } });
        }
    }, [isOnboarding, location.pathname, location.state, navigate]);

    // Factors state
    const [factors, setFactors] = useState(() => {
        const saved = localStorage.getItem("dailyCheckinData");
        const factors = saved ? JSON.parse(saved) : {};
        // Ensure manualLocation is always present in factors if it exists
        const manualLocSnippet = localStorage.getItem("manualLocation") || "Paris";
        if (!factors.location) {
            factors.location = manualLocSnippet;
        }
        return factors;
    });

    const [guest, setGuest] = useState(() => {
        const saved = localStorage.getItem("guestProfile");
        if (saved) return JSON.parse(saved);
        return {};
    });

    const [editingFactor, setEditingFactor] = useState<string | null>(null);
    const [editingProfile, setEditingProfile] = useState<'skin_type' | 'skin_problems' | 'skin_goals' | null>(null);
    const [editValue, setEditValue] = useState<any>(null);
    const [editProfileValue, setEditProfileValue] = useState<any>(null);
    const [locationInput, setLocationInput] = useState("");
    const [makeupStep, setMakeupStep] = useState(1);
    const [woreMakeup, setWoreMakeup] = useState<boolean | null>(null);

    const [dbCheckinDone, setDbCheckinDone] = useState(false);

    const currentHour = new Date().getHours();
    const greeting = (currentHour >= 5 && currentHour < 16) ? "Bonjour" : "Bonsoir";
    const factorSectionTitle = (currentHour >= 0 && currentHour < 16)
        ? "Bilan des dernières 24h"
        : "Bilan de votre journée";

    const isAllFactorsDone = useMemo(() => {
        const required = ['sleepHours', 'stressLevel', 'waterStatus', 'alcoholDrinks', 'cyclePhase', 'didSport', 'makeupRemoved', 'foodQuality'];
        return required.every(key => factors[key] !== undefined && factors[key] !== null && factors[key] !== "");
    }, [factors]);

    const isCheckinDoneToday = isAllFactorsDone;

    const syncFactorToSupabase = async (key: string, value: any) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const todayStr = new Date().toISOString().split('T')[0];
        const updates: any = {
            last_checkin_date: todayStr
        };

        if (key === 'sleep') updates.sleep_hours = value;
        if (key === 'stress') updates.stress_level = value;
        if (key === 'water') updates.water_glasses = value === "Trop" ? 12 : (value === "Suffisamment" ? 8 : 4);
        if (key === 'alcohol') updates.alcohol_drinks = value;
        if (key === 'cycle') updates.cycle_phase = value;
        if (key === 'sport') updates.did_sport = value;
        if (key === 'makeup') updates.makeup_removed = value;
        if (key === 'alimentation') updates.food_quality = value;
        if (key === 'location') {
            updates.manual_location = value;
            // Also update long-term storage
            localStorage.setItem("manualLocation", value);
            setManualLocationState(value);
        }

        console.log(`[CheckinAdvice] Syncing ${key} to Supabase:`, value);
        const { data, error } = await (supabase as any).from("profiles").update(updates).eq("id", session.user.id);
        if (error) {
            console.error(`[CheckinAdvice] Error syncing ${key}:`, error);
            toast.error("Erreur de sauvegarde : Vérifiez la base de données.");
        } else {
            console.log(`[CheckinAdvice] Multi-sync successful for ${key}.`);
        }
    };

    const [manualLocation, setManualLocationState] = useState<string>(() => localStorage.getItem("manualLocation") || "Paris");
    const { weather: liveWeather, loading: weatherLoading } = useWeatherData(manualLocation || undefined);

    const setManualLocation = async (loc: string | null) => {
        setManualLocationState(loc);
        if (loc) {
            localStorage.setItem("manualLocation", loc);
            const newFactors = { ...factors, location: loc };
            setFactors(newFactors);
            localStorage.setItem("dailyCheckinData", JSON.stringify(newFactors));

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await (supabase as any).from("profiles").update({ manual_location: loc }).eq("id", session.user.id);
            }
        } else {
            localStorage.removeItem("manualLocation");
        }
    };

    // Update factors when live weather arrives
    useEffect(() => {
        if (!weatherLoading && liveWeather.locationName !== "...") {
            setFactors(f => {
                const updated = {
                    ...f,
                    weather: liveWeather,
                    location: liveWeather.locationName || f.location
                };
                localStorage.setItem("dailyCheckinData", JSON.stringify(updated));
                return updated;
            });
        }
    }, [liveWeather, weatherLoading]);

    // Score calculations
    const skinScore = useMemo(() => {
        // Mock score logic based on factors if no diag exists
        let score = 75;
        if (factors.sleepHours < 7) score -= 5;
        if (factors.stressLevel > 3) score -= 5;
        if (factors.alcoholDrinks > 1) score -= 5;
        if (factors.waterStatus === "Pas assez") score -= 5;
        if (factors.weather?.uv > 6) score -= 2;
        return Math.max(0, Math.min(100, score));
    }, [factors]);

    const adviceList = useMemo(() => {
        if (!isCheckinDoneToday) return [];
        if (!factors.weather) return [];
        const skinType = SKIN_TYPE_MAP[guest.skin_type] ?? "normal";
        const ctx: Context = {
            skinType,
            uvIndex: Math.floor(factors.weather?.uv ?? 0),
            tempC: factors.weather?.temp ?? 20,
            humidity: factors.weather?.humidity ?? 50,
            aqi: factors.weather?.aqiScore ?? 25,
            sleepHours: factors.sleepHours ?? 8,
            stressLevel: (factors.stressLevel ?? 1) * 2, // Map 1-5 app scale to 1-10 matrix scale
            alcoholLastNight: factors.alcoholDrinks ?? 0,
            removedMakeupLastNight: factors.makeupRemoved ?? true,
            didSportToday: factors.didSport ?? ((factors.workoutMinutes ?? 0) > 0),
            cycleDay: factors.cyclePhase === "Menstruation" ? 2 : (["Je ne sais pas", "Folliculaire", "Aucun", "Autre"].includes(factors.cyclePhase || "") ? null : (factors.cyclePhase === "Lutéal" ? 20 : null))
        };
        const advice = getActiveAdvice(ctx);
        if (advice.length === 0) {
            advice.push({
                iconStr: "✨",
                title: "Tout va bien",
                text: "Vos indicateurs sont au vert ! Maintenez votre belle routine actuelle.",
                tip: "Continuez de bien hydrater votre peau chaque matin.",
                group: "g1",
                priority: "low"
            });
        }
        return advice;
    }, [factors, guest]);

    useEffect(() => {
        const fetchCheckinStatus = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await (supabase as any)
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    const profileData = profile as any;
                    setGuest(profileData);

                    // Sync location
                    if (profileData.manual_location) {
                        setManualLocationState(profileData.manual_location);
                        localStorage.setItem("manualLocation", profileData.manual_location);
                    }

                    // Simple check: if last_checkin_date is today
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isToday = profileData.last_checkin_date === todayStr;

                    console.log("[CheckinAdvice] Profile loaded:", {
                        last_checkin_date: profileData.last_checkin_date,
                        todayStr,
                        isToday
                    });

                    if (isToday) {
                        setDbCheckinDone(true);
                        localStorage.setItem("lastCheckinDate", todayStr);

                        // Sync factors from DB
                        setFactors((f: any) => ({
                            ...f,
                            sleepHours: profileData.sleep_hours,
                            stressLevel: profileData.stress_level,
                            waterStatus: profileData.water_glasses === 12 ? "Trop" : (profileData.water_glasses === 8 ? "Suffisamment" : (profileData.water_glasses === 4 ? "Pas assez" : profileData.water_glasses)),
                            alcoholDrinks: profileData.alcohol_drinks,
                            cyclePhase: profileData.cycle_phase,
                            didSport: profileData.did_sport,
                            makeupRemoved: profileData.makeup_removed,
                            woreMakeup: profileData.makeup_removed === null ? null : (JSON.parse(localStorage.getItem("dailyCheckinData") || "{}").woreMakeup),
                            foodQuality: profileData.food_quality,
                            location: profileData.manual_location || f.location
                        }));
                    } else {
                        console.log("[CheckinAdvice] New day detected or no data today. Resetting factors.");
                        // Reset for new day
                        setDbCheckinDone(false);
                        localStorage.removeItem("lastCheckinDate");

                        // User specifically wants to reset: cycle, stress, nettoyage, sommeil, alcool, sport
                        // We preserve: location (as requested before) and by default we'll also preserve water/food 
                        // as they weren't in the "reset only these" list.
                        const loc = profileData.manual_location || manualLocation;
                        const preservedFactors = {
                            location: loc,
                            waterStatus: profileData.water_glasses ? (profileData.water_glasses >= 12 ? "Trop" : (profileData.water_glasses >= 8 ? "Suffisamment" : "Pas assez")) : undefined,
                            foodQuality: profileData.food_quality || undefined
                        };

                        setFactors(preservedFactors);
                        localStorage.setItem("dailyCheckinData", JSON.stringify(preservedFactors));

                        // Also clear the daily columns in Supabase for the new day
                        (supabase as any).from("profiles").update({
                            cycle_phase: null,
                            stress_level: null,
                            makeup_removed: null,
                            sleep_hours: null,
                            alcohol_drinks: null,
                            did_sport: null,
                            last_checkin_date: todayStr
                        }).eq("id", session.user.id).then(({ error }) => {
                            if (error) console.error("[CheckinAdvice] Error resetting daily fields in DB:", error);
                        });
                    }
                }
            }
        };

        fetchCheckinStatus();
    }, []);

    useEffect(() => {
        if (isSuccessStep) {
            const timer = setTimeout(() => setIsSuccessStep(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isSuccessStep]);

    const saveEdit = async () => {
        if (!editingFactor) return;

        const newFactors = { ...factors };
        let syncValue = editValue;

        if (editingFactor === 'location') {
            syncValue = locationInput;
            newFactors.location = locationInput;
        }
        if (editingFactor === 'sleep') newFactors.sleepHours = editValue;
        if (editingFactor === 'stress') newFactors.stressLevel = editValue;
        if (editingFactor === 'water') newFactors.waterStatus = editValue;
        if (editingFactor === 'alcohol') {
            newFactors.hasAlcohol = editValue > 0;
            newFactors.alcoholDrinks = editValue;
        }
        if (editingFactor === 'cycle') newFactors.cyclePhase = editValue;
        if (editingFactor === 'sport') newFactors.didSport = editValue;
        if (editingFactor === 'makeup') {
            newFactors.makeupRemoved = editValue;
            newFactors.woreMakeup = woreMakeup;
        }
        if (editingFactor === 'alimentation') newFactors.foodQuality = editValue;

        setFactors(newFactors);
        localStorage.setItem("dailyCheckinData", JSON.stringify(newFactors));

        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem("lastCheckinDate", todayStr);
        setDbCheckinDone(true);

        // Sync with Supabase
        syncFactorToSupabase(editingFactor, syncValue);
        setEditingFactor(null);
        setMakeupStep(1);
        setWoreMakeup(null);
    };

    const saveProfileEdit = async () => {
        if (!editingProfile) return;

        const updates: any = {};
        if (editingProfile === 'skin_type') updates.skin_type = editProfileValue;
        if (editingProfile === 'skin_problems') updates.skin_problems = editProfileValue;
        if (editingProfile === 'skin_goals') updates.skin_goals = editProfileValue;

        // Update local state
        setGuest((prev: any) => ({ ...prev, ...updates }));

        // Sync with Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await (supabase as any).from("profiles").update(updates).eq("id", session.user.id);
            toast.success("Profil mis à jour !");
        }

        setEditingProfile(null);
    };

    if (isSuccessStep) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2" />
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card p-8   z-10 flex flex-col items-center text-center max-w-sm w-full">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 size={40} className="text-primary" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-foreground mb-2">Votre profil est crée !</h2>
                    <p className="text-muted-foreground text-sm">Bienvenue sur Nacre</p>
                    <div className="mt-8 relative w-full h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.2 }} className="absolute bg-primary h-full" />
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-6 pb-32 max-w-lg mx-auto overflow-x-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#111111]/5 -translate-y-1/2 translate-x-1/2" />

            {/* Consolidated Identity Header */}
            <section className="mb-12 relative group/card">
                <div className="bg-white border border-[#E5E5E5] p-8 relative overflow-hidden">

                    {/* Top Row: Greeting & Logout */}
                    <div className="flex items-center justify-between mb-5 relative z-10">
                        <div>
                            <h2 className="text-3xl font-display font-bold text-[#111111] uppercase tracking-[0.05em]">
                                {greeting}, {guest.first_name || firstName}
                            </h2>
                        </div>
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut();
                                localStorage.removeItem("guestProfile");
                                localStorage.removeItem("lastCheckinDate");
                                localStorage.removeItem("dailyCheckinData");
                                localStorage.removeItem("manualLocation");
                                navigate("/onboarding");
                                toast.success("Déconnexion réussie");
                            }}
                            className="p-3 bg-white border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white transition-all shadow-none"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 relative z-10 pt-5 border-t border-[#E5E5E5]">
                        {/* Nature de la Peau */}
                        <div className="relative group/edit flex flex-col justify-center">
                            <button
                                onClick={() => { setEditingProfile('skin_type'); setEditProfileValue(guest.skin_type); }}
                                className="absolute -top-1 -right-1 p-2 bg-white border border-[#111111] shadow-none opacity-0 group-hover/edit:opacity-100 transition-opacity z-20"
                            >
                                <Pencil size={12} className="text-[#111111]" />
                            </button>
                            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] mb-2">Nature</p>
                            <p className="text-2xl font-display font-bold text-[#111111]">
                                {guest.skin_type || "Pure"}
                            </p>
                        </div>

                        {/* Focus Section */}
                        <div className="relative group/edit flex flex-col justify-center border-l border-[#E5E5E5] pl-6">
                            <button
                                onClick={() => { setEditingProfile('skin_problems'); setEditProfileValue(guest.skin_problems); }}
                                className="absolute -top-1 -right-1 p-2 bg-white border border-[#111111] opacity-0 group-hover/edit:opacity-100 transition-opacity z-20"
                            >
                                <Pencil size={12} className="text-[#111111]" />
                            </button>
                            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] mb-2">Focus</p>
                            <div className="flex flex-wrap gap-2 items-center">
                                {guest.skin_problems && guest.skin_problems.length > 0 ? (
                                    <>
                                        {guest.skin_problems.slice(0, 2).map((prob: string) => (
                                            <span key={prob} className="text-[10px] font-bold text-[#111111] border border-[#111111] px-2 py-0.5 font-mono uppercase tracking-[0.05em]">
                                                {prob}
                                            </span>
                                        ))}
                                        {guest.skin_problems.length > 2 && <span className="text-[10px] text-[#AAAAAA] font-bold">...</span>}
                                    </>
                                ) : (
                                    <span className="text-[10px] text-[#AAAAAA] font-mono uppercase tracking-[0.1em]">Non défini</span>
                                )}
                            </div>
                        </div>

                        {/* Objectifs Section */}
                        <div className="relative group/edit flex flex-col justify-center border-l border-[#E5E5E5] pl-6">
                            <button
                                onClick={() => { setEditingProfile('skin_goals'); setEditProfileValue(guest.skin_goals); }}
                                className="absolute -top-1 -right-1 p-2 bg-white border border-[#111111] opacity-0 group-hover/edit:opacity-100 transition-opacity z-20"
                            >
                                <Pencil size={12} className="text-[#111111]" />
                            </button>
                            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] mb-2">Objectifs</p>
                            <div className="flex flex-wrap gap-2 items-center">
                                {guest.skin_goals && guest.skin_goals.length > 0 ? (
                                    <>
                                        {guest.skin_goals.slice(0, 2).map((goal: string) => (
                                            <span key={goal} className="text-[10px] font-bold text-[#111111] border border-[#111111] px-2 py-0.5 font-mono uppercase tracking-[0.05em]">
                                                {goal}
                                            </span>
                                        ))}
                                        {guest.skin_goals.length > 2 && <span className="text-[10px] text-[#AAAAAA] font-bold">...</span>}
                                    </>
                                ) : (
                                    <span className="text-[10px] text-[#AAAAAA] font-mono uppercase tracking-[0.1em]">Non défini</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Advice Section */}
            <section className="mb-12">
                <h2 className="text-xl font-display font-bold text-[#111111] mb-6 uppercase tracking-[0.05em]">
                    Conseils du jour
                </h2>
                <div className="space-y-4">
                    {!isCheckinDoneToday && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-8 bg-white border border-[#111111] flex flex-col items-center gap-4 text-center"
                        >
                            <div className="p-4 border border-[#111111]">
                                <Droplets size={24} className="text-[#111111]" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-bold uppercase tracking-[0.1em] text-[#111111]">Check-in du jour manquant</p>
                                <p className="text-[11px] text-[#AAAAAA] leading-relaxed uppercase font-mono tracking-[0.05em]">
                                    Complétez vos facteurs de vie ci-dessous pour débloquer vos conseils personnalisés.
                                </p>
                                <button
                                    onClick={() => document.getElementById('lifestyle-factors')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="mt-4 px-6 py-3 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-black transition-colors flex items-center gap-2 mx-auto"
                                >
                                    Compléter maintenant
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                    <AnimatePresence mode="popLayout">
                        {adviceList.map((advice, idx) => (
                            <motion.div
                                key={advice.title}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: idx * 0.1 }}
                                className="p-6 border border-[#E5E5E5] bg-white"
                            >
                                <div className="flex gap-4">
                                    <div className="text-3xl flex-shrink-0">{advice.iconStr}</div>
                                    <div className="flex-1">
                                        <h3 className="font-display font-bold text-lg text-[#111111] uppercase tracking-[0.05em] mb-2">{advice.title}</h3>
                                        <p className="text-sm text-[#111111] leading-relaxed mb-4">{advice.text}</p>

                                        {advice.ingredients && advice.ingredients.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {advice.ingredients.map(ing => (
                                                    <span key={ing} className="px-2.5 py-1 border border-[#111111] text-[#111111] text-[10px] font-mono uppercase tracking-[0.1em]">
                                                        {ing}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {advice.spfData && (
                                            <div className="my-6 p-5 bg-white border border-[#111111] space-y-4">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em] font-bold mb-1">Quantité</p>
                                                        <p className="text-sm font-bold text-[#111111] uppercase tracking-[0.05em]">{advice.spfData.qty}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em] font-bold mb-1">Renouveler</p>
                                                        <p className="text-sm font-bold text-[#111111] uppercase tracking-[0.05em]">Toutes les {advice.spfData.renewEvery}</p>
                                                    </div>
                                                </div>
                                                {advice.spfData.renewNote && (
                                                    <p className="text-[11px] text-[#AAAAAA] font-mono uppercase tracking-[0.05em] italic">
                                                        * {advice.spfData.renewNote}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {advice.tip && (
                                            <div className="flex gap-3 p-4 bg-muted/10 border border-[#E5E5E5]">
                                                <Info size={16} className="text-[#AAAAAA] shrink-0 mt-0.5" />
                                                <p className="text-[11px] font-mono text-[#111111] leading-relaxed uppercase tracking-[0.05em]">{advice.tip}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </section>

            {/* Environment Grid */}
            <section className="mb-12">
                <h2 className="text-xl font-display font-bold text-[#111111] mb-6 uppercase tracking-[0.05em]">
                    Paramètres du jour
                </h2>
                <div className="bg-white border border-[#E5E5E5] p-6">
                    {/* Location row */}
                    <button onClick={() => { setEditingFactor('location'); setEditValue(factors.location || "Paris"); setLocationInput(factors.location || "Paris"); }} className="text-left w-full focus:outline-none">
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E5E5E5] hover:bg-muted/10 p-2 transition-colors">
                            <MapPin size={18} className="text-[#111111]" />
                            <div>
                                <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em] font-bold">Localisation</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className={`text-base font-bold ${factors.location ? 'text-[#111111]' : 'text-[#AAAAAA]/50'}`}>
                                        {factors.location || "Paris"}
                                    </p>
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
                            { id: "temp", icon: <Thermometer size={18} />, val: `${factors.weather?.temp ?? 20}°C`, sub: "Temp" },
                            { id: "humidity", icon: <Droplets size={18} />, val: `${factors.weather?.humidity ?? 50}%`, sub: "Humidité" },
                            { id: "uv", icon: <Sun size={18} />, val: factors.weather?.uv ?? 0, sub: "UV" },
                            { id: "air", icon: <CloudSun size={18} />, val: factors.weather?.pollution ?? "Bon", sub: "Air" }
                        ].map((item) => (
                            <div key={item.id} className="flex flex-col items-center gap-3 p-3 border border-transparent hover:bg-muted/10 transition-colors">
                                <div className="text-[#111111]">
                                    {item.icon}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-[#111111] leading-tight uppercase">{item.val}</p>
                                    <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em]">{item.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Lifestyle Grid */}
            <section id="lifestyle-factors" className="bg-white border border-[#E5E5E5] p-8 mb-8">
                <div className="mb-8">
                    <h3 className="text-2xl font-display font-bold text-[#111111] uppercase tracking-[0.05em] mb-2">
                        {factorSectionTitle}
                    </h3>
                    {!isCheckinDoneToday && (
                        <p className="text-[11px] font-mono text-[#AAAAAA] uppercase tracking-[0.05em] italic">
                            Renseignez vos dernières actions pour des conseils précis.
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* Cycle */}
                    <div className="flex items-center gap-4 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5] group relative">
                        <Calendar size={18} className="text-[#111111]" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">Cycle</p>
                            <select
                                value={factors.cyclePhase || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFactors(f => ({ ...f, cyclePhase: val }));
                                    localStorage.setItem("dailyCheckinData", JSON.stringify({ ...factors, cyclePhase: val }));
                                    localStorage.setItem("lastCheckinDate", new Date().toISOString().split('T')[0]);
                                    setDbCheckinDone(true);
                                    syncFactorToSupabase('cycle', val);
                                }}
                                className={`text-sm font-bold bg-transparent border-none p-0 focus:outline-none w-full cursor-pointer uppercase mt-1 ${!factors.cyclePhase ? 'text-[#AAAAAA]/50' : 'text-[#111111]'}`}
                            >
                                <option value="" disabled className="bg-white">N/A</option>
                                {cyclePhases.map((p) => <option key={p} value={p} className="bg-white">{p}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Stress */}
                    <button onClick={() => { setEditingFactor('stress'); setEditValue(factors.stressLevel ?? 3); }} className="text-left flex items-center gap-4 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5] group">
                        <Heart size={18} className="text-[#111111]" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">Stress</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className={`text-sm font-bold uppercase ${factors.stressLevel !== undefined && factors.stressLevel !== null ? 'text-[#111111]' : 'text-[#AAAAAA]/50'}`}>
                                    {factors.stressLevel !== undefined && factors.stressLevel !== null ? `${factors.stressLevel}/5` : "N/A"}
                                </p>
                                <Pencil size={12} className="text-[#AAAAAA]/40" />
                            </div>
                        </div>
                    </button>

                    <button onClick={() => { setEditingFactor('makeup'); setEditValue(factors.makeupRemoved ?? false); setMakeupStep(1); }} className="text-left flex items-center gap-4 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5] group">
                        <Sparkles size={18} className="text-[#111111]" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">Démaquillage</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className={`text-[10px] font-bold uppercase transition-colors ${factors.makeupRemoved !== undefined && factors.makeupRemoved !== null ? 'text-[#111111]' : 'text-[#AAAAAA]/50'}`}>
                                    {factors.makeupRemoved !== undefined && factors.makeupRemoved !== null ? (
                                        factors.woreMakeup === false ? "Visage Net" :
                                            (factors.makeupRemoved ? "Visage Net" : "Maquillé")
                                    ) : "N/A"}
                                </p>
                                <Pencil size={12} className="text-[#AAAAAA]/40" />
                            </div>
                        </div>
                    </button>

                    {/* Sommeil */}
                    <button onClick={() => { setEditingFactor('sleep'); setEditValue(factors.sleepHours ?? 8); }} className="text-left flex items-center gap-4 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5] group">
                        <Moon size={18} className="text-[#111111]" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">Sommeil</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className={`text-sm font-bold uppercase ${factors.sleepHours !== undefined && factors.sleepHours !== null ? 'text-[#111111]' : 'text-[#AAAAAA]/50'}`}>
                                    {factors.sleepHours !== undefined && factors.sleepHours !== null ? `${factors.sleepHours}h` : "N/A"}
                                </p>
                                <Pencil size={12} className="text-[#AAAAAA]/40" />
                            </div>
                        </div>
                    </button>

                    {/* Eau */}
                    <div className="flex items-center gap-4 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5] group">
                        <Droplets size={18} className="text-[#111111]" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">Eau</p>
                            <select
                                value={factors.waterStatus || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFactors(f => ({ ...f, waterStatus: val }));
                                    localStorage.setItem("dailyCheckinData", JSON.stringify({ ...factors, waterStatus: val }));
                                    localStorage.setItem("lastCheckinDate", new Date().toISOString().split('T')[0]);
                                    setDbCheckinDone(true);
                                    syncFactorToSupabase('water', val);
                                }}
                                className={`text-sm font-bold bg-transparent border-none p-0 focus:outline-none w-full cursor-pointer uppercase mt-1 ${!factors.waterStatus ? 'text-[#AAAAAA]/50' : 'text-[#111111]'}`}
                            >
                                <option value="" disabled className="bg-white">N/A</option>
                                <option value="Pas assez" className="bg-white">🏜️ Pas assez</option>
                                <option value="Suffisamment" className="bg-white">💧 Suffisamment</option>
                                <option value="Trop" className="bg-white">🌊 Trop</option>
                            </select>
                        </div>
                    </div>

                    {/* Alimentation */}
                    <div className="flex items-center gap-4 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5] group">
                        <Salad size={18} className="text-[#111111]" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">Assiette</p>
                            <select
                                value={factors.foodQuality || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFactors(f => ({ ...f, foodQuality: val }));
                                    localStorage.setItem("dailyCheckinData", JSON.stringify({ ...factors, foodQuality: val }));
                                    localStorage.setItem("lastCheckinDate", new Date().toISOString().split('T')[0]);
                                    setDbCheckinDone(true);
                                    syncFactorToSupabase('alimentation', val);
                                }}
                                className={`text-sm font-bold bg-transparent border-none p-0 focus:outline-none w-full cursor-pointer uppercase mt-1 ${!factors.foodQuality ? 'text-[#AAAAAA]/50' : 'text-[#111111]'}`}
                            >
                                <option value="" disabled className="bg-white">N/A</option>
                                <option value="bien" className="bg-white">Saine</option>
                                <option value="moyen" className="bg-white">Moyenne</option>
                                <option value="mauvais" className="bg-white">Lourde</option>
                            </select>
                        </div>
                    </div>

                    {/* Alcool */}
                    <button onClick={() => { setEditingFactor('alcohol'); setEditValue(factors.alcoholDrinks ?? 0); }} className="text-left flex items-center gap-4 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5] group">
                        <Wine size={18} className="text-[#111111]" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">Alcool</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className={`text-sm font-bold uppercase ${factors.alcoholDrinks !== undefined && factors.alcoholDrinks !== null ? 'text-[#111111]' : 'text-[#AAAAAA]/50'}`}>
                                    {factors.alcoholDrinks !== undefined && factors.alcoholDrinks !== null ? (factors.alcoholDrinks > 0 ? `Oui (${factors.alcoholDrinks})` : "Non") : "N/A"}
                                </p>
                                <Pencil size={12} className="text-[#AAAAAA]/40" />
                            </div>
                        </div>
                    </button>

                    {/* Sport */}
                    <div className="flex items-center gap-4 hover:bg-muted/10 p-3 transition-colors border border-[#E5E5E5] group">
                        <Dumbbell size={18} className="text-[#111111]" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">Sport</p>
                            <select
                                value={factors.didSport === undefined || factors.didSport === null ? "" : (factors.didSport ? "Modéré" : "Non")}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const didSport = val !== "Non" && val !== "";
                                    setFactors(f => ({ ...f, didSport }));
                                    localStorage.setItem("dailyCheckinData", JSON.stringify({ ...factors, didSport }));
                                    localStorage.setItem("lastCheckinDate", new Date().toISOString().split('T')[0]);
                                    setDbCheckinDone(true);
                                    syncFactorToSupabase('sport', didSport);
                                }}
                                className={`text-sm font-bold bg-transparent border-none p-0 focus:outline-none w-full cursor-pointer uppercase mt-1 ${(factors.didSport === undefined || factors.didSport === null) ? 'text-[#AAAAAA]/50' : 'text-[#111111]'}`}
                            >
                                <option value="" disabled className="bg-white">N/A</option>
                                {workoutIntensities.map((i) => <option key={i} value={i} className="bg-white">{i}</option>)}
                            </select>
                        </div>
                    </div>

                </div>
            </section>

            <Dialog open={!!editingFactor} onOpenChange={() => setEditingFactor(null)}>
                <DialogContent className="max-w-sm rounded-none border border-[#111111]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold font-display uppercase tracking-[0.05em] text-[#111111]">
                            {editingFactor === 'alcohol' && "Alcool"}
                            {editingFactor === 'sleep' && "Sommeil"}
                            {editingFactor === 'stress' && "Stress"}
                            {editingFactor === 'makeup' && "Nettoyage"}
                            {editingFactor === 'location' && "Localisation"}
                            {editingFactor === 'cycle' && "Cycle"}
                            {editingFactor === 'sport' && "Sport"}
                            {editingFactor === 'alimentation' && "Assiette"}
                            {editingFactor === 'water' && "Eau"}
                            {!['alcohol', 'sleep', 'stress', 'makeup', 'location', 'cycle', 'sport', 'alimentation', 'water'].includes(editingFactor || '') && "Modifier"}
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em] mt-2 italic">
                            {editingFactor === 'alcohol' && "Avez-vous bu de l'alcool ?"}
                            {editingFactor === 'sleep' && "Combien d'heures avez-vous dormi ?"}
                            {editingFactor === 'stress' && "Quel est votre niveau de stress ?"}
                            {editingFactor === 'makeup' && "Démaquillage et nettoyage du visage."}
                            {editingFactor === 'location' && "Ajustez votre ville."}
                            {editingFactor === 'cycle' && "À quelle étape êtes-vous ?"}
                            {editingFactor === 'sport' && "Avez-vous pratiqué une activité ?"}
                            {editingFactor === 'alimentation' && "Évaluez votre alimentation."}
                            {editingFactor === 'water' && "Hydratation du jour."}
                            {!['alcohol', 'sleep', 'stress', 'makeup', 'location', 'cycle', 'sport', 'alimentation', 'water'].includes(editingFactor || '') && "Ajustez vos données."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        {editingFactor === 'location' && (
                            <div className="space-y-4">
                                <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">Ville ou code postal :</p>
                                <Input
                                    value={locationInput}
                                    onChange={(e) => setLocationInput(e.target.value)}
                                    placeholder="Ex: Paris"
                                    className="rounded-none border-[#E5E5E5] focus:border-[#111111] transition-colors"
                                />
                            </div>
                        )}
                        {editingFactor === 'sleep' && (
                            <div className="space-y-4">
                                <label className="text-sm font-bold">Heures de sommeil : {editValue}h</label>
                                <input type="range" min="0" max="15" step="0.5" value={editValue} onChange={(e) => setEditValue(parseFloat(e.target.value))} className="w-full h-2 bg-muted rounded-full appearance-none accent-primary" />
                            </div>
                        )}
                        {editingFactor === 'stress' && (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-2 py-6">
                                    <span className="text-5xl font-bold text-[#111111]">{editValue}</span>
                                    <span className="text-sm font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">{STRESS_LABELS[editValue]}</span>
                                </div>
                                <div className="grid grid-cols-5 gap-3">
                                    {[1, 2, 3, 4, 5].map(v => (
                                        <button key={v} onClick={() => setEditValue(v)} className={`py-5 border text-sm font-bold transition-all ${editValue === v ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white border-[#E5E5E5] text-[#AAAAAA] hover:border-[#111111]'}`}>
                                            {v}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-between px-1">
                                    <span className="text-[10px] text-[#AAAAAA] uppercase font-mono tracking-[0.1em] font-bold">Zen</span>
                                    <span className="text-[10px] text-[#AAAAAA] uppercase font-mono tracking-[0.1em] font-bold">Extrême</span>
                                </div>
                            </div>
                        )}
                        {editingFactor === 'cycle' && (
                            <div className="flex flex-col gap-3">
                                {["Je ne sais pas", "Menstruation", "Folliculaire", "Ovulatoire", "Lutéal", "Aucun", "Autre"].map(v => (
                                    <button key={v} onClick={() => setEditValue(v)} className={`py-4 px-6 rounded-2xl border text-left font-bold transition-all ${editValue === v ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card border-border hover:bg-accent'}`}>
                                        {v}
                                    </button>
                                ))}
                            </div>
                        )}
                        {editingFactor === 'alcohol' && (
                            <div className="space-y-6">
                                <div className="flex gap-2">
                                    <button onClick={() => setEditValue(editValue > 0 ? editValue : 1)} className={`flex-1 py-4 rounded-2xl border font-bold transition-all ${editValue > 0 ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card border-border'}`}>Oui</button>
                                    <button onClick={() => setEditValue(0)} className={`flex-1 py-4 rounded-2xl border font-bold transition-all ${editValue === 0 ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card border-border'}`}>Non</button>
                                </div>
                                {editValue > 0 && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex justify-between items-end">
                                            <label className="text-sm font-bold">Nombre de verres</label>
                                            <span className="text-2xl font-bold text-primary">{editValue}</span>
                                        </div>
                                        <input type="range" min="1" max="10" step="1" value={editValue} onChange={(e) => setEditValue(parseInt(e.target.value))} className="w-full h-2 bg-muted rounded-full appearance-none accent-primary" />
                                    </div>
                                )}
                            </div>
                        )}
                        {editingFactor === 'bpm' && (
                            <div className="space-y-4">
                                <label className="text-sm font-bold">Rythme Cardiaque : {editValue} bpm</label>
                                <input type="range" min="40" max="180" step="1" value={editValue} onChange={(e) => setEditValue(parseInt(e.target.value))} className="w-full h-2 bg-muted rounded-full appearance-none accent-primary" />
                            </div>
                        )}
                        {editingFactor === 'sport' && (
                            <div className="flex gap-2">
                                <button onClick={() => setEditValue(true)} className={`flex-1 py-4 rounded-2xl border ${editValue === true ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card border-border'}`}>Oui</button>
                                <button onClick={() => setEditValue(false)} className={`flex-1 py-4 rounded-2xl border ${editValue === false ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card border-border'}`}>Non</button>
                            </div>
                        )}
                        {editingFactor === 'makeup' && (
                            <div className="space-y-4">
                                {makeupStep === 1 && (
                                    <div className="space-y-4">
                                        <p className="text-sm font-bold">Étiez-vous maquillé(e) aujourd'hui ?</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setWoreMakeup(true); setMakeupStep(2); }} className="flex-1 py-4 rounded-2xl border font-bold transition-all bg-card border-border hover:bg-accent text-foreground">Oui</button>
                                            <button
                                                onClick={() => {
                                                    setWoreMakeup(false);
                                                    setEditValue(true); // Effectively cleaned
                                                    // Immediately save for No Makeup case
                                                    const newFactors = { ...factors, makeupRemoved: true, woreMakeup: false };
                                                    setFactors(newFactors);
                                                    localStorage.setItem("dailyCheckinData", JSON.stringify(newFactors));
                                                    syncFactorToSupabase('makeup', true);
                                                    setEditingFactor(null);
                                                    setMakeupStep(1);
                                                    setWoreMakeup(null);
                                                }}
                                                className="flex-1 py-4 rounded-2xl border font-bold transition-all bg-card border-border hover:bg-accent text-foreground"
                                            >
                                                Non
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {makeupStep === 2 && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                                        <p className="text-sm font-bold">Avez-vous retiré votre maquillage et nettoyé votre visage ce soir ?</p>
                                        <div className="flex flex-col gap-3">
                                            <button onClick={() => setEditValue(true)} className={`py-4 rounded-2xl border text-left px-6 font-bold transition-all ${editValue === true ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card border-border hover:bg-accent focus:bg-primary/5 focus:border-primary'}`}>
                                                Oui, double nettoyage fait
                                            </button>
                                            <button onClick={() => setEditValue(false)} className={`py-4 rounded-2xl border text-left px-6 font-bold transition-all ${editValue === false ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card border-border hover:bg-accent focus:bg-primary/5 focus:border-primary'}`}>
                                                Non, pas fait
                                            </button>
                                        </div>
                                        <button onClick={() => setMakeupStep(1)} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                                            <ArrowLeft size={12} /> Retour
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button onClick={saveEdit} className="w-full bg-[#111111] text-white py-4 font-bold uppercase tracking-[0.1em] hover:bg-black transition-colors">
                        Enregistrer
                    </button>
                </DialogContent>
            </Dialog >

            {/* Profile Edit Dialog */}
            <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
                <DialogContent className="max-w-sm rounded-none border border-[#111111]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold font-display uppercase tracking-[0.05em] text-[#111111]">Profil</DialogTitle>
                        <DialogDescription className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em] mt-2 italic">
                            {editingProfile === 'skin_type' ? "Nature de peau." :
                                editingProfile === 'skin_problems' ? "Préoccupations prioritaires." :
                                    "Objectifs cutanés."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6">
                        {editingProfile === 'skin_type' && (
                            <div className="grid grid-cols-2 gap-2">
                                {SKIN_TYPES.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setEditProfileValue(type)}
                                        className={`p-3 rounded-2xl border transition-all text-sm font-bold ${editProfileValue === type ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card border-border hover:bg-accent'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        )}

                        {(editingProfile === 'skin_problems' || editingProfile === 'skin_goals') && (
                            <div className="flex flex-wrap gap-2 max-h-[40vh] overflow-y-auto p-1">
                                {(editingProfile === 'skin_problems' ? SKIN_CONCERNS : SKIN_GOALS).map(item => (
                                    <button
                                        key={item}
                                        onClick={() => {
                                            const current = editProfileValue || [];
                                            if (current.includes(item)) {
                                                setEditProfileValue(current.filter((c: string) => c !== item));
                                            } else {
                                                setEditProfileValue([...current, item]);
                                            }
                                        }}
                                        className={`px-3 py-2 rounded-full border transition-all text-xs font-bold ${editProfileValue?.includes(item) ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card border-border hover:bg-accent'}`}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 mt-4">
                        <button onClick={saveProfileEdit} className="w-full py-4 bg-[#111111] text-white font-bold uppercase tracking-[0.1em] hover:bg-black transition-colors">Enregistrer</button>
                        <button onClick={() => setEditingProfile(null)} className="w-full py-4 text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] border border-[#E5E5E5] hover:bg-muted/10 transition-colors">Annuler</button>
                    </div>
                </DialogContent>
            </Dialog>


            {/* RGPD Link */}
            <div className="mt-4 text-center">
                <button
                    onClick={() => navigate("/rgpd")}
                    className="text-[11px] text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer uppercase tracking-widest font-bold"
                >
                    Politique de confidentialité & RGPD
                </button>
            </div>
        </div>
    );
};

export default CheckinAdvice;
