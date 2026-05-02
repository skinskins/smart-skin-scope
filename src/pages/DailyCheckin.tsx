import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, HeartPulse, Moon, Droplets, GlassWater, Flame, Check, X, MapPin, Pencil, Thermometer, CloudSun, Sun, Sparkles, Dumbbell, Salad, Waves } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useWeatherData } from "@/hooks/useWeatherData";
import { calculateCyclePhase } from "@/utils/cycle";

export const defaultDailyLog = {
    stressLevel: 3,
    sleepHours: 7.5,
    cyclePhase: "Folliculaire",
    waterGlasses: 6,
    alcoholDrinks: 0,
    workoutMinutes: 0,
    foodQuality: "moyen" as "bien" | "moyen" | "mauvais",
    weather: { temp: 24, humidity: 55, uv: 6, pollution: "..." },
    location: ""
};

import { supabase } from "@/integrations/supabase/client";

const DailyCheckin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isOnboarding = location.state?.isOnboarding;
    const [data, setData] = useState({
        waterStatus: "Suffisamment" as "Pas assez" | "Suffisamment" | "Trop",
        hasAlcohol: false,
        alcoholDrinks: 0,
        sleepHours: 7,
        lastPeriodDate: "" as string,
        cyclePhase: "Folliculaire",
        stressLevel: 3,
        foodQuality: "moyen" as "bien" | "moyen" | "mauvais",
        location: defaultDailyLog.location,
        weather: defaultDailyLog.weather,
        didSport: false,
        sportIntensity: "Légère",
        cycleDuration: 28,
        periodDuration: 5
    });



    const [makeupRemoved, setMakeupRemoved] = useState<boolean | null>(true);
    const [manualLocationState, setManualLocationState] = useState<string | null>(() => localStorage.getItem("manualLocation"));
    const [isEditingLocation, setIsEditingLocation] = useState(false);
    const [locationInput, setLocationInput] = useState("");

    const setManualLocation = (loc: string | null) => {
        setManualLocationState(loc);
        if (loc) localStorage.setItem("manualLocation", loc);
        else localStorage.removeItem("manualLocation");
    };

    const { weather: liveWeather, loading: weatherLoading } = useWeatherData(manualLocationState || undefined);

    useEffect(() => {
        if (!weatherLoading && liveWeather.locationName !== "...") {
            setData((d) => ({ ...d, weather: liveWeather, location: liveWeather.locationName || d.location }));
        }
    }, [liveWeather, weatherLoading]);

    // Check if already checked in today unless it's the first onboarding checkin
    useEffect(() => {
        const lastCheckin = localStorage.getItem("lastCheckinDate");
        const today = new Date().toISOString().split('T')[0];

        if (lastCheckin === today && !isOnboarding) {
            navigate("/dashboard", { replace: true });
        }
    }, [isOnboarding, navigate]);

    const handleSave = async () => {
        // Mapping for backward compatibility or database expectations
        const mappedWaterGlasses = data.waterStatus === "Pas assez" ? 4 : data.waterStatus === "Suffisamment" ? 8 : 12;
        const finalAlcoholDrinks = data.hasAlcohol ? data.alcoholDrinks : 0;

        // Cache local immédiat
        const payload = {
            ...data,
            waterGlasses: mappedWaterGlasses,
            alcoholDrinks: finalAlcoholDrinks,
            makeupRemoved
        };
        localStorage.setItem("dailyCheckinData", JSON.stringify(payload));
        localStorage.setItem("manualUpdates", JSON.stringify({
            stress: Date.now(),
            sleep: Date.now(),
            cycle: Date.now(),
            water: Date.now(),
            alcohol: Date.now(),
            workout: Date.now(),
            food: Date.now()
        }));

        // Envoi au Cloud (Supabase)
        try {
            const guestProfileStr = localStorage.getItem("guestProfile");
            if (guestProfileStr) {
                const guestProfile = JSON.parse(guestProfileStr);
                if (guestProfile.id) {
                    // @ts-ignore
                    await supabase.from("guest_checkins").insert({
                        guest_id: guestProfile.id,
                        sleep_hours: data.sleepHours,
                        water_glasses: mappedWaterGlasses,
                        stress_level: data.stressLevel,
                        cycle_phase: data.cyclePhase,
                        diet_quality: data.foodQuality,
                        location: data.location,
                        weather: data.weather,
                        makeup_removed: makeupRemoved,
                        did_sport: data.didSport,
                        sport_intensity: data.didSport ? data.sportIntensity : null
                    });
                }
            } else {
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData?.session) {
                    await supabase.from("profiles").update({
                        sleep_hours: data.sleepHours,
                        water_glasses: mappedWaterGlasses,
                        alcohol_drinks: finalAlcoholDrinks,
                        cycle_phase: data.cyclePhase,
                        last_period_date: data.lastPeriodDate,
                        cycle_duration: data.cycleDuration,
                        period_duration: data.periodDuration,
                        stress_level: data.stressLevel,

                        food_quality: data.foodQuality,
                        did_sport: data.didSport,
                        sport_intensity: data.didSport ? data.sportIntensity : null
                    }).eq("id", sessionData.session.user.id);
                }
            }

            // Mark as checked in today
            localStorage.setItem("lastCheckinDate", new Date().toISOString().split('T')[0]);
        } catch (e) {
            console.error("Erreur d'enregistrement réseau", e);
        }

        if (location.state?.isOnboarding) {
            navigate("/dashboard", { state: { ...location.state } });
        } else {
            navigate("/dashboard");
        }
    };

    const hour = new Date().getHours();
    const isMorning = hour >= 5 && hour < 16;
    const timeRef = isMorning ? "ces dernières 24 heures" : "votre journée passée";

    return (
        <div className="min-h-screen bg-background flex flex-col relative overflow-hidden pb-36">

            <div className="p-6 relative z-10 flex items-center justify-between bg-transparent">
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => navigate(-1)}
                    className="w-11 h-11 flex items-center justify-center rounded-full border border-border/60 bg-white/50 hover:bg-white transition-colors premium-shadow"
                >
                    <ArrowLeft size={20} strokeWidth={1.5} className="text-foreground" />
                </motion.button>
                {isOnboarding && (
                    <div className="text-[10px] font-bold text-primary bg-primary/5 border border-primary/20 px-4 py-2 rounded-full tracking-widest uppercase">
                        Étape 5 / 5
                    </div>
                )}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col p-6 z-10 max-w-lg mx-auto w-full pt-10"
            >
                <div className="mb-14 text-center">
                    <h1 className="text-4xl font-display text-foreground leading-tight mb-4">Check-in quotidien</h1>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">{timeRef}</p>
                </div>

                <div className="space-y-12 flex-1">

                    {/* Paramètres du lieu (Météo) */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <h2 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                            <MapPin size={14} strokeWidth={1.5} /> Environnement
                        </h2>
                        <div className="premium-card p-8">
                            {!isEditingLocation ? (
                                <button onClick={() => { setIsEditingLocation(true); setLocationInput(data.location || manualLocationState || ""); }} className="text-left w-full focus:outline-none">
                                    <div className="flex items-center gap-5 group">
                                        <div className="w-12 h-12 rounded-2xl bg-muted/20 border border-border flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-white transition-all">
                                            <MapPin size={22} strokeWidth={1.5} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-1.5">Ma position</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-lg font-bold text-foreground">{data.location}</p>
                                                <Pencil size={12} strokeWidth={1.5} className="text-muted-foreground/30" />
                                            </div>
                                        </div>
                                        <span className="ml-auto flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest opacity-80">
                                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                            Direct
                                        </span>
                                    </div>
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Input type="text" value={locationInput} onChange={(e) => setLocationInput(e.target.value)} placeholder="Ville ou Code Postal" className="flex-1" />
                                    <button type="button" onClick={() => { setManualLocation(locationInput); setIsEditingLocation(false); }} className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center premium-shadow">
                                        <Check size={20} />
                                    </button>
                                    <button type="button" onClick={() => setIsEditingLocation(false)} className="bg-muted w-12 h-12 rounded-full flex items-center justify-center text-muted-foreground">
                                        <X size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.section>

                    {/* Démaquillage */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-6">
                        <h2 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                            <Sparkles size={14} strokeWidth={1.5} /> Soin d'hier
                        </h2>
                        <div className="premium-card p-8">
                            <p className="text-sm font-medium text-foreground tracking-tight mb-8">Avez-vous bien retiré votre maquillage (ou bien nettoyé votre peau) hier soir ?</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setMakeupRemoved(true)}
                                    className={`py-5 px-2 rounded-3xl transition-all text-xs font-bold uppercase tracking-widest border ${makeupRemoved === true ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 text-foreground/60 border-transparent hover:bg-muted/20'}`}
                                >
                                    Oui
                                </button>
                                <button
                                    onClick={() => setMakeupRemoved(false)}
                                    className={`py-5 px-2 rounded-3xl transition-all text-xs font-bold uppercase tracking-widest border ${makeupRemoved === false ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 text-foreground/60 border-transparent hover:bg-muted/20'}`}
                                >
                                    Non
                                </button>
                            </div>
                        </div>
                    </motion.section>

                    {/* Stress */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
                        <h2 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                            <HeartPulse size={14} strokeWidth={1.5} /> Niveau de stress
                        </h2>
                        <div className="premium-card p-8">
                            <div className="grid grid-cols-5 gap-2.5 mb-8">
                                {[1, 2, 3, 4, 5].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setData({ ...data, stressLevel: v })}
                                        className={`w-full aspect-square rounded-2xl flex items-center justify-center transition-all text-sm font-bold border ${data.stressLevel === v ? 'bg-primary text-primary-foreground border-primary premium-shadow scale-110' : 'bg-muted/10 border-transparent text-foreground/40'}`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between px-2">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Sereine</span>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Intense</span>
                            </div>
                        </div>
                    </motion.section>

                    {/* Sommeil */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
                        <h2 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                            <Moon size={14} strokeWidth={1.5} /> Sommeil
                        </h2>
                        <div className="premium-card p-8">
                            <div className="flex justify-between items-end mb-8">
                                <label className="text-xs font-medium text-foreground tracking-tight uppercase opacity-60 tracking-widest mb-1.5">Durée</label>
                                <span className="text-4xl font-display text-foreground">{data.sleepHours}<span className="text-lg ml-1 font-sans text-muted-foreground">h</span></span>
                            </div>
                            <div className="px-1">
                                <Slider value={[data.sleepHours]} min={3} max={12} step={0.5} onValueChange={(v) => setData({ ...data, sleepHours: v[0] })} className="py-4" />
                            </div>
                        </div>
                    </motion.section>

                    {/* Cycle */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
                        <h2 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                            <Waves size={14} strokeWidth={1.5} /> Cycle hormonal
                        </h2>
                        <div className="premium-card p-10 space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block px-1">
                                        Date des dernières règles
                                    </label>
                                    <Input 
                                        type="date" 
                                        value={data.lastPeriodDate || ""} 
                                        onChange={(e) => {
                                            const date = e.target.value;
                                            const calc = calculateCyclePhase(date, data.cycleDuration, data.periodDuration);
                                            setData(prev => ({ 
                                                ...prev, 
                                                lastPeriodDate: date,
                                                cyclePhase: calc.phase
                                            }));
                                        }}
                                        className="rounded-2xl h-14 bg-muted/10 border-transparent focus:border-primary/20 transition-all font-mono"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                Durée du cycle
                                            </label>
                                            <span className="text-sm font-bold text-primary">{data.cycleDuration} j</span>
                                        </div>
                                        <Slider 
                                            value={[data.cycleDuration]} 
                                            min={20} 
                                            max={40} 
                                            step={1} 
                                            onValueChange={(v) => {
                                                const dur = v[0];
                                                const calc = calculateCyclePhase(data.lastPeriodDate, dur, data.periodDuration);
                                                setData(prev => ({ ...prev, cycleDuration: dur, cyclePhase: calc.phase }));
                                            }} 
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                Durée des règles
                                            </label>
                                            <span className="text-sm font-bold text-primary">{data.periodDuration} j</span>
                                        </div>
                                        <Slider 
                                            value={[data.periodDuration]} 
                                            min={2} 
                                            max={10} 
                                            step={1} 
                                            onValueChange={(v) => {
                                                const dur = v[0];
                                                const calc = calculateCyclePhase(data.lastPeriodDate, data.cycleDuration, dur);
                                                setData(prev => ({ ...prev, periodDuration: dur, cyclePhase: calc.phase }));
                                            }} 
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    {["Je ne sais pas", "Aucun"].map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => {
                                                setData(prev => ({ 
                                                    ...prev, 
                                                    lastPeriodDate: "",
                                                    cyclePhase: opt
                                                }));
                                            }}
                                            className={`flex-1 py-4 rounded-3xl border text-[10px] font-bold uppercase tracking-widest transition-all ${data.cyclePhase === opt ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60'}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 rounded-[32px] bg-primary/5 border border-primary/10 transition-all">
                                {(() => {
                                    const calc = calculateCyclePhase(data.lastPeriodDate, data.cycleDuration, data.periodDuration);
                                    if (calc.message) {
                                        return <p className="text-[11px] font-bold text-primary/60 uppercase tracking-widest text-center italic">{calc.message}</p>;
                                    }
                                    return (
                                        <div className="text-center space-y-3">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Phase Actuelle</p>
                                            <p className="text-4xl font-display text-primary leading-none">{calc.phase}</p>
                                            <div className="flex items-center justify-center gap-2 pt-2">
                                                <div className="h-1 flex-1 bg-primary/10 rounded-full overflow-hidden max-w-[100px]">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(calc.day || 1) / data.cycleDuration * 100}%` }}
                                                        className="h-full bg-primary"
                                                    />
                                                </div>
                                                <p className="text-[11px] font-bold text-primary/40 uppercase tracking-widest italic whitespace-nowrap">Jour {calc.day} / {data.cycleDuration}</p>
                                            </div>
                                        </div>
                                    );
                                })()}

                            </div>
                        </div>
                    </motion.section>

                    {/* Alimentation & Alcool */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-6">
                        <h2 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                            <Salad size={14} strokeWidth={1.5} /> Nutrition
                        </h2>
                        <div className="premium-card p-8 space-y-12">
                            <div>
                                <p className="text-xs font-medium text-foreground tracking-tight uppercase opacity-60 tracking-widest mb-8">Équilibre alimentaire</p>
                                <div className="flex gap-3">
                                    {[{ v: "bien", l: "Saine" }, { v: "moyen", l: "Équilibrée" }, { v: "mauvais", l: "Riche" }].map(t => (
                                        <button
                                            key={t.v}
                                            onClick={() => setData({ ...data, foodQuality: t.v as any })}
                                            className={`flex-1 py-5 px-2 rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest border ${data.foodQuality === t.v ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 text-foreground/60 border-transparent hover:bg-muted/20'}`}
                                        >
                                            {t.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-10 border-t border-border/40">
                                <p className="text-xs font-medium text-foreground tracking-tight uppercase opacity-60 tracking-widest mb-8">Consommation d'alcool</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setData({ ...data, hasAlcohol: true })}
                                        className={`py-5 px-2 rounded-2xl transition-all text-xs font-bold uppercase tracking-widest border ${data.hasAlcohol === true ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 text-foreground/60 border-transparent hover:bg-muted/20'}`}
                                    >
                                        Oui
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setData({ ...data, hasAlcohol: false })}
                                        className={`py-5 px-2 rounded-2xl transition-all text-xs font-bold uppercase tracking-widest border ${data.hasAlcohol === false ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 text-foreground/60 border-transparent hover:bg-muted/20'}`}
                                    >
                                        Non
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {data.hasAlcohol && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-12 overflow-hidden">
                                            <div className="flex justify-between items-end mb-8">
                                                <label className="text-xs font-medium text-foreground tracking-tight uppercase opacity-60 tracking-widest mb-1.5">Unités</label>
                                                <span className="text-4xl font-display text-foreground">{data.alcoholDrinks}</span>
                                            </div>
                                            <div className="px-1">
                                                <Slider value={[data.alcoholDrinks]} min={1} max={10} step={1} onValueChange={(v) => setData({ ...data, alcoholDrinks: v[0] })} className="py-4" />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.section>

                    {/* Hydratation */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-6">
                        <h2 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                            <Droplets size={14} strokeWidth={1.5} /> Hydratation
                        </h2>
                        <div className="premium-card p-8">
                            <p className="text-xs font-medium text-foreground tracking-tight uppercase opacity-60 tracking-widest mb-8">Apports hydriques</p>
                            <div className="flex flex-col gap-3">
                                {["Pas assez", "Suffisamment", "Trop"].map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setData({ ...data, waterStatus: opt as any })}
                                        className={`py-6 px-8 rounded-3xl transition-all text-xs font-bold uppercase tracking-widest text-left flex justify-between items-center border ${data.waterStatus === opt ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 text-foreground/60 border-transparent hover:bg-muted/20'}`}
                                    >
                                        <span>{opt}</span>
                                        {data.waterStatus === opt && <Check size={18} strokeWidth={2.5} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.section>

                    {/* Sport */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-6">
                        <h2 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                            <Dumbbell size={14} strokeWidth={1.5} /> Activité physique
                        </h2>
                        <div className="premium-card p-8">
                            <p className="text-xs font-medium text-foreground tracking-tight uppercase opacity-60 tracking-widest mb-8">Séance terminée</p>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <button
                                    onClick={() => setData({ ...data, didSport: true })}
                                    className={`py-5 px-2 rounded-2xl transition-all text-xs font-bold uppercase tracking-widest border ${data.didSport === true ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 text-foreground/60 border-transparent hover:bg-muted/20'}`}
                                >
                                    Oui
                                </button>
                                <button
                                    onClick={() => setData({ ...data, didSport: false })}
                                    className={`py-5 px-2 rounded-2xl transition-all text-xs font-bold uppercase tracking-widest border ${data.didSport === false ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 text-foreground/60 border-transparent hover:bg-muted/20'}`}
                                >
                                    Non
                                </button>
                            </div>
                            {data.didSport && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-10 border-t border-border/40 overflow-hidden">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6 opacity-60">Intensité</p>
                                    <div className="flex gap-3">
                                        {["Légère", "Modérée", "Intense"].map(lvl => (
                                            <button
                                                key={lvl}
                                                onClick={() => setData({ ...data, sportIntensity: lvl })}
                                                className={`flex-1 py-5 rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest border ${data.sportIntensity === lvl ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/10 border-transparent text-foreground/60 hover:bg-muted/20'}`}
                                            >
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.section>

                </div>
            </motion.div>

            {/* Footer Fixed */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-lg z-20">
                <button
                    onClick={handleSave}
                    className="w-full h-16 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98]"
                >
                    Valider mon check-in <ArrowRight size={20} strokeWidth={1.5} />
                </button>
            </div>

        </div>
    );
};

export default DailyCheckin;
