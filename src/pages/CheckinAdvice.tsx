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
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useWeatherData } from "@/hooks/useWeatherData";
import { toast } from "sonner";
import StravaConnect from "./StravaConnect";
import { classifyStravaIntensity } from "@/data/stravaIntensity";
import axios from "axios";
import { calculateCyclePhase } from "@/utils/cycle";

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
const FOOD_QUALITIES = ["Équilibrée", "Grasses / Sucrée", "Légère", "Épicée"];
const WATER_STATUSES = ["Pas assez", "Suffisamment", "Trop"];

const SKIN_TYPES = ["Sèche", "Grasse", "Mixte", "Normale", "Sensible", "Acnéique"];
const SKIN_CONCERNS = ["Acné", "Rougeurs", "Taches brunes", "Points noirs", "Déshydratation", "Rides fixes", "Cernes / Poches", "Eczéma", "Rosacée", "Sensibilité extrême"];
const SKIN_GOALS = ["Hydratation", "Anti-âge", "Éclat / Glow", "Anti-imperfections", "Apaiser", "Réduire les taches", "Resserrer les pores", "Anti-cernes"];

const CheckinAdvice = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isOnboarding = location.state?.isOnboarding;
    const firstName = location.state?.firstName || "";

    const [isSuccessStep, setIsSuccessStep] = useState(isOnboarding);
    const [isStravaLoading, setIsStravaLoading] = useState(false);

    // Factors state
    const [factors, setFactors] = useState(() => {
        const saved = localStorage.getItem("dailyCheckinData");
        const factors = saved ? JSON.parse(saved) : {};
        const manualLocSnippet = localStorage.getItem("manualLocation") || "Paris";
        if (!factors.cycleDuration) factors.cycleDuration = 28;
        if (!factors.periodDuration) factors.periodDuration = 5;
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
    const [selectedAdvice, setSelectedAdvice] = useState<AdviceItem | null>(null);


    const currentHour = new Date().getHours();
    const greeting = (currentHour >= 5 && currentHour < 16) ? "Bonjour" : "Bonsoir";

    const isAllFactorsDone = useMemo(() => {
        const required = ['sleepHours', 'stressLevel', 'waterStatus', 'alcoholDrinks', 'cyclePhase', 'didSport', 'makeupRemoved', 'foodQuality'];
        return required.every(key => {
            const val = factors[key];
            return val !== undefined && val !== null && val !== "" && val !== "N/A";
        });
    }, [factors]);

    const isCheckinDoneToday = isAllFactorsDone;

    const syncFactorToSupabase = async (key: string, value: any) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const todayStr = new Date().toISOString().split('T')[0];
        const updates: any = { last_checkin_date: todayStr };

        if (key === 'sleep') updates.sleep_hours = value;
        if (key === 'stress') updates.stress_level = value;
        if (key === 'water') updates.water_glasses = value === "Trop" ? 12 : (value === "Suffisamment" ? 8 : 4);
        if (key === 'alcohol') updates.alcohol_drinks = value;
        if (key === 'cycle') {
            updates.cycle_phase = typeof value === 'string' ? value : value.phase;
            if (typeof value === 'object' && value.date) updates.last_period_date = value.date;
            else if (factors.lastPeriodDate) updates.last_period_date = factors.lastPeriodDate;
            
            updates.cycle_duration = value.cycleDuration ?? factors.cycleDuration;
            updates.period_duration = value.periodDuration ?? factors.periodDuration;
        }

        if (key === 'sport') updates.did_sport = value;
        if (key === 'makeup') updates.makeup_removed = value;
        if (key === 'alimentation') updates.food_quality = value;
        if (key === 'bpm') updates.bpm = value;
        if (key === 'location') {
            updates.manual_location = value;
            localStorage.setItem("manualLocation", value);
            setManualLocationState(value);
        }

        await (supabase as any).from("profiles").update(updates).eq("id", session.user.id);
    };

    const [manualLocation, setManualLocationState] = useState<string>(() => localStorage.getItem("manualLocation") || "Paris");
    const { weather: liveWeather, loading: weatherLoading } = useWeatherData(manualLocation || undefined);

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
            stressLevel: (factors.stressLevel ?? 1) * 2,
            alcoholLastNight: factors.alcoholDrinks ?? 0,
            makeupRemoved: factors.makeupRemoved ?? true,
            didSportToday: factors.didSport === true || (typeof factors.didSport === 'string' && factors.didSport !== "Non"),
            cycleDay: calculateCyclePhase(factors.lastPeriodDate, factors.cycleDuration, factors.periodDuration).day
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
    }, [factors, guest, isCheckinDoneToday]);

    useEffect(() => {
        const fetchCheckinStatus = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await (supabase as any).from('profiles').select('*').eq('id', session.user.id).single();
                if (profile) {
                    const profileData = profile as any;
                    setGuest(profileData);
                    if (profileData.manual_location) {
                        setManualLocationState(profileData.manual_location);
                        localStorage.setItem("manualLocation", profileData.manual_location);
                    }
                    const todayStr = new Date().toISOString().split('T')[0];
                    if (profileData.last_checkin_date === todayStr) {
                        setDbCheckinDone(true);
                        setFactors((f: any) => ({
                            ...f,
                            sleepHours: profileData.sleep_hours,
                            stressLevel: profileData.stress_level,
                            waterStatus: profileData.water_glasses === 12 ? "Trop" : (profileData.water_glasses === 8 ? "Suffisamment" : "Pas assez"),
                            alcoholDrinks: profileData.alcohol_drinks,
                            cyclePhase: profileData.cycle_phase,
                            didSport: profileData.did_sport,
                            makeupRemoved: profileData.makeup_removed,
                            foodQuality: profileData.food_quality,
                            cycleDuration: profileData.cycle_duration ?? 28,
                            periodDuration: profileData.period_duration ?? 5,
                            location: profileData.manual_location || f.location,
                        }));

                    }
                }
            }
        };
        fetchCheckinStatus();
    }, []);

    const saveEdit = async () => {
        if (!editingFactor) return;
        let newFactors = { ...factors };
        let syncValue = editValue;
        if (editingFactor === 'location') { syncValue = locationInput; newFactors.location = locationInput; }
        else if (editingFactor === 'sleep') newFactors.sleepHours = editValue;
        else if (editingFactor === 'stress') newFactors.stressLevel = editValue;
        else if (editingFactor === 'water') newFactors.waterStatus = editValue;
        else if (editingFactor === 'alcohol') newFactors.alcoholDrinks = editValue;
        else if (editingFactor === 'sport') newFactors.didSport = editValue;
        else if (editingFactor === 'cycle') {
            if (typeof editValue === 'object' && editValue !== null) {
                newFactors.cyclePhase = editValue.phase;
                newFactors.cycleDuration = editValue.cycleDuration;
                newFactors.periodDuration = editValue.periodDuration;
            } else {
                newFactors.cyclePhase = editValue;
            }
        }
        else if (editingFactor === 'makeup') { newFactors.makeupRemoved = editValue; newFactors.woreMakeup = woreMakeup; }
        else if (editingFactor === 'alimentation') newFactors.foodQuality = editValue;

        setFactors(newFactors);
        localStorage.setItem("dailyCheckinData", JSON.stringify(newFactors));
        syncFactorToSupabase(editingFactor, syncValue);
        setEditingFactor(null);
    };

    const saveProfileEdit = async () => {
        if (!editingProfile) return;
        const updates: any = {};
        if (editingProfile === 'skin_type') updates.skin_type = editProfileValue;
        if (editingProfile === 'skin_problems') updates.skin_problems = editProfileValue;
        if (editingProfile === 'skin_goals') updates.skin_goals = editProfileValue;
        setGuest((prev: any) => ({ ...prev, ...updates }));
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
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card p-8 z-10 flex flex-col items-center text-center max-w-sm w-full rounded-[40px] premium-shadow">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 size={40} className="text-primary" />
                    </div>
                    <h2 className="text-2xl font-display text-foreground mb-2">Votre profil est prêt</h2>
                    <p className="text-muted-foreground text-sm italic">Bienvenue sur Nacre</p>
                    <div className="mt-8 relative w-full h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.2 }} className="absolute bg-primary h-full" />
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-6 pb-40 max-w-lg mx-auto overflow-x-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Identity Header */}
            <section className="mb-14 pt-8">
                <div className="premium-card p-10 relative overflow-hidden text-center">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-primary/20 rounded-full mt-4" />
                    <div className="mb-8">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-3">{greeting}</p>
                        <h2 className="text-4xl font-display text-foreground leading-tight">{guest.first_name || firstName || "Prénom"}</h2>
                    </div>
                    <div className="flex justify-center gap-12 pt-8 border-t border-border/40">
                        <div className="text-center group cursor-pointer" onClick={() => { setEditingProfile('skin_type'); setEditProfileValue(guest.skin_type); }}>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-50">Ma peau</p>
                            <p className="text-sm font-bold text-foreground hover:text-primary transition-colors">{guest.skin_type || "Pure"}</p>
                        </div>
                        <div className="text-center group cursor-pointer" onClick={() => { setEditingProfile('skin_problems'); setEditProfileValue(guest.skin_problems); }}>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-50">Sensibilité</p>
                            <p className="text-sm font-bold text-foreground hover:text-primary transition-colors">{guest.skin_problems?.[0] || "Saine"}</p>
                        </div>
                    </div>
                    <button onClick={async () => { await supabase.auth.signOut(); navigate("/onboarding"); }} className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted/10 text-muted-foreground transition-all"><LogOut size={14} strokeWidth={1.5} /></button>
                </div>
            </section>

            {/* Advice Section */}
            <section className="mb-14 relative z-10">
                <div className="flex items-center justify-between mb-8 px-1">
                    <h2 className="text-xl font-display text-foreground leading-tight">Conseils du jour</h2>
                    <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest italic decoration-primary/20 decoration-2 underline underline-offset-8">Bio-Analyse</span>
                </div>
                <div className="space-y-6">
                    {!isCheckinDoneToday && (
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="premium-card p-10 bg-white/60 flex flex-col items-center gap-6 text-center border-primary/10">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Sparkles size={28} strokeWidth={1.5} /></div>
                            <div className="space-y-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary italic opacity-80">Check-in requis</p>
                                <p className="text-[13px] text-foreground leading-relaxed italic">Complétez vos facteurs de vie pour débloquer vos protocoles de soin personnalisés.</p>
                                <button onClick={() => document.getElementById('lifestyle-factors')?.scrollIntoView({ behavior: 'smooth' })} className="mt-6 h-12 px-8 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest rounded-full hover:opacity-90 transition-all premium-shadow flex items-center gap-2 mx-auto">Commencer <ChevronRight size={14} strokeWidth={2.5} /></button>
                            </div>
                        </motion.div>
                    )}
                    <AnimatePresence mode="popLayout">
                        {adviceList.map((advice, idx) => (
                            <motion.div key={advice.title} 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.95 }} 
                                transition={{ delay: idx * 0.1 }} 
                                onClick={() => setSelectedAdvice(advice)}
                                className="premium-card p-8 bg-white/60 hover:bg-white transition-all group overflow-hidden cursor-pointer active:scale-[0.98]"
                            >
                                <div className="flex gap-6">
                                    <div className="text-4xl flex-shrink-0 group-hover:scale-110 transition-transform duration-500">{advice.iconStr}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-display text-xl text-foreground italic">{advice.title}</h3>
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                                        </div>
                                        <p className="text-[13px] text-foreground/80 leading-relaxed italic line-clamp-2">{advice.text}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </section>


            {/* Environment Grid */}
            <section className="mb-20">
                <h2 className="text-lg font-display text-foreground mb-8 text-center">Analyses environnantes</h2>
                <div className="premium-card p-10">
                    <button onClick={() => { setEditingFactor('location'); setEditValue(factors.location || "Paris"); setLocationInput(factors.location || "Paris"); }} className="text-left w-full group mb-10 pb-10 border-b border-border/40">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-full border border-border/60 bg-muted/20 flex items-center justify-center text-primary group-hover:bg-white transition-all"><MapPin size={22} strokeWidth={1.5} /></div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Position actuelle</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-xl font-bold text-foreground">{factors.location || "Paris"}</p>
                                    <Pencil size={12} strokeWidth={1.5} className="text-muted-foreground/30" />
                                </div>
                            </div>
                            <span className="ml-auto flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest"><span className="w-2 h-2 bg-primary rounded-full animate-pulse" />Live</span>
                        </div>
                    </button>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-10 px-4">
                        {[
                            { id: "temp", icon: <Thermometer size={16} />, val: `${factors.weather?.temp ?? 20}°C`, sub: "Température" },
                            { id: "humidity", icon: <Droplets size={16} />, val: `${factors.weather?.humidity ?? 50}%`, sub: "Humidité" },
                            { id: "uv", icon: <Sun size={16} />, val: factors.weather?.uv ?? 0, sub: "Index UV" },
                            { id: "air", icon: <CloudSun size={16} />, val: factors.weather?.pollution ?? "Bon", sub: "Qualité Air" }
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
                </div>
            </section>

            {/* Lifestyle Factors */}
            <section id="lifestyle-factors" className="mb-20">
                <div className="flex flex-col items-center mb-10">
                    <h2 className="text-lg font-display text-foreground mb-4">Suivi biologique</h2>
                    {isCheckinDoneToday && (
                        <div className="flex items-center gap-2.5 px-5 py-2 bg-primary/5 border border-primary/20 rounded-full">
                            <CheckCircle2 size={14} strokeWidth={2.5} className="text-primary" /><span className="text-[9px] font-bold text-primary uppercase tracking-widest">Profil à jour</span>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('cycle'); setEditValue(factors.cyclePhase || "Aucun"); }}>
                        <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Calendar size={18} strokeWidth={1.5} /></div><Pencil size={10} strokeWidth={1.5} className="text-muted-foreground/30 group-hover:text-primary transition-colors" /></div>
                        <div><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Cycle</p><p className="text-sm font-bold text-foreground">{factors.cyclePhase || "N/A"}</p></div>
                    </div>
                    <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('stress'); setEditValue(factors.stressLevel ?? 3); }}>
                        <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Heart size={18} strokeWidth={1.5} /></div><Pencil size={10} strokeWidth={1.5} className="text-muted-foreground/30 group-hover:text-primary transition-colors" /></div>
                        <div><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Stress</p><p className="text-sm font-bold text-foreground">{factors.stressLevel !== undefined ? `${factors.stressLevel}/5` : "N/A"}</p></div>
                    </div>
                    <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('makeup'); setEditValue(factors.makeupRemoved ?? false); setMakeupStep(1); }}>
                        <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Sparkles size={18} strokeWidth={1.5} /></div><Pencil size={10} strokeWidth={1.5} className="text-muted-foreground/30 group-hover:text-primary transition-colors" /></div>
                        <div><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Peau</p><p className="text-sm font-bold text-foreground">{factors.makeupRemoved !== undefined ? (factors.makeupRemoved ? "Nette" : "Maquillée") : "N/A"}</p></div>
                    </div>
                    <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('alcohol'); setEditValue(factors.alcoholDrinks ?? 0); }}>
                        <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Wine size={18} strokeWidth={1.5} /></div><Pencil size={10} strokeWidth={1.5} className="text-muted-foreground/30 group-hover:text-primary transition-colors" /></div>
                        <div><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Alcool</p><p className="text-sm font-bold text-foreground">{factors.alcoholDrinks > 0 ? `${factors.alcoholDrinks} u.` : "Aucun"}</p></div>
                    </div>
                    <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('sleep'); setEditValue(factors.sleepHours ?? 8); }}>
                        <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Moon size={18} strokeWidth={1.5} /></div><Pencil size={10} strokeWidth={1.5} className="text-muted-foreground/30 group-hover:text-primary transition-colors" /></div>
                        <div><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Sommeil</p><p className="text-sm font-bold text-foreground">{factors.sleepHours ? `${factors.sleepHours}h` : "N/A"}</p></div>
                    </div>
                    <div className="premium-card p-6 flex flex-col gap-5 group cursor-pointer relative" onClick={() => { setEditingFactor('sport'); setEditValue(factors.didSport || "Non"); }}>
                        <div className="flex justify-between items-start"><div className="w-10 h-10 rounded-2xl bg-muted/10 flex items-center justify-center text-primary group-hover:bg-white transition-all"><Dumbbell size={18} strokeWidth={1.5} /></div><Pencil size={10} strokeWidth={1.5} className="text-muted-foreground/30 group-hover:text-primary transition-colors" /></div>
                        <div><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-50">Activité</p><p className="text-sm font-bold text-foreground">{factors.didSport || "Non"}</p></div>
                    </div>
                </div>
            </section>

            <Dialog open={!!editingFactor} onOpenChange={() => setEditingFactor(null)}>
                <DialogContent className="max-w-sm rounded-[40px] border border-border/40 bg-background premium-shadow">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-display text-foreground">{editingFactor?.toUpperCase()}</DialogTitle>
                    </DialogHeader>
                    <div className="py-6">
                        {editingFactor === 'location' && (<div className="space-y-4"><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ville :</label><Input value={locationInput} onChange={(e) => setLocationInput(e.target.value)} placeholder="Ex: Paris" className="flex-1 rounded-full" /></div>)}
                        {editingFactor === 'sleep' && (<div className="space-y-6"><div className="flex justify-between items-end mb-4"><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Durée</label><span className="text-4xl font-display text-foreground">{editValue}h</span></div><div className="px-1"><Slider value={[editValue]} min={0} max={15} step={0.5} onValueChange={(v) => setEditValue(v[0])} /></div></div>)}
                        {editingFactor === 'stress' && (<div className="space-y-8"><div className="flex flex-col items-center gap-2 py-4"><span className="text-5xl font-display text-primary">{editValue}</span><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 italic">{STRESS_LABELS[editValue]}</span></div><div className="flex justify-between gap-1">{[1, 2, 3, 4, 5].map(v => (<button key={v} onClick={() => setEditValue(v)} className={`w-12 h-12 rounded-full border text-sm font-bold transition-all ${editValue === v ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-background border-border text-muted-foreground'}`}>{v}</button>))}</div></div>)}
                        {editingFactor === 'cycle' && (
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block px-1">
                                            Date des dernières règles
                                        </label>
                                        <Input 
                                            type="date" 
                                            value={factors.lastPeriodDate || ""} 
                                            onChange={(e) => {
                                                const date = e.target.value;
                                                const calc = calculateCyclePhase(date, factors.cycleDuration, factors.periodDuration);
                                                setFactors(prev => ({ 
                                                    ...prev, 
                                                    lastPeriodDate: date,
                                                    cyclePhase: calc.phase
                                                }));
                                                setEditValue(calc.phase);
                                            }}
                                            className="rounded-2xl h-14 bg-muted/10 border-transparent focus:border-primary/20 transition-all font-mono"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Cycle</label>
                                                <span className="text-[11px] font-bold text-primary">{factors.cycleDuration}j</span>
                                            </div>
                                            <Slider 
                                                value={[factors.cycleDuration || 28]} 
                                                min={20} 
                                                max={40} 
                                                step={1} 
                                                onValueChange={(v) => {
                                                    const dur = v[0];
                                                    const calc = calculateCyclePhase(factors.lastPeriodDate, dur, factors.periodDuration);
                                                    setFactors(prev => ({ ...prev, cycleDuration: dur, cyclePhase: calc.phase }));
                                                    setEditValue({ phase: calc.phase, cycleDuration: dur, periodDuration: factors.periodDuration });
                                                }} 
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Règles</label>
                                                <span className="text-[11px] font-bold text-primary">{factors.periodDuration}j</span>
                                            </div>
                                            <Slider 
                                                value={[factors.periodDuration || 5]} 
                                                min={2} 
                                                max={10} 
                                                step={1} 
                                                onValueChange={(v) => {
                                                    const dur = v[0];
                                                    const calc = calculateCyclePhase(factors.lastPeriodDate, factors.cycleDuration, dur);
                                                    setFactors(prev => ({ ...prev, periodDuration: dur, cyclePhase: calc.phase }));
                                                    setEditValue({ phase: calc.phase, cycleDuration: factors.cycleDuration, periodDuration: dur });
                                                }} 
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2">

                                        {["Je ne sais pas", "Aucun"].map((opt) => (
                                            <button
                                                key={opt}
                                                onClick={() => {
                                                    setFactors(prev => ({ 
                                                        ...prev, 
                                                        lastPeriodDate: "",
                                                        cyclePhase: opt
                                                    }));
                                                    setEditValue(opt);
                                                }}
                                                className={`flex-1 py-3 h-12 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${factors.cyclePhase === opt ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="premium-card p-6 bg-primary/5 border-primary/10">
                                    {(() => {
                                        const calc = calculateCyclePhase(factors.lastPeriodDate, factors.cycleDuration, factors.periodDuration);
                                        if (calc.message) {
                                            return <p className="text-[11px] font-bold text-primary/60 uppercase tracking-widest text-center italic">{calc.message}</p>;
                                        }
                                        return (
                                            <div className="text-center space-y-2">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Phase Actuelle</p>
                                                <p className="text-2xl font-display text-primary">{calc.phase}</p>
                                                <p className="text-[11px] font-bold text-primary/40 uppercase tracking-widest italic">Jour {calc.day} sur {factors.cycleDuration}</p>
                                            </div>
                                        );

                                    })()}
                                </div>
                            </div>
                        )}
                        {editingFactor === 'alcohol' && (<div className="space-y-8"><div className="grid grid-cols-2 gap-4"><button onClick={() => setEditValue(editValue > 0 ? editValue : 1)} className={`py-4 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${editValue > 0 ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}>Oui</button><button onClick={() => setEditValue(0)} className={`py-4 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${editValue === 0 ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}>Non</button></div>{editValue > 0 && (<div className="space-y-6"><div className="flex justify-between items-end"><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60">Quantité</label><span className="text-3xl font-display text-foreground">{editValue}</span></div><div className="px-1"><Slider value={[editValue]} min={1} max={10} step={1} onValueChange={(v) => setEditValue(v[0])} /></div></div>)}</div>)}
                        {editingFactor === 'sport' && (<div className="grid grid-cols-2 gap-3">{workoutIntensities.map((i) => (<button key={i} onClick={() => setEditValue(i)} className={`py-4 border rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${editValue === i ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}>{i}</button>))}</div>)}
                        {editingFactor === 'makeup' && (<div className="space-y-6">{makeupStep === 1 ? (<div className="space-y-8"><p className="text-sm font-medium text-foreground tracking-tight italic text-center">Étiez-vous maquillé(e) ?</p><div className="grid grid-cols-2 gap-4"><button onClick={() => setMakeupStep(2)} className="py-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all bg-muted/10 border-transparent text-foreground/60">Oui</button><button onClick={() => { setEditValue(true); saveEdit(); }} className="py-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all bg-muted/10 border-transparent text-foreground/60">Non</button></div></div>) : (<div className="space-y-8"><p className="text-sm font-medium text-foreground tracking-tight italic text-center">Nettoyé ce soir ?</p><div className="flex flex-col gap-3"><button onClick={() => setEditValue(true)} className={`py-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${editValue === true ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}>Oui, complet</button><button onClick={() => setEditValue(false)} className={`py-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${editValue === false ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}>Non</button></div><button onClick={() => setMakeupStep(1)} className="w-full text-[9px] font-bold text-muted-foreground uppercase text-center mt-4">Retour</button></div>)}</div>)}
                    </div>
                    <button onClick={saveEdit} className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow">Enregistrer</button>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
                <DialogContent className="max-w-sm rounded-[40px] border border-border/40 bg-background premium-shadow">
                    <DialogHeader><DialogTitle className="text-xl font-display text-foreground">Profil</DialogTitle></DialogHeader>
                    <div className="py-6">
                        {editingProfile === 'skin_type' && (<div className="grid grid-cols-2 gap-3">{SKIN_TYPES.map(type => (<button key={type} onClick={() => setEditProfileValue(type)} className={`p-4 rounded-2xl border transition-all text-[10px] font-bold uppercase tracking-widest ${editProfileValue === type ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}>{type}</button>))}</div>)}
                        {(editingProfile === 'skin_problems' || editingProfile === 'skin_goals') && (<div className="flex flex-wrap gap-2 max-h-[40vh] overflow-y-auto pr-2">{(editingProfile === 'skin_problems' ? SKIN_CONCERNS : SKIN_GOALS).map(item => (<button key={item} onClick={() => { const current = editProfileValue || []; if (current.includes(item)) setEditProfileValue(current.filter((c: string) => c !== item)); else setEditProfileValue([...current, item]); }} className={`px-4 py-3 rounded-full border transition-all text-[10px] font-bold uppercase tracking-widest ${editProfileValue?.includes(item) ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}>{item}</button>))}</div>)}
                    </div>
                    <div className="flex flex-col gap-3 mt-4">
                        <button onClick={saveProfileEdit} className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow">Enregistrer</button>
                        <button onClick={() => setEditingProfile(null)} className="w-full h-12 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Annuler</button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="mt-8 text-center"><button onClick={() => navigate("/rgpd")} className="text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer uppercase tracking-widest font-bold">Politique de confidentialité & RGPD</button></div>

            {/* Modale de conseil détaillé */}
            <Dialog open={!!selectedAdvice} onOpenChange={() => setSelectedAdvice(null)}>
                <DialogContent className="max-w-sm rounded-[40px] border-none bg-background premium-shadow p-10">
                    <DialogHeader className="mb-8">
                        <div className="text-5xl mb-6">{selectedAdvice?.iconStr}</div>
                        <DialogTitle className="text-2xl font-display text-foreground italic">{selectedAdvice?.title}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-8">
                        <p className="text-sm text-foreground/80 leading-relaxed italic">{selectedAdvice?.text}</p>
                        
                        {selectedAdvice?.ingredients && selectedAdvice.ingredients.length > 0 && (
                            <div className="space-y-4">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Ingrédients cibles</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedAdvice.ingredients.map(ing => (
                                        <span key={ing} className="px-4 py-2 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full border border-primary/10 italic">{ing}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedAdvice?.tip && (
                            <div className="flex gap-4 p-6 bg-primary/5 rounded-[32px] border border-primary/10">
                                <div className="bg-white rounded-full p-2 text-primary shadow-sm h-fit"><Info size={14} strokeWidth={2.5} /></div>
                                <p className="text-[11px] font-bold text-primary/80 leading-relaxed uppercase tracking-widest italic">{selectedAdvice.tip}</p>
                            </div>
                        )}

                        <button 
                            onClick={() => setSelectedAdvice(null)}
                            className="w-full h-16 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all mt-6"
                        >
                            Compris
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default CheckinAdvice;
